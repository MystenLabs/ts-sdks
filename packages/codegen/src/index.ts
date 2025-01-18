// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { deserialize } from '@mysten/move-bytecode-template';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import type ts from 'typescript';

import { getSafeName, renderTypeSignature } from './render-types.js';
import type { DeserializedModule, TypeSignature } from './types.js';
import { mapToObject, parseTS, printStatements } from './utils.js';

const SUI_FRAMEWORK_ADDRESS = normalizeSuiAddress('0x2').slice(2);

class ModuleBuilder {
	statements: ts.Statement[] = [];
	moduleDef: DeserializedModule;
	exports: string[] = [];
	imports: Map<string, Set<string>> = new Map();
	starImports: Map<string, string> = new Map();

	constructor(moduleDef: DeserializedModule) {
		this.moduleDef = moduleDef;
	}

	static async fromFile(file: string) {
		const bytes = await readFile(file);

		return new ModuleBuilder(deserialize(bytes));
	}

	addImport(module: string, name: string) {
		if (!this.imports.has(module)) {
			this.imports.set(module, new Set());
		}

		this.imports.get(module)!.add(name);
	}

	addStarImport(module: string, name: string) {
		this.starImports.set(getSafeName(name), module);
	}

	renderBCSTypes() {
		this.addImport('@mysten/sui/bcs', 'bcs');
		this.renderStructs();
		this.renderEnums();
	}

	hasBcsTypes() {
		return this.moduleDef.struct_defs.length > 0 || this.moduleDef.enum_defs.length > 0;
	}

	hasTypesOrFunctions() {
		return this.hasBcsTypes() || this.moduleDef.function_defs.length > 0;
	}

	renderStructs() {
		for (const struct of this.moduleDef.struct_defs) {
			const handle = this.moduleDef.datatype_handles[struct.struct_handle];
			const name = this.moduleDef.identifiers[handle.name];
			this.exports.push(name);

			const fields =
				struct.field_information.Declared?.map((field) => ({
					name: this.moduleDef.identifiers[field.name],
					signature: field.signature,
				})) ?? [];

			const fieldObject = mapToObject(fields, (field) => [
				field.name,
				renderTypeSignature(field.signature, {
					format: 'bcs',
					moduleDef: this.moduleDef,
					onDependency: (address, mod) =>
						this.addStarImport(
							normalizeSuiAddress(address) === normalizeSuiAddress('0x0')
								? `./${mod}.js`
								: `./deps/${address}/${mod}.js`,
							mod,
						),
				}),
			]);

			const params = handle.type_parameters.filter((param) => !param.is_phantom);

			if (params.length === 0) {
				this.statements.push(
					...parseTS/* ts */ `export function ${name}() {
						return bcs.struct('${name}', ${fieldObject})
					}`,
				);
			} else {
				this.addImport('@mysten/sui/bcs', 'type BcsType');

				const typeParams = `...typeParameters: [${params.map((_, i) => `T${i}`).join(', ')}]`;
				const typeGenerics = `${params.map((_, i) => `T${i} extends BcsType<any>`).join(', ')}`;

				this.statements.push(
					...parseTS/* ts */ `export function ${name}<${typeGenerics}>(${typeParams}) {
						return bcs.struct('${name}', ${fieldObject})
					}`,
				);
			}
		}
	}

	renderEnums() {
		for (const enumDef of this.moduleDef.enum_defs) {
			const handle = this.moduleDef.datatype_handles[enumDef.enum_handle];
			const name = this.moduleDef.identifiers[handle.name];
			this.exports.push(name);

			const variants = enumDef.variants.map((variant) => ({
				name: this.moduleDef.identifiers[variant.variant_name],
				fields: variant.fields.map((field) => ({
					name: this.moduleDef.identifiers[field.name],
					signature: renderTypeSignature(field.signature, {
						format: 'bcs',
						moduleDef: this.moduleDef,
						onDependency: (address, mod) => this.addStarImport(`./deps/${address}/${mod}.js`, mod),
					}),
				})),
			}));

			const variantsObject = mapToObject(variants, (variant) => [
				variant.name,
				variant.fields.length === 0
					? 'null'
					: variant.fields.length === 1
						? variant.fields[0].signature
						: `bcs.tuple([${variant.fields.map((field) => field.signature).join(', ')}])`,
			]);

			const params = handle.type_parameters.filter((param) => !param.is_phantom);

			if (params.length === 0) {
				this.statements.push(
					...parseTS/* ts */ `
					export function ${name}( ) {
						return bcs.enum('${name}', ${variantsObject})
					}`,
				);
			} else {
				this.addImport('@mysten/sui/bcs', 'type BcsType');

				const typeParams = `...typeParameters: [${params.map((_, i) => `T${i}`).join(', ')}]`;
				const typeGenerics = `${params.map((_, i) => `T${i} extends BcsType<any>`).join(', ')}`;

				this.statements.push(
					...parseTS/* ts */ `
					export function ${name}<${typeGenerics}>(${typeParams}) {
						return bcs.enum('${name}', ${variantsObject})
					}`,
				);
			}
		}
	}

