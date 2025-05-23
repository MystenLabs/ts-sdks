// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type ts from 'typescript';
import { getSafeName } from './render-types.js';
import { parseTS, printStatements } from './utils.js';
import { relative, resolve } from 'path';

export class FileBuilder {
	statements: ts.Statement[] = [];
	exports: string[] = [];
	imports: Map<string, Set<string>> = new Map();
	starImports: Map<string, string> = new Map();

	addImport(module: string, name: string) {
		if (!this.imports.has(module)) {
			this.imports.set(module, new Set());
		}

		this.imports.get(module)!.add(name);
	}

	addStarImport(module: string, name: string) {
		this.starImports.set(getSafeName(name), module);
	}

	toString(modDir: string, filePath: string) {
		const importStatements = [...this.imports.entries()].flatMap(
			([module, names]) =>
				parseTS`import { ${[...names].join(', ')} } from '${modulePath(module)}'`,
		);
		const starImportStatements = [...this.starImports.entries()].flatMap(
			([name, module]) => parseTS`import * as ${name} from '${modulePath(module)}'`,
		);

		const header = '// Copyright (c) Mysten Labs, Inc.\n// SPDX-License-Identifier: Apache-2.0\n\n';

		return `${header}${printStatements([...importStatements, ...starImportStatements, ...this.statements])}`;

		function modulePath(mod: string) {
			const sourcePath = resolve(modDir, filePath);
			const destPath = resolve(modDir, mod);
			const sourceDirectory = sourcePath.split('/').slice(0, -1).join('/');
			const relativePath = relative(sourceDirectory, destPath);
			if (mod.startsWith('./')) {
				return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
			}

			return mod;
		}
	}
}
