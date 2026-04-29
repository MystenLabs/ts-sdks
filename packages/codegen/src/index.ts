// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { ModuleRegistry } from './module-registry.js';
import { MoveModuleBuilder } from './move-module-builder.js';
import { existsSync, statSync } from 'node:fs';
import { getUtilsContent } from './generate-utils.js';
import { parse } from 'toml';
import type { RootPackageMetadata } from './types/summary.js';
import type {
	ErrorClassConfig,
	FunctionsOption,
	GenerateBase,
	ImportExtension,
	PackageConfig,
	PackageGenerate,
	TypesOption,
} from './config.js';
export { type SuiCodegenConfig } from './config.js';

export async function generateFromPackageSummary({
	package: pkg,
	prune,
	outputDir,
	globalGenerate,
	importExtension = '.js',
	includePhantomTypeParameters = false,
	errorClass,
}: {
	package: PackageConfig;
	prune: boolean;
	outputDir: string;
	globalGenerate?: GenerateBase;
	importExtension?: ImportExtension;
	includePhantomTypeParameters?: boolean;
	errorClass?: ErrorClassConfig;
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
		try {
			const parsedToml = parse(await readFile(join(pkg.path, 'Move.toml'), 'utf-8'));
			localAddressLabels = Object.keys(parsedToml.addresses ?? {});
			if (!pkg.packageName) {
				packageName = parsedToml.package?.name?.toLowerCase();
			}
		} catch {
			const message = `Failed to read Move.toml for ${pkg.path}`;
			if (packageName) {
				console.warn(message);
			} else {
				throw new Error(message);
			}
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

			await writeFile(
				mod.isMainPackage
					? join(outputDir, packageName, `${mod.module}.ts`)
					: join(outputDir, packageName, 'deps', mod.package, `${mod.module}.ts`),
				await mod.builder.toString(
					'./',
					mod.isMainPackage ? `./${mod.module}.ts` : `./deps/${mod.package}/${mod.module}.ts`,
				),
			);
		}),
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

// The summary subdirectory for a local package is keyed by the package's own
// [addresses] label (declared in Move.toml). Dependencies' labels never appear
// in the local Move.toml's [addresses] table — they come through the dep chain.
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
		`Could not identify main package directory for ${pkgPath}: ` +
			`expected exactly one [addresses] label in Move.toml to match a summary subdirectory. ` +
			`Summary subdirectories: ${summaryPackages.join(', ')}; ` +
			`local [addresses] labels: ${localAddressLabels.join(', ') || '(none)'}.`,
	);
}
