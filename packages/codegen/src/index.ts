// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { ModuleRegistry } from './module-registry.js';
import { MoveModuleBuilder } from './move-module-builder.js';
import { existsSync, statSync } from 'node:fs';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { getUtilsContent } from './generate-utils.js';
import { parse } from 'toml';
import { FileBuilder } from './file-builder.js';
import { parseConfigArguments } from './config-arguments.js';
import type { ParsedConfigArgument } from './config-arguments.js';
import { camelCase, capitalize, parseTS } from './utils.js';
import type { RootPackageMetadata } from './types/summary.js';
import type {
	ConfigArguments,
	ErrorClassConfig,
	FunctionsOption,
	GenerateBase,
	ImportExtension,
	PackageConfig,
	PackageGenerate,
	TypesOption,
} from './config.js';
export {
	type SuiCodegenConfig,
	type ConfigArguments,
	type ConfigArgumentMatcher,
} from './config.js';

export async function generateFromPackageSummary({
	package: pkg,
	prune,
	outputDir,
	globalGenerate,
	importExtension = '.js',
	includePhantomTypeParameters = false,
	errorClass,
	configArguments: globalConfigArguments,
	packageAddresses,
}: {
	package: PackageConfig;
	prune: boolean;
	outputDir: string;
	globalGenerate?: GenerateBase;
	importExtension?: ImportExtension;
	includePhantomTypeParameters?: boolean;
	errorClass?: ErrorClassConfig;
	configArguments?: ConfigArguments;
	/**
	 * Resolved root addresses of the other packages in the codegen run, keyed by their `packages`
	 * identifier, so `configArguments` matchers can reference them (see
	 * `resolvePackageRootAddress`). The CLI builds this automatically.
	 */
	packageAddresses?: Record<string, string>;
}) {
	if (!pkg.path) {
		throw new Error(`Package path is required (got ${pkg.package})`);
	}

	// Check for on-chain package summary (directly in path) or local package summary (in package_summaries subdirectory)
	const localSummaryDir = join(pkg.path, 'package_summaries');
	const isOnChainPackage = existsSync(join(pkg.path, 'root_package_metadata.json'));
	const summaryDir = isOnChainPackage ? pkg.path : localSummaryDir;

	if (!existsSync(summaryDir) || !existsSync(join(summaryDir, 'address_mapping.json'))) {
		throw new Error(`Package summary directory not found: ${summaryDir}`);
	}

	let packageName = pkg.packageName!;
	let rootPackageId: string | undefined;
	let localAddressLabels: string[] = [];
	const mvrNameOrAddress = pkg.package;

	const typeOriginsByPkgAndModule = new Map<string, Map<string, Record<string, string>>>();

	if (isOnChainPackage) {
		const metadata: RootPackageMetadata = JSON.parse(
			await readFile(join(pkg.path, 'root_package_metadata.json'), 'utf-8'),
		);
		rootPackageId = metadata.root_package_original_id ?? metadata.root_package_id;
		if (!rootPackageId) {
			throw new Error(`root_package_metadata.json at ${pkg.path} is missing 'root_package_id'`);
		}
		if (!packageName) {
			packageName = rootPackageId;
		}

		if (metadata.type_origins) {
			for (const [originKey, origins] of Object.entries(metadata.type_origins)) {
				let modules = typeOriginsByPkgAndModule.get(originKey);
				if (!modules) {
					modules = new Map();
					typeOriginsByPkgAndModule.set(originKey, modules);
				}
				for (const { module_name, datatype_name, package: introducingId } of origins) {
					let modOrigins = modules.get(module_name);
					if (!modOrigins) {
						modOrigins = {};
						modules.set(module_name, modOrigins);
					}
					modOrigins[datatype_name] = introducingId;
				}
			}
		}
	} else {
		let parsedToml: { package?: { name?: unknown }; addresses?: Record<string, string> };
		try {
			parsedToml = parse(await readFile(join(pkg.path, 'Move.toml'), 'utf-8'));
		} catch {
			const message = `Failed to read Move.toml for ${pkg.path}`;
			if (!packageName) {
				throw new Error(message);
			}
			console.warn(message);
			parsedToml = {};
		}
		localAddressLabels = Object.keys(parsedToml.addresses ?? {});
		if (!pkg.packageName) {
			const tomlName = parsedToml.package?.name;
			if (typeof tomlName !== 'string') {
				throw new Error(`Package name not found in Move.toml for ${pkg.path}`);
			}
			packageName = tomlName.toLowerCase();
		}
	}

	const addressMappings: Record<string, string> = JSON.parse(
		await readFile(join(summaryDir, 'address_mapping.json'), 'utf-8'),
	);

	const packages = (await readdir(summaryDir)).filter((file) =>
		statSync(join(summaryDir, file)).isDirectory(),
	);

	const mainPackageDir = isOnChainPackage
		? rootPackageId!
		: resolveLocalMainPackageDir(localAddressLabels, packages, packageName, pkg.path);
	if (!packages.includes(mainPackageDir)) {
		throw new Error(`Main package dir ${mainPackageDir} not found in summary at ${pkg.path}`);
	}
	const isMainPackage = (pkgDir: string) => pkgDir === mainPackageDir;

	const registry = new ModuleRegistry(addressMappings);
	const modules = (
		await Promise.all(
			packages.map(async (pkgDir) => {
				const moduleFiles = await readdir(join(summaryDir, pkgDir));
				return Promise.all(
					moduleFiles
						.filter((f) => f.endsWith('.json'))
						.map(async (mod) => {
							const moduleName = basename(mod, '.json');
							return {
								package: pkgDir,
								isMainPackage: isMainPackage(pkgDir),
								module: moduleName,
								builder: await MoveModuleBuilder.fromSummaryFile(
									join(summaryDir, pkgDir, mod),
									registry,
									isMainPackage(pkgDir) ? mvrNameOrAddress : undefined,
									importExtension,
									includePhantomTypeParameters,
									typeOriginsByPkgAndModule.get(pkgDir)?.get(moduleName),
									isMainPackage(pkgDir) ? rootPackageId : undefined,
								),
							};
						}),
				);
			}),
		)
	).flat();

	const currentPackageAddress = isOnChainPackage
		? rootPackageId!
		: (addressMappings[mainPackageDir] ?? mainPackageDir);

	const { entries: configArgumentEntries } =
		Object.keys(globalConfigArguments ?? {}).length || Object.keys(pkg.configArguments ?? {}).length
			? parseConfigArguments(
					{ global: globalConfigArguments, package: pkg.configArguments },
					registry,
					{
						package: { id: pkg.package, address: currentPackageAddress },
						packageAddresses,
					},
				)
			: { entries: [] };

	const packageEntries = configArgumentEntries.filter(
		(entry): entry is ParsedConfigArgument & { kind: 'package' } =>
			entry.kind === 'package' && entry.package === pkg.package,
	);
	if (packageEntries.length > 1) {
		throw new Error(
			`Multiple configArguments package entries match ${pkg.package}: ${packageEntries
				.map((entry) => entry.key)
				.join(', ')}`,
		);
	}
	const packageConfigKey = packageEntries[0]?.key;

	for (const mod of modules) {
		mod.builder.setConfigArguments(
			configArgumentEntries,
			mod.isMainPackage ? packageConfigKey : undefined,
		);
	}

	const packageGenerate: PackageGenerate | undefined = 'generate' in pkg ? pkg.generate : undefined;
	const pkgModules = packageGenerate?.modules;
	const pkgTypes: TypesOption = packageGenerate?.types ?? globalGenerate?.types ?? true;
	const pkgFunctions: FunctionsOption =
		packageGenerate?.functions ?? globalGenerate?.functions ?? true;

	for (const mod of modules) {
		if (!mod.isMainPackage && prune) {
			continue;
		}

		const moduleGenerate = !pkgModules
			? true
			: Array.isArray(pkgModules)
				? pkgModules.includes(mod.module) || null
				: mod.module in pkgModules
					? pkgModules[mod.module]
					: null;

		if (!moduleGenerate) continue;

		const types = moduleGenerate === true ? pkgTypes : (moduleGenerate.types ?? false);
		const functions = moduleGenerate === true ? pkgFunctions : (moduleGenerate.functions ?? false);

		mod.builder.includeTypes(types);
		mod.builder.includeFunctions(functions);
	}

	// Wipe stale files before writing fresh ones.
	const packageOutputDir = join(outputDir, packageName);
	await rm(packageOutputDir, { recursive: true, force: true });

	await generateUtils({ outputDir, errorClass });

	await Promise.all(
		modules.map(async (mod) => {
			if ((mod.isMainPackage || !prune) && mod.builder.hasTypesOrFunctions()) {
				await mod.builder.renderBCSTypes();
				await mod.builder.renderFunctions();
			} else if (mod.isMainPackage) {
				return;
			} else if (mod.builder.hasBcsTypes()) {
				await mod.builder.renderBCSTypes();
			} else {
				return;
			}

			await mkdir(
				mod.isMainPackage
					? join(outputDir, packageName)
					: join(outputDir, packageName, 'deps', mod.package),
				{ recursive: true },
			);

			const packageDir = join(outputDir, packageName);
			const fileRelToPackage = mod.isMainPackage
				? `${mod.module}.ts`
				: join('deps', mod.package, `${mod.module}.ts`);

			await writeFile(
				join(packageDir, fileRelToPackage),
				await mod.builder.toString(packageDir, fileRelToPackage, outputDir),
			);
		}),
	);

	const usedConfigKeys = new Set<string>();
	for (const mod of modules) {
		for (const key of mod.builder.usedConfigKeys) {
			usedConfigKeys.add(key);
		}
	}

	// Every matcher is checked in the run of the package it targets: an unused entry targeting
	// this package is a misconfiguration (wrong parameterName, wrong instantiation, or a function
	// filtered out of generation). Entries targeting other packages are checked in their own runs.
	const normalizedCurrentAddress = normalizePackageAddress(currentPackageAddress);
	const unusedOwnEntries = configArgumentEntries.filter(
		(entry) =>
			entry.kind !== 'package' &&
			entry.address === normalizedCurrentAddress &&
			!usedConfigKeys.has(entry.key),
	);
	if (unusedOwnEntries.length > 0) {
		console.warn(
			`configArguments keys that matched no generated function parameters in ${pkg.package}: ${unusedOwnEntries
				.map((entry) => entry.key)
				.join(', ')}`,
		);
	}

	if (configArgumentEntries.length > 0) {
		await generateConfigInterface({
			packageOutputDir,
			outputDir,
			packageName,
			entries: configArgumentEntries.filter(
				(entry) => entry.kind !== 'package' || entry.package === pkg.package,
			),
			importExtension,
		});
	}
}

