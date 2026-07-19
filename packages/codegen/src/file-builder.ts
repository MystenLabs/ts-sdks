// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type ts from 'typescript';
import { parseTS, printNodes } from './utils.js';
import { relative, resolve } from 'path';
import { getSafeName } from './render-types.js';

export class FileBuilder {
	statements: ts.Statement[] = [];
	exports: string[] = [];
	imports: Map<string, Set<string>> = new Map();
	starImports: Map<string, string> = new Map();
	protected reservedNames: Set<string> = new Set();

	addImport(module: string, name: string): string {
		if (!this.imports.has(module)) {
			this.imports.set(module, new Set());
		}

		const isTypeImport = name.startsWith('type ');
		const baseName = isTypeImport ? name.slice(5) : name;

		if (this.reservedNames.has(baseName)) {
			const alias = this.getUnusedName(baseName);
			const aliasedImport = isTypeImport
				? `type ${baseName} as ${alias}`
				: `${baseName} as ${alias}`;
			this.imports.get(module)!.add(aliasedImport);
			return alias;
		}

		this.imports.get(module)!.add(name);
		return baseName;
	}

	addStarImport(module: string, name: string) {
		for (const [existingName, existingModule] of this.starImports) {
			if (existingModule === module) return existingName;
		}
		const importName = this.getUnusedName(name);
		this.starImports.set(importName, module);
		return importName;
	}

	getUnusedName(name: string) {
		let deConflictedName = getSafeName(name);

		let i = 1;
		while (this.reservedNames.has(deConflictedName)) {
			deConflictedName = `${name}_${i}`;
			i++;
		}

		this.reservedNames.add(deConflictedName);
		return deConflictedName;
	}

	async getHeader() {
		return [
			'/**************************************************************',
			' * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *',
			' **************************************************************/',
			'',
		].join('\n');
	}

	async toString(packageDir: string, filePath: string, outputDir: string = packageDir) {
		const importStatements = [...this.imports.entries()].flatMap(
			([module, names]) =>
				parseTS`import { ${[...names].join(', ')} } from '${modulePath(module)}'`,
		);
		const starImportStatements = [...this.starImports.entries()].flatMap(
			([name, module]) => parseTS`import * as ${name} from '${modulePath(module)}'`,
		);

		return `${await this.getHeader()}${printNodes(...importStatements, ...starImportStatements, ...this.statements)}`;

		function modulePath(mod: string) {
			// `~root/` is anchored at the package's own output directory (where deps/ lives).
			// `~outputRoot/` is anchored at the codegen output directory (where utils/ lives).
			// Splitting these matters when packageName contains a slash — `~root/../utils` would
			// only escape one segment and land in a sibling subdirectory rather than at outputDir.
			const anchor = mod.startsWith('~outputRoot/')
				? outputDir
				: mod.startsWith('~root/')
					? packageDir
					: null;
			if (anchor === null) return mod;

			const placeholder = mod.startsWith('~outputRoot/') ? '~outputRoot/' : '~root/';
			const sourcePath = resolve(packageDir, filePath);
			const destPath = resolve(anchor, mod.replace(placeholder, './'));
			const sourceDirectory = sourcePath.split('/').slice(0, -1).join('/');
			const relativePath = relative(sourceDirectory, destPath);
			return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
		}
	}
}
