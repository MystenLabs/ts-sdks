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

	addImport(module: string, name: string) {
		if (!this.imports.has(module)) {
			this.imports.set(module, new Set());
		}

		this.imports.get(module)!.add(name);
	}

	addStarImport(module: string, name: string) {
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

	async toString(modDir: string, filePath: string) {
		const importStatements = [...this.imports.entries()].flatMap(
			([module, names]) =>
				parseTS`import { ${[...names].join(', ')} } from '${modulePath(module)}'`,
		);
		const starImportStatements = [...this.starImports.entries()].flatMap(
			([name, module]) => parseTS`import * as ${name} from '${modulePath(module)}'`,
		);

		return `${await this.getHeader()}${printNodes(...importStatements, ...starImportStatements, ...this.statements)}`;

		function modulePath(mod: string) {
			if (!mod.startsWith('~root/')) {
				return mod;
			}

			const sourcePath = resolve(modDir, filePath);
			const destPath = resolve(modDir, mod.replace('~root/', './'));
			const sourceDirectory = sourcePath.split('/').slice(0, -1).join('/');
			const relativePath = relative(sourceDirectory, destPath);
			return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
		}
	}
}