const HEX_ADDRESS = /^0x[0-9a-fA-F]{1,64}$/;

function normalizePackageAddress(address: string) {
	return HEX_ADDRESS.test(address) ? normalizeSuiAddress(address) : address;
}

/**
 * Resolve a package's root address from its summaries directory, for the `packageAddresses` map
 * passed to `generateFromPackageSummary`. Requires summaries to already exist at `pkgPath`.
 */
export async function resolvePackageRootAddress(pkgPath: string): Promise<string | undefined> {
	const metadataPath = join(pkgPath, 'root_package_metadata.json');
	if (existsSync(metadataPath)) {
		const metadata: RootPackageMetadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
		return metadata.root_package_original_id ?? metadata.root_package_id;
	}

	const summaryDir = join(pkgPath, 'package_summaries');
	if (!existsSync(join(summaryDir, 'address_mapping.json'))) {
		return undefined;
	}
	const addressMappings: Record<string, string> = JSON.parse(
		await readFile(join(summaryDir, 'address_mapping.json'), 'utf-8'),
	);

	let localAddressLabels: string[] = [];
	let packageName = '';
	try {
		const parsedToml: { package?: { name?: unknown }; addresses?: Record<string, string> } = parse(
			await readFile(join(pkgPath, 'Move.toml'), 'utf-8'),
		);
		localAddressLabels = Object.keys(parsedToml.addresses ?? {});
		if (typeof parsedToml.package?.name === 'string') {
			packageName = parsedToml.package.name.toLowerCase();
		}
	} catch {
		// fall through to summary-directory-based resolution
	}

	const packages = (await readdir(summaryDir)).filter((file) =>
		statSync(join(summaryDir, file)).isDirectory(),
	);

	try {
		const mainDir = resolveLocalMainPackageDir(localAddressLabels, packages, packageName, pkgPath);
		return addressMappings[mainDir] ?? mainDir;
	} catch {
		return undefined;
	}
}

