// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import ts from 'typescript';
import { getUtilsContent } from '../src/generate-utils.js';

// Type-check the generated `utils/index.ts` content against the strictest reasonable consumer
// tsconfig (project `strict` + `noUncheckedIndexedAccess`). The utils content lives inside a
// JS template literal in `generate-utils.ts`, so it is invisible to the codegen package's own
// `tsc --noEmit` — without this test, embedded-TS bugs only surface when downstream consumers
// with strict tsconfigs build the generated output.
//
// The temp file is written under `tests/` so module resolution finds `@mysten/sui` via the
// codegen package's own `node_modules` (workspace symlinks).
describe('generated utils/index.ts typechecks', () => {
	it('passes strict + noUncheckedIndexedAccess', async () => {
		const tempPath = join(__dirname, '__generated_utils_typecheck.ts');
		await writeFile(tempPath, getUtilsContent());

		try {
			const program = ts.createProgram({
				rootNames: [tempPath],
				options: {
					target: ts.ScriptTarget.ES2020,
					module: ts.ModuleKind.NodeNext,
					moduleResolution: ts.ModuleResolutionKind.NodeNext,
					// Mirror tsconfig.shared.json's strictness so consumer-build failures (e.g.
					// TS6133 unused locals) are caught here, plus `noUncheckedIndexedAccess` for
					// the strictest reasonable consumer.
					strict: true,
					noUnusedLocals: true,
					noUnusedParameters: true,
					noImplicitReturns: true,
					noFallthroughCasesInSwitch: true,
					noUncheckedIndexedAccess: true,
					noEmit: true,
					skipLibCheck: true,
					esModuleInterop: true,
					resolveJsonModule: true,
					lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'],
				},
			});

			const diagnostics = ts
				.getPreEmitDiagnostics(program)
				.filter((d) => d.file?.fileName === tempPath);

			const messages = diagnostics.map((d) => {
				const text = ts.flattenDiagnosticMessageText(d.messageText, '\n');
				if (d.file && d.start !== undefined) {
					const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
					return `[utils/index.ts:${line + 1}:${character + 1}] ${text}`;
				}
				return text;
			});

			expect(messages, `Generated utils/index.ts has type errors:\n${messages.join('\n')}`).toEqual(
				[],
			);
		} finally {
			await rm(tempPath, { force: true });
		}
	});
});
