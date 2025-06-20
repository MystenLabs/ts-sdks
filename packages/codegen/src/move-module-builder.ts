// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { FileBuilder } from './file-builder.js';
import { readFile } from 'node:fs/promises';
import { deserialize } from '@mysten/move-bytecode-template';
import { getSafeName, renderTypeSignature, SUI_FRAMEWORK_ADDRESS } from './render-types.js';
import { formatComment, mapToObject, parseTS, withComment } from './utils.js';
import type { Fields, ModuleSummary, Type, TypeParameter } from './types/summary.js';
import { summaryFromDeserializedModule } from './summary.js';
import type { DeserializedModule } from './types/deserialized.js';
import { join } from 'node:path';

export class MoveModuleBuilder extends FileBuilder {
	summary: ModuleSummary;
	#depsDir = './deps';
	#addressMappings: Record<string, string>;
	#includedTypes: Set<string> = new Set();

	constructor({
		summary,
		addressMappings = {},
	}: {
		summary: ModuleSummary;
		addressMappings?: Record<string, string>;
	}) {
		super();
		this.summary = summary;
		this.#addressMappings = addressMappings;
	}

	static async fromBytecodeFile(file: string) {
		const bytes = await readFile(file);
		const deserialized: DeserializedModule = deserialize(bytes);

		const builder = new MoveModuleBuilder({
			summary: summaryFromDeserializedModule(deserialized),
		});

		return builder;
	}

	static async fromSummaryFile(file: string, addressMappings: Record<string, string>) {
		const summary = JSON.parse(await readFile(file, 'utf-8'));

		return new MoveModuleBuilder({
			summary,
			addressMappings,
		});
	}