/**
 * Emit `<output>/<packageName>/config-arguments.ts` with a convenience interface covering this
 * package's resolvable config keys (and its own package-address key), for `satisfies` on the user
 * side. With a global block spanning multiple packages, intersect the per-package interfaces
 * (`CoreConfig & MarginConfig`). The hyphenated filename can never collide with a generated Move
 * module file.
 */
async function generateConfigInterface({
	packageOutputDir,
	outputDir,
	packageName,
	entries,
	importExtension,
}: {
	packageOutputDir: string;
	outputDir: string;
	packageName: string;
	entries: ParsedConfigArgument[];
	importExtension: ImportExtension;
}) {
	const builder = new FileBuilder();
	const utilsModule = `~outputRoot/utils/index${importExtension}`;

	const interfaceName = `${capitalize(
		camelCase(packageName.replaceAll(/[^A-Za-z0-9_$]+/g, '_').replace(/^(\d)/, '_$1')),
	)}Config`;

	const fieldEntries = new Map<string, ParsedConfigArgument[]>();
	for (const entry of entries) {
		fieldEntries.set(entry.key, [...(fieldEntries.get(entry.key) ?? []), entry]);
	}

	const fields = [...fieldEntries.entries()].map(([key, group]) => {
		if (group[0].kind === 'package') {
			return `${key}?: string`;
		}

		// A key resolving multiple bindings (or a generic) must be a resolver function.
		const requiresResolver =
			group.length > 1 || group.some((entry) => entry.kind !== 'package' && entry.requiresResolver);

		if (requiresResolver) {
			const ctxName = builder.addImport(utilsModule, 'type ConfigResolverContext');
			const objArgName = builder.addImport(
				'@mysten/sui/transactions',
				'type TransactionObjectArgument',
			);
			return `${key}: (ctx: ${ctxName}) => string | ${objArgName}`;
		}

		return `${key}: ${builder.addImport(utilsModule, 'type ConfigValue')}`;
	});

	builder.statements.push(
		...parseTS /* ts */ `export interface ${interfaceName} {
			${fields.join(';\n')}
		}`,
	);

	await mkdir(packageOutputDir, { recursive: true });
	await writeFile(
		join(packageOutputDir, 'config-arguments.ts'),
		await builder.toString(packageOutputDir, 'config-arguments.ts', outputDir),
	);
}

async function generateUtils({
	outputDir,
	errorClass,
}: {
	outputDir: string;
	errorClass?: ErrorClassConfig;
}) {
	await mkdir(join(outputDir, 'utils'), { recursive: true });
	await writeFile(join(outputDir, 'utils', 'index.ts'), getUtilsContent(errorClass));
}

function resolveLocalMainPackageDir(
	localAddressLabels: string[],
	summaryPackages: string[],
	packageName: string,
	pkgPath: string,
): string {
	const fromLocalAddresses = localAddressLabels.filter((label) => summaryPackages.includes(label));
	if (fromLocalAddresses.length === 1) {
		return fromLocalAddresses[0];
	}
	if (summaryPackages.includes(packageName)) {
		return packageName;
	}

	throw new Error(
		`Could not identify main package directory for ${pkgPath}.\n` +
			`Summary subdirectories: ${summaryPackages.join(', ')}\n` +
			`Move.toml [package].name: ${packageName}\n` +
			`Move.toml [addresses] labels: ${localAddressLabels.join(', ') || '(none)'}\n` +
			`\nPass 'packageName: "<dir>"' in your codegen config to pick one of the summary subdirectories above.`,
	);
}
