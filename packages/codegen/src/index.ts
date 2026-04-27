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
	const mvrNameOrAddress = pkg.package;

	const typeOriginsByPkgAndModule = new Map<string, Map<string, Record<string, string>>>();
	let dependencyIds = new Set<string>();

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
		dependencyIds = new Set(Object.keys(metadata.dependencies ?? {}));

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
	} else if (!pkg.packageName) {
		try {
			const packageToml = await readFile(join(pkg.path, 'Move.toml'), 'utf-8');
			packageName = parse(packageToml).package.name.toLowerCase();
		} catch {
			const message = `Package name not found in package.toml for ${pkg.path}`;
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
		? packages.find((dir) => !dependencyIds.has(dir))
		: undefined;
	const isMainPackage = (pkgDir: string) => {
		if (isOnChainPackage) {
			return pkgDir === mainPackageDir;
		}
		return pkgDir === packageName;
	};

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

	// Clean the package output directory to remove stale files from previous runs.
	// Done before writing utils so a pathological `packageName === 'utils'` doesn't wipe them.
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