	#resolveAddress(address: string) {
		return this.#addressMappings[address] ?? address;
	}

	override async getHeader() {
		if (!this.summary.doc) {
			return super.getHeader();
		}

		return `${await super.getHeader()}\n\n/*${await formatComment(this.summary.doc)}*/\n\n`;
	}

	includeType(name: string, moduleBuilders: Record<string, MoveModuleBuilder>) {
		if (this.#includedTypes.has(name)) {
			return;
		}

		this.#includedTypes.add(name);

		const struct = this.summary.structs[name];
		const enum_ = this.summary.enums[name];

		if (!struct && !enum_) {
			throw new Error(
				`Type ${name} not found in ${this.summary.id.address}::${this.summary.id.name}`,
			);
		}

		if (struct) {
			Object.values(struct.fields.fields).forEach((field) => {
				renderTypeSignature(field.type_, {
					format: 'bcs',
					summary: this.summary,
					typeParameters: struct.type_parameters,
					resolveAddress: (address) => this.#resolveAddress(address),
					onDependency: (address, mod, name) => {
						const builder = moduleBuilders[`${address}::${mod}`];

						if (!builder) {
							throw new Error(`Module builder not found for ${address}::${mod}`);
						}

						builder.includeType(name, moduleBuilders);
					},
				});
			});
		}

		if (enum_) {
			Object.values(enum_.variants).forEach((variant) => {
				Object.values(variant.fields.fields).forEach((field) => {
					renderTypeSignature(field.type_, {
						format: 'bcs',
						summary: this.summary,
						typeParameters: enum_.type_parameters,
						resolveAddress: (address) => this.#resolveAddress(address),
						onDependency: (address, mod, name) => {
							const builder = moduleBuilders[`${address}::${mod}`];

							if (!builder) {
								throw new Error(`Module builder not found for ${address}::${mod}`);
							}

							builder.includeType(name, moduleBuilders);
						},
					});
				});
			});
		}
	}

	includeAllTypes(moduleBuilders: Record<string, MoveModuleBuilder>) {
		Object.keys(this.summary.structs).forEach((name) => this.includeType(name, moduleBuilders));
		Object.keys(this.summary.enums).forEach((name) => this.includeType(name, moduleBuilders));
	}

	async renderBCSTypes() {
		if (this.hasBcsTypes()) {
			this.addImport('@mysten/sui/bcs', 'bcs');
		}
		await this.renderStructs();
		await this.renderEnums();
	}

	hasBcsTypes() {
		return this.#includedTypes.size > 0;
	}

	hasFunctions() {
		return Object.values(this.summary.functions).some(
			(func) => func.visibility === 'Public' && !func.macro_,
		);
	}

	hasTypesOrFunctions() {
		return this.hasBcsTypes() || this.hasFunctions();
	}

	async #renderFieldsAsStruct(
		name: string,
		{ fields }: Fields,
		typeParameters: TypeParameter[] = [],
	) {
		const fieldObject = await mapToObject({
			items: Object.entries(fields),
			getComment: ([_name, field]) => field.doc,
			mapper: ([name, field]) => [
				name,
				renderTypeSignature(field.type_, {
					format: 'bcs',
					summary: this.summary,
					typeParameters,
					resolveAddress: (address) => this.#resolveAddress(address),
					onDependency: (address, mod) => {
						if (address !== this.summary.id.address || mod !== this.summary.id.name) {
							this.addStarImport(
								address === this.summary.id.address
									? `./${mod}.js`
									: join(`~root`, this.#depsDir, `${address}/${mod}.js`),
								mod,
							);
						}
					},
				}),
			],
		});

		return parseTS/* ts */ `bcs.struct('${name}', ${fieldObject})`;
	}

	async #renderFieldsAsTuple(
		name: string,
		{ fields }: Fields,
		typeParameters: TypeParameter[] = [],
	) {
		const values = Object.values(fields).map((field) =>
			renderTypeSignature(field.type_, {
				format: 'bcs',
				summary: this.summary,
				typeParameters,
				resolveAddress: (address) => this.#resolveAddress(address),
				onDependency: (address, mod) =>
					this.addStarImport(
						address === this.summary.id.address ? `./${mod}.js` : `~root/deps/${address}/${mod}.js`,
						mod,
					),
			}),
		);

		return parseTS/* ts */ `bcs.tuple([${values.join(', ')}], { name: '${name}' })`;
	}

	async renderStructs() {
		for (const [name, struct] of Object.entries(this.summary.structs)) {
			if (!this.#includedTypes.has(name)) {
				continue;
			}

			this.exports.push(name);

			const params = struct.type_parameters.filter((param) => !param.phantom);

			if (params.length === 0) {
				this.statements.push(
					...parseTS/* ts */ `export function ${name}() {
						return ${
							struct.fields.positional_fields
								? await this.#renderFieldsAsTuple(name, struct.fields, struct.type_parameters)
								: await this.#renderFieldsAsStruct(name, struct.fields, struct.type_parameters)
						}
					}`,
				);
			} else {
				this.addImport('@mysten/sui/bcs', 'type BcsType');

				const typeParams = `...typeParameters: [${params.map((param, i) => param.name ?? `T${i}`).join(', ')}]`;
				const typeGenerics = `${params.map((param, i) => `${param.name ?? `T${i}`} extends BcsType<any>`).join(', ')}`;

				this.statements.push(
					...(await withComment(
						struct,
						parseTS/* ts */ `export function ${name}<${typeGenerics}>(${typeParams}) {
						return ${
							struct.fields.positional_fields
								? await this.#renderFieldsAsTuple(name, struct.fields, struct.type_parameters)
								: await this.#renderFieldsAsStruct(name, struct.fields, struct.type_parameters)
						}
					}`,
					)),
				);
			}
		}
	}

	async renderEnums() {
		function isPositional(fields: Fields) {
			if (fields.positional_fields === true) {
				return true;
			}

			if (Object.keys(fields.fields).every((field, i) => field === `pos${i}`)) {
				return true;
			}

			return false;
		}

		for (const [name, enumDef] of Object.entries(this.summary.enums)) {
			if (!this.#includedTypes.has(name)) {
				continue;
			}
			this.exports.push(name);

			const variantsObject = await mapToObject({
				items: Object.entries(enumDef.variants),
				getComment: ([_name, variant]) => variant.doc,
				mapper: async ([variantName, variant]) => [
					variantName,
					Object.keys(variant.fields.fields).length === 0
						? 'null'
						: isPositional(variant.fields)
							? Object.keys(variant.fields.fields).length === 1
								? renderTypeSignature(Object.values(variant.fields.fields)[0].type_, {
										format: 'bcs',
										summary: this.summary,
										typeParameters: enumDef.type_parameters,
										resolveAddress: (address) => this.#resolveAddress(address),
										onDependency: (address, mod) => {
											if (address !== this.summary.id.address || mod !== this.summary.id.name) {
												this.addStarImport(
													address === this.summary.id.address
														? `./${mod}.js`
														: `~root/deps/${address}/${mod}.js`,
													mod,
												);
											}
										},
									})
								: await this.#renderFieldsAsTuple(
										`${name}.${variantName}`,
										variant.fields,
										enumDef.type_parameters,
									)
							: await this.#renderFieldsAsStruct(
									`${name}.${variantName}`,
									variant.fields,
									enumDef.type_parameters,
								),
				],
			});

			const params = enumDef.type_parameters.filter((param) => !param.phantom);

			if (params.length === 0) {
				this.statements.push(
					...(await withComment(
						enumDef,
						parseTS/* ts */ `
					export function ${name}() {
						return bcs.enum('${name}', ${variantsObject})
					}`,
					)),
				);
			} else {
				this.addImport('@mysten/sui/bcs', 'type BcsType');

				const typeParams = `...typeParameters: [${params.map((param, i) => param.name ?? `T${i}`).join(', ')}]`;
				const typeGenerics = `${params.map((param, i) => `${param.name ?? `T${i}`} extends BcsType<any>`).join(', ')}`;

				this.statements.push(
					...(await withComment(
						enumDef,
						parseTS/* ts */ `
					export function ${name}<${typeGenerics}>(${typeParams}) {
						return bcs.enum('${name}', ${variantsObject})
					}`,
					)),
				);
			}
		}
	}

	async renderFunctions() {
		const statements = [];
		const names = [];

		if (!this.hasFunctions()) {
			return;
		}
		this.addImport('@mysten/sui/transactions', 'type Transaction');

		for (const [name, func] of Object.entries(this.summary.functions)) {
			if (func.visibility !== 'Public' || func.macro_) {
				continue;
			}

			const parameters = func.parameters.filter((param) => !this.isContextReference(param.type_));
			const fnName = getSafeName(name);

			this.addImport('~root/../utils/index.js', 'normalizeMoveArguments');
			if (parameters.length > 0) {
				this.addImport('~root/../utils/index.js', 'type RawTransactionArgument');
			}

			names.push(fnName);

			const usedTypeParameters = new Set<number | string>();

			const argumentsTypes = parameters
				.map((param) =>
					renderTypeSignature(param.type_, {
						format: 'typescriptArg',
						summary: this.summary,
						typeParameters: func.type_parameters,
						resolveAddress: (address) => this.#resolveAddress(address),
						onTypeParameter: (typeParameter) => usedTypeParameters.add(typeParameter),
					}),
				)
				.map((type, i) =>
					parameters[i].name
						? `${parameters[i].name}: RawTransactionArgument<${type}>`
						: `RawTransactionArgument<${type}>`,
				)
				.join(',\n');

			if (usedTypeParameters.size > 0) {
				this.addImport('@mysten/sui/bcs', 'type BcsType');
			}

			const filteredTypeParameters = func.type_parameters.filter(
				(param, i) =>
					usedTypeParameters.has(i) || (param.name && usedTypeParameters.has(param.name)),
			);

			statements.push(
				...(await withComment(
					func,
					parseTS/* ts */ `function
					${fnName}${
						filteredTypeParameters.length > 0
							? `<
							${filteredTypeParameters.map((param, i) => `${param.name ?? `T${i}`} extends BcsType<any>`)}
						>`
							: ''
					}(options: {
						arguments: [
						${argumentsTypes}],

						${
							func.type_parameters.length
								? `typeArguments: [${func.type_parameters.map(() => 'string').join(', ')}]`
								: ''
						}
				}) {
					const argumentsTypes = [
						${parameters
							.map((param) =>
								renderTypeSignature(param.type_, {
									format: 'typeTag',
									summary: this.summary,
									typeParameters: func.type_parameters,
									resolveAddress: (address) => this.#resolveAddress(address),
								}),
							)
							.map((tag) => (tag.includes('{') ? `\`${tag}\`` : `'${tag}'`))
							.join(',\n')}
					] satisfies string[]
					return (tx: Transaction) => tx.moveCall({
						package: packageAddress,
						module: '${this.summary.id.name}',
						function: '${name}',
						arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
						${func.type_parameters.length ? 'typeArguments: options.typeArguments' : ''}
					})
				}`,
				)),
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

	isContextReference(type: Type): boolean {
		if (typeof type === 'string') {
			return false;
		}

		if ('Reference' in type) {
			return this.isContextReference(type.Reference[1]);
		}

		if ('Datatype' in type) {
			return (
				this.#resolveAddress(type.Datatype.module.address) === SUI_FRAMEWORK_ADDRESS &&
				type.Datatype.module.name === 'tx_context' &&
				type.Datatype.name === 'TxContext'
			);
		}

		return false;
	}
}
