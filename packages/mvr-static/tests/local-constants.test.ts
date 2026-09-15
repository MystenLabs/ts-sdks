// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { execFile } from 'child_process';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { describe, expect, it } from 'vitest';

import {
	extractLocalConstantStrings,
	MAX_AST_CANDIDATES,
	MAX_AST_EVALUATIONS,
	MAX_AST_RESOLVED_CHARACTERS,
	MAX_AST_SOURCE_BYTES,
	MAX_AST_SOURCE_CHARACTERS,
} from '../src/local-constants.js';
import {
	extractMvrNamesFromContent,
	findNames,
	MAX_AST_PARSER_CONCURRENCY,
	runWithConcurrency,
} from '../src/parsing.js';

const execFileAsync = promisify(execFile);

async function extract(content: string, filepath = 'source.ts') {
	return [...(await extractMvrNamesFromContent(content, filepath))].sort();
}

describe('local constant-string extraction', () => {
	it('resolves template interpolation from a local const package', async () => {
		const names = await extract(`
			const pkg = '@template/pkg';
			const type = \`vector<\${pkg}::module::Type>\`;
			use(\`\${pkg}::other::Type\`);
			use(pkg + '::binary::Type');
		`);

		expect(names).toEqual([
			'@template/pkg',
			'@template/pkg::binary::Type',
			'@template/pkg::module::Type',
			'@template/pkg::other::Type',
		]);
	});

	it('resolves concatenation, transitive references, and forward references', async () => {
		const names = await extract(`
			const target = packageName + suffix;
			const packageName = alias;
			const suffix = '::module::Type';
			const alias = '@forward/pkg';
		`);

		expect(names).toEqual(['@forward/pkg', '@forward/pkg::module::Type']);
	});

	it('unwraps parentheses and transparent TypeScript expressions', async () => {
		const names = await extract(`
			const pkg = (('@wrapped/pkg' as const)!) as string;
			const asserted = <string>'@asserted/pkg';
			const target = ((pkg as string) + '::module::Type') satisfies string;
			const assertedTarget = \`\${asserted}::module::Type\`;
		`);

		expect(names).toEqual([
			'@asserted/pkg',
			'@asserted/pkg::module::Type',
			'@wrapped/pkg',
			'@wrapped/pkg::module::Type',
		]);
	});

	it('uses lexical scope for shadowing without leaking block bindings', async () => {
		const names = await extract(`
			const pkg = '@outer/pkg';
			{
				const pkg = '@inner/pkg';
				const inner = \`\${pkg}::inner::Type\`;
				const scoped = '@block/pkg';
			}
			const outer = \`\${pkg}::outer::Type\`;
			const leaked = \`\${scoped}::leaked::Type\`;
		`);

		expect(names).toEqual([
			'@inner/pkg',
			'@inner/pkg::inner::Type',
			'@outer/pkg',
			'@outer/pkg::outer::Type',
		]);
	});

	it('evaluates the switch discriminant outside its lexical case scope', async () => {
		const names = await extract(`
			const pkg = '@outer/pkg';
			switch (\`\${pkg}::discriminant::Type\`) {
				case \`\${pkg}::case::Type\`:
					const pkg = '@case/pkg';
					use(\`\${pkg}::body::Type\`);
			}
			use(\`\${pkg}::outer::Type\`);
		`);

		expect(names).toEqual([
			'@case/pkg',
			'@case/pkg::body::Type',
			'@case/pkg::case::Type',
			'@outer/pkg',
			'@outer/pkg::discriminant::Type',
			'@outer/pkg::outer::Type',
		]);
	});

	it('treats duplicate declarations as unresolved regardless of declaration order', async () => {
		const names = await extract(`
			const pkg = '@first/pkg';
			use(\`\${pkg}::before::Type\`);
			const pkg = '@second/pkg';
			use(\`\${pkg}::after::Type\`);
		`);

		expect(names).toEqual([]);
	});

	it('contains nested function and class declaration shadowing to their block', async () => {
		const names = await extract(`
			const pkg = '@outer/pkg';
			{
				function pkg() {}
				class Other {}
				use(\`\${pkg}::blocked::Type\`);
				use(\`\${Other}::blocked::Type\`);
			}
			use(\`\${pkg}::outer::Type\`);
			use(\`\${Other}::leaked::Type\`);
		`);

		expect(names).toEqual(['@outer/pkg', '@outer/pkg::outer::Type']);
	});

	it('does not treat type-only declarations or type parameters as runtime bindings', async () => {
		const names = await extract(`
			const pkg = '@runtime/pkg';
			type pkg = string;
			interface pkg {}
			import type { imported } from './types.js';

			use(\`\${pkg}::runtime::Type\`);
			use(\`\${imported}::type_import::Type\`);
			function fromTypeParameter<pkg>() {
				return \`\${pkg}::type_parameter::Type\`;
			}
		`);

		expect(names).toEqual([
			'@runtime/pkg',
			'@runtime/pkg::runtime::Type',
			'@runtime/pkg::type_parameter::Type',
		]);
	});

	it('keeps method and parameter decorators and computed keys outside parameter scope', async () => {
		const names = await extract(`
			const pkg = '@method/pkg';
			class Example {
				@decorate(\`\${pkg}::decorator::Type\`)
				[\`\${pkg}::key::Type\`](
					@param(\`\${pkg}::parameter_decorator::Type\`) pkg: string,
				) {
					return \`\${pkg}::body::Type\`;
				}

				constructor(
					@param(\`\${pkg}::property_decorator::Type\`) public pkg: string,
				) {}
			}
		`);

		expect(names).toEqual([
			'@method/pkg',
			'@method/pkg::decorator::Type',
			'@method/pkg::key::Type',
			'@method/pkg::parameter_decorator::Type',
			'@method/pkg::property_decorator::Type',
		]);
	});

	it('does not resolve outer consts through runtime parameter shadowing', async () => {
		const names = await extract(`
			const pkg = '@outer/pkg';

			function fromParameter(pkg: string) {
				return \`\${pkg}::parameter::Type\`;
			}

			class Example {
				method(pkg: string) {
					return \`\${pkg}::method::Type\`;
				}
			}
		`);

		expect(names).toEqual([]);
	});

	it('does not leak bindings out of loops or catch clauses', async () => {
		const names = await extract(`
			for (const pkg = '@loop/pkg'; condition; update()) {
				use(\`\${pkg}::loop::Type\`);
			}
			use(\`\${pkg}::leaked::Type\`);

			try {} catch (pkg) {
				use(\`\${pkg}::catch::Type\`);
			}
		`);

		expect(names).toEqual(['@loop/pkg', '@loop/pkg::loop::Type']);
	});

	it('registers import-equals declarations as unsupported runtime bindings', async () => {
		const names = await extract(`
			const pkg = '@outer/pkg';
			{
				import pkg = require('./package.js');
				use(\`\${pkg}::blocked::Type\`);
			}
			use(\`\${pkg}::outer::Type\`);
		`);

		expect(names).toEqual(['@outer/pkg', '@outer/pkg::outer::Type']);
	});

	it('does not infer cycles, unresolved or mutable names, imports, calls, members, or parameters', async () => {
		const names = await extract(`
			import { importedPkg } from './package.js';
			import importEqualsPkg = require('./package.js');

			const cycleA = cycleB;
			const cycleB = cycleA;
			let mutablePkg = '@mutable/pkg';
			const fromCycle = \`\${cycleA}::cycle::Type\`;
			const unresolved = \`\${missingPkg}::missing::Type\`;
			const fromMutable = \`\${mutablePkg}::mutable::Type\`;
			const fromImport = \`\${importedPkg}::imported::Type\`;
			const fromImportEquals = \`\${importEqualsPkg}::imported_equals::Type\`;
			const fromCall = \`\${getPackage()}::dynamic::Type\`;
			const fromMember = \`\${config.pkg}::member::Type\`;

			function build(parameter = String.raw\`@parameter/pkg\`) {
				return \`\${parameter}::parameter::Type\`;
			}
		`);

		expect(names).toEqual([]);
	});

	it('does not evaluate standalone identifiers or arbitrary non-string expressions', async () => {
		const names = await extract(`
			const pkg = getPackage();
			use(pkg);
			use(true ? pkg : getOtherPackage());
			use(String.raw\`\${pkg}::tagged::Type\`);
			use(false && \`\${pkg}::nested::Type\`);
		`);

		expect(names).toEqual([]);
	});

	it('does not salvage partial strings from unresolved expressions', async () => {
		const names = await extract(`
			const pkg = '@partial/pkg';
			use(pkg + dynamic + '::partial::Type');
			use(\`\${dynamic}::template::Type\`);
		`);

		expect(names).toEqual([]);
	});

	it('keeps evaluation output independent of transient cycle/depth failures', async () => {
		const aliases = Array.from({ length: 51 }, (_, index) => {
			const next = index === 50 ? 'pkg' : `alias${index + 1}`;
			return `const alias${index} = ${next};`;
		}).join('\n');
		const names = await extract(`
			const pkg = '@order/pkg';
			const tooDeepFirst = \`\${alias0}::deep::Type\`;
			const directLater = \`\${pkg}::direct::Type\`;
			${aliases}
		`);

		expect(names).toContain('@order/pkg::direct::Type');
	});

	it('keeps static-block and namespace var bindings inside their var scopes', async () => {
		const names = await extract(`
			const pkg = '@outer/pkg';
			class Example {
				static {
					var pkg = getStaticPackage();
					use(\`\${pkg}::static::Type\`);
				}
			}
			namespace ExampleNamespace {
				var pkg = getModulePackage();
				use(\`\${pkg}::module::Type\`);
			}
			use(\`\${pkg}::outer::Type\`);
		`);

		expect(names).toEqual(['@outer/pkg', '@outer/pkg::outer::Type']);
	});

	it('evaluates with objects in parent scope and bodies in opaque scope', async () => {
		const names = await extract(
			`const pkg = '@outer/pkg';
			with ({ key: \`\${pkg}::object::Type\` }) {
				use(\`\${pkg}::body::Type\`);
			}`,
			'source.js',
		);

		expect(names).toEqual(['@outer/pkg', '@outer/pkg::object::Type']);
	});

	it('uses regex-only fallback when source character or byte caps are exceeded', async () => {
		const characterOnly = `const pkg = '@character-only/pkg::'; use(\`\${pkg}ast::Type\`);`;
		const byteOnly = `const pkg = '@byte-only/pkg::'; use(\`\${pkg}ast::Type\`);`;
		const oversizedCharacters = `${characterOnly}${' '.repeat(
			MAX_AST_SOURCE_CHARACTERS - characterOnly.length + 1,
		)}`;
		const byteOnlyBytes = Buffer.byteLength(byteOnly, 'utf8');
		const oversizedBytes = `${byteOnly}${'é'.repeat(
			Math.floor((MAX_AST_SOURCE_BYTES - byteOnlyBytes) / 2) + 1,
		)}`;

		expect(oversizedCharacters.length).toBe(MAX_AST_SOURCE_CHARACTERS + 1);
		expect(oversizedBytes.length).toBeLessThanOrEqual(MAX_AST_SOURCE_CHARACTERS);
		expect(Buffer.byteLength(oversizedBytes, 'utf8')).toBeGreaterThan(MAX_AST_SOURCE_BYTES);
		await expect(extract(oversizedCharacters)).resolves.toEqual(['@character-only/pkg']);
		await expect(extract(oversizedBytes)).resolves.toEqual(['@byte-only/pkg']);
	});

	it('bounds aggregate candidate count, evaluation work, and resolved characters', async () => {
		const candidate = `use(\`candidate\`);`;
		const candidateHeavy = candidate.repeat(
			Math.min(
				MAX_AST_CANDIDATES + 1,
				Math.floor(MAX_AST_SOURCE_BYTES / Buffer.byteLength(candidate, 'utf8')),
			),
		);
		const evaluation = `use(dynamic + 'tail');`;
		const evaluationHeavy = evaluation.repeat(
			Math.min(
				Math.floor(MAX_AST_EVALUATIONS / 3) + 1,
				Math.floor(MAX_AST_SOURCE_BYTES / Buffer.byteLength(evaluation, 'utf8')),
			),
		);
		const resolvedValue = `@${'p'.repeat(10_000)}::module::Type`;
		const characterHeavy = `const pkg = '${resolvedValue}'; const values = [${Array.from(
			{ length: Math.floor(MAX_AST_RESOLVED_CHARACTERS / resolvedValue.length) + 1 },
			() => 'pkg',
		).join(',')}];`;

		expect(candidateHeavy.length).toBeLessThanOrEqual(MAX_AST_SOURCE_CHARACTERS);
		expect(evaluationHeavy.length).toBeLessThanOrEqual(MAX_AST_SOURCE_CHARACTERS);
		expect(characterHeavy.length).toBeLessThanOrEqual(MAX_AST_SOURCE_CHARACTERS);

		await expect(extractLocalConstantStrings(candidateHeavy, 'source.ts')).rejects.toThrow(
			'AST candidates limit exceeded',
		);
		await expect(extractLocalConstantStrings(evaluationHeavy, 'source.ts')).rejects.toThrow(
			'AST evaluations limit exceeded',
		);
		await expect(extractLocalConstantStrings(characterHeavy, 'source.ts')).rejects.toThrow(
			'AST resolvedCharacters limit exceeded',
		);
	});

	it('retains regex results when aggregate budgets are exhausted', async () => {
		const candidateHeavy = `${Array.from(
			{ length: MAX_AST_CANDIDATES + 1 },
			(_, index) => `use(\`candidate-${index}\`);`,
		).join('\n')}\n// @candidate/pkg::regex::Type`;

		await expect(extract(candidateHeavy)).resolves.toEqual([
			'@candidate/pkg',
			'@candidate/pkg::regex::Type',
		]);
	});

	it('parses dense source just below the cap under a 256 MB heap', async () => {
		const source = `import { parsers } from 'prettier/plugins/typescript';
			const source = '0;'.repeat(${Math.floor((MAX_AST_SOURCE_BYTES - 2) / 2)});
			const ast = await parsers.typescript.parse(source, { filepath: 'dense.ts' });
			console.log(source.length, ast.body.length);`;
		const { stdout, stderr } = await execFileAsync(
			process.execPath,
			['--max-old-space-size=256', '--input-type=module', '-e', source],
			{ cwd: resolvePackageRoot(), timeout: 30_000 },
		);

		expect(stderr).toBe('');
		expect(stdout.trim()).toBe(`${MAX_AST_SOURCE_BYTES - 2} ${(MAX_AST_SOURCE_BYTES - 2) / 2}`);
	});

	it('runs the file pipeline with single-file concurrency', async () => {
		let active = 0;
		let peak = 0;
		const completed: number[] = [];
		await runWithConcurrency(
			Array.from({ length: 25 }, (_, index) => index),
			MAX_AST_PARSER_CONCURRENCY,
			async (index) => {
				active++;
				peak = Math.max(peak, active);
				await new Promise((resolve) => setTimeout(resolve, 1));
				completed.push(index);
				active--;
			},
		);

		expect(MAX_AST_PARSER_CONCURRENCY).toBe(1);
		expect(peak).toBe(1);
		expect(completed).toEqual(Array.from({ length: 25 }, (_, index) => index));
	});

	it('retains regex results when AST parsing fails', async () => {
		const names = await extract(`
			const broken = ;
			// @fallback/pkg::module::Type
		`);

		expect(names).toEqual(['@fallback/pkg', '@fallback/pkg::module::Type']);
	});

	it('retains comment, literal, and no-substitution template behavior', async () => {
		const names = await extract(`
			// @comment/pkg::comment::Type
			const literal = '@literal/pkg::literal::Type';
			const template = \`@template/pkg::template::Type\`;
		`);

		expect(names).toEqual([
			'@comment/pkg',
			'@comment/pkg::comment::Type',
			'@literal/pkg',
			'@literal/pkg::literal::Type',
			'@template/pkg',
			'@template/pkg::template::Type',
		]);
	});

	it.each(['js', 'ts', 'mjs', 'cjs', 'mts', 'cts'])(
		'parses .%s source files',
		async (extension) => {
			const names = await extract(
				`const pkg = '@extension/pkg'; const type = \`\${pkg}::module::Type\`;`,
				`source.${extension}`,
			);

			expect(names).toEqual(['@extension/pkg', '@extension/pkg::module::Type']);
		},
	);

	it.each(['jsx', 'tsx'])('parses .%s source files with JSX', async (extension) => {
		const names = await extract(
			`const pkg = '@extension/pkg'; const element = <div data-type={\`\${pkg}::module::Type\`} />;`,
			`source.${extension}`,
		);

		expect(names).toEqual(['@extension/pkg', '@extension/pkg::module::Type']);
	});

	it('scans .mts and .cts files by default', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'mvr-static-'));

		try {
			await Promise.all([
				writeFile(
					join(directory, 'module.mts'),
					"const pkg = '@mts/pkg'; const type = pkg + '::module::Type';",
				),
				writeFile(
					join(directory, 'common.cts'),
					"const pkg = '@cts/pkg'; const type = `${pkg}::module::Type`;",
				),
			]);

			const names = await findNames({ directory });
			expect([...names].sort()).toEqual([
				'@cts/pkg',
				'@cts/pkg::module::Type',
				'@mts/pkg',
				'@mts/pkg::module::Type',
			]);
		} finally {
			await rm(directory, { force: true, recursive: true });
		}
	});
});

function resolvePackageRoot() {
	return join(__dirname, '..');
}
