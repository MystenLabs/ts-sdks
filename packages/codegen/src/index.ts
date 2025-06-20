// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { MoveModuleBuilder } from './move-module-builder.js';
import { existsSync, statSync } from 'node:fs';
import { utilsContent } from './generate-utils.js';

export async function generateFromPackageSummary({
	source,
	destination,
	name,
	noPrune,
}: {
	source: string;
	destination: string;
	name: string;
	noPrune?: boolean;
}) {
	const summaryDir = join(source, 'package_summaries');

	if (!existsSync(summaryDir)) {
		throw new Error(`Package summary directory not found: ${summaryDir}`);
	}

	const addressMappings: Record<string, string> = JSON.parse(
		await readFile(join(summaryDir, 'address_mapping.json'), 'utf-8'),
	);

	const packages = (await readdir(summaryDir)).filter((file) =>
		statSync(join(summaryDir, file)).isDirectory(),
	);
	const modules = (
		await Promise.all(
			packages.map(async (pkg) => {
				const modules = await readdir(join(summaryDir, pkg));
				return Promise.all(
					modules.map(async (mod) => ({
						package: pkg,
						isMainPackage: pkg === name,
						module: basename(mod, '.json'),
						builder: await MoveModuleBuilder.fromSummaryFile(
							join(summaryDir, pkg, mod),
							addressMappings,
						),
					})),
				);
			}),
		)
	).flat();

	const moduleBuilders = Object.fromEntries(
		modules.map((mod) => [`${mod.package}::${mod.module}`, mod.builder]),
	);

	modules.forEach((mod) => {
		if (mod.isMainPackage || noPrune) {
			mod.builder.includeAllTypes(moduleBuilders);
		}
	});

	await generateUtils({ destination });

	await Promise.all(
		modules.map(async (mod) => {
			if ((mod.isMainPackage || noPrune) && mod.builder.hasTypesOrFunctions()) {
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
				mod.isMainPackage ? join(destination, name) : join(destination, name, 'deps', mod.package),
				{ recursive: true },
			);

			await writeFile(
				mod.isMainPackage
					? join(destination, name, `${mod.module}.ts`)
					: join(destination, name, 'deps', mod.package, `${mod.module}.ts`),
				await mod.builder.toString(
					'./',
					mod.isMainPackage ? `./${mod.module}.ts` : `./deps/${mod.package}/${mod.module}.ts`,
				),
			);
		}),
	);
}

async function generateUtils({ destination }: { destination: string }) {
	await mkdir(join(destination, 'utils'), { recursive: true });
	await writeFile(join(destination, 'utils', 'index.ts'), utilsContent);
}
