// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { MoveModuleBuilder } from './move-module-builder.js';
import { existsSync, statSync } from 'node:fs';
import { utilsContent } from './generate-utils.js';
import { parse } from 'toml';
import type {
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
}: {
	package: PackageConfig;
	prune: boolean;
	outputDir: string;
	globalGenerate?: GenerateBase;
	importExtension?: ImportExtension;
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
	let mainPackageAddress: string | undefined;
	const mvrNameOrAddress = pkg.package;

	if (isOnChainPackage) {
		// For on-chain packages, get the main package address from root_package_metadata.json
		const metadata = JSON.parse(
			await readFile(join(pkg.path, 'root_package_metadata.json'), 'utf-8'),
		);
		mainPackageAddress = metadata.root_package_id;
		// Use the package name provided or fall back to the full address
		if (!packageName) {
			packageName = mainPackageAddress!;
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

	// For on-chain packages, the main package is identified by the root_package_id
	// For local packages, it's identified by the packageName
	const isMainPackage = (pkgDir: string) => {
		if (isOnChainPackage) {
			return pkgDir === mainPackageAddress;
		}
		return pkgDir === packageName;
	};

	const modules = (
		await Promise.all(
			packages.map(async (pkgDir) => {
				const moduleFiles = await readdir(join(summaryDir, pkgDir));
				return Promise.all(
					moduleFiles
						.filter((f) => f.endsWith('.json'))
						.map(async (mod) => ({
							package: pkgDir,
							isMainPackage: isMainPackage(pkgDir),
							module: basename(mod, '.json'),
							builder: await MoveModuleBuilder.fromSummaryFile(
								join(summaryDir, pkgDir, mod),
								addressMappings,
								isMainPackage(pkgDir) ? mvrNameOrAddress : undefined,
								importExtension,
							),
						})),
				);
			}),
		)
	).flat();

	const moduleBuilders = Object.fromEntries(
		modules.map((mod) => [`${mod.package}::${mod.module}`, mod.builder]),
	);

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

		mod.builder.includeTypes(moduleBuilders, types);
		mod.builder.includeFunctions(functions);
	}

	await generateUtils({ outputDir });

	// Clean the package output directory to remove stale files from previous runs
	const packageOutputDir = join(outputDir, packageName);
	await rm(packageOutputDir, { recursive: true, force: true });

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

async function generateUtils({ outputDir }: { outputDir: string }) {
	await mkdir(join(outputDir, 'utils'), { recursive: true });
	await writeFile(join(outputDir, 'utils', 'index.ts'), utilsContent);
}