	renderFunctions() {
		const statements = [];
		const names = [];

		if (this.moduleDef.function_defs.length !== 0) {
			this.addImport('@mysten/sui/transactions', 'type Transaction');
		}

		for (const func of this.moduleDef.function_defs) {
			const handle = this.moduleDef.function_handles[func.function];
			const moduleName =
				this.moduleDef.identifiers[this.moduleDef.module_handles[handle.module].name];
			const parameters = this.moduleDef.signatures[handle.parameters].filter(
				(param) => !this.isContextReference(param),
			);
			const name = this.moduleDef.identifiers[handle.name];
			const fnName = getSafeName(name);

			this.addImport('./utils/index.ts', 'normalizeMoveArguments');
			this.addImport('./utils/index.ts', 'type RawTransactionArgument');

			names.push(fnName);

			const usedTypeParameters = new Set<number>();
			const argumentsTypes = parameters
				.map((param) =>
					renderTypeSignature(param, {
						format: 'typescriptArg',
						moduleDef: this.moduleDef,
						onTypeParameter: (typeParameter) => usedTypeParameters.add(typeParameter),
					}),
				)
				.map((type) => `RawTransactionArgument<${type}>`)
				.join(',\n');

			const typeParameters = handle.type_parameters.filter((_, i) => usedTypeParameters.has(i));

			if (usedTypeParameters.size > 0) {
				this.addImport('@mysten/sui/bcs', 'type BcsType');
			}

			statements.push(
				...parseTS/* ts */ `function
					${fnName}${
						typeParameters.length
							? `<
							${typeParameters.map((_, i) => `T${i} extends BcsType<any>`)}
						>`
							: ''
					}(options: {
						arguments: [
						${argumentsTypes}],

						${
							handle.type_parameters.length
								? `typeArguments: [${handle.type_parameters.map(() => 'string').join(', ')}]`
								: ''
						}
				}) {
					const argumentsTypes = [
						${parameters
							.map((param) =>
								renderTypeSignature(param, { format: 'typeTag', moduleDef: this.moduleDef }),
							)
							.map((tag) => (tag.includes('{') ? `\`${tag}\`` : `'${tag}'`))
							.join(',\n')}
					]
					return (tx: Transaction) => tx.moveCall({
						package: packageAddress,
						module: '${moduleName}',
						function: '${name}',
						arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
						${handle.type_parameters.length ? 'typeArguments: options.typeArguments' : ''}
					})
				}`,
			);
		}

		this.statements.push(
			...parseTS/* ts */ `
			export function init(packageAddress: string) {
				${statements}

				return { ${names.join(', ')} }
			}`,
		);
	}

	isContextReference(type: TypeSignature): boolean {
		if (typeof type === 'string') {
			return false;
		}

		if ('Reference' in type) {
			return this.isContextReference(type.Reference);
		}

		if ('MutableReference' in type) {
			return this.isContextReference(type.MutableReference);
		}

		if ('Datatype' in type) {
			const handle = this.moduleDef.datatype_handles[type.Datatype];
			const moduleHandle = this.moduleDef.module_handles[handle.module];
			const address = this.moduleDef.address_identifiers[moduleHandle.address];
			const name = this.moduleDef.identifiers[handle.name];

			return address === SUI_FRAMEWORK_ADDRESS && name === 'TxContext';
		}

		return false;
	}

	toString(modDir: string, filePath: string) {
		const importStatements = [...this.imports.entries()].flatMap(
			([module, names]) =>
				parseTS`import { ${[...names].join(', ')} } from '${modulePath(module)}'`,
		);
		const starImportStatements = [...this.starImports.entries()].flatMap(
			([name, module]) => parseTS`import * as ${name} from '${modulePath(module)}'`,
		);

		return printStatements([...importStatements, ...starImportStatements, ...this.statements]);

		function modulePath(mod: string) {
			const sourcePath = resolve(modDir, filePath);
			const destPath = resolve(modDir, mod);
			const sourceDirectory = sourcePath.split('/').slice(0, -1).join('/');
			const relativePath = relative(sourceDirectory, destPath);
			if (mod.startsWith('./')) {
				console.log({
					sourcePath,
					destPath,
					relativePath,
				});
				return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
			}

			return mod;
		}
	}
}

async function generatePackage(path: string, name: string) {
	const modules = (await readdir(join(path, 'build', name, 'bytecode_modules')))
		.map((mod) => join(path, 'build', name, 'bytecode_modules', mod))
		.filter((mod) => mod.endsWith('.mv'));

	console.log(modules);

	const builders = await Promise.all(modules.map((mod) => ModuleBuilder.fromFile(mod)));

	for (const builder of builders) {
		if (!builder.hasTypesOrFunctions()) {
			continue;
		}

		builder.renderBCSTypes();
		builder.renderFunctions();
		const module = builder.moduleDef.module_handles[builder.moduleDef.self_module_handle_idx];
		await mkdir(`./tests/generated`, { recursive: true });
		await writeFile(
			`./tests/generated/${builder.moduleDef.identifiers[module.name]}.ts`,
			builder.toString('./', `./${builder.moduleDef.identifiers[module.name]}.ts`),
		);
	}

	const depsPath = join(path, 'build', name, 'bytecode_modules', 'dependencies');
	const depDirs = await readdir(depsPath);

	for (const dir of depDirs) {
		const modules = await readdir(join(depsPath, dir));

		for (const modFile of modules) {
			const builder = await ModuleBuilder.fromFile(join(depsPath, dir, modFile));

			if (!builder.hasBcsTypes()) {
				continue;
			}

			const module = builder.moduleDef.module_handles[builder.moduleDef.self_module_handle_idx];
			const moduleName = builder.moduleDef.identifiers[module.name];
			const moduleAddress = normalizeSuiAddress(
				builder.moduleDef.address_identifiers[module.address],
			);
			builder.renderBCSTypes();
			await mkdir(`./tests/generated/deps/${moduleAddress}`, { recursive: true });
			await writeFile(
				`./tests/generated/deps/${moduleAddress}/${moduleName}.ts`,
				builder.toString('./', `./deps/${moduleAddress}/${moduleName}.ts`),
			);
		}
	}
}

Promise.all(
	['paywalrus', 'wal', 'wal_exchange', 'walrus'].map((name) =>
		generatePackage(join(__dirname, '..', 'tests', 'move', name), name),
	),
).then(console.log, console.error);
