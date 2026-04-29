// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { FileBuilder } from './file-builder.js';
import { readFile } from 'node:fs/promises';
import { ModuleRegistry } from './module-registry.js';
import {
	getSafeName,
	isSupportedRawTransactionInput,
	renderTypeSignature,
	SUI_FRAMEWORK_ADDRESS,
	SUI_SYSTEM_ADDRESS,
} from './render-types.js';
import {
	camelCase,
	capitalize,
	formatComment,
	isWellKnownObjectParameter,
	mapToObject,
	parseTS,
	withComment,
} from './utils.js';
import type { Fields, ModuleSummary, Type, TypeParameter } from './types/summary.js';
import type { FunctionsOption, ImportExtension, TypesOption } from './config.js';
import { join } from 'node:path';
import { isValidSuiObjectId } from '@mysten/sui/utils';

const IMPORT_MAP = {
	Transaction: { module: '@mysten/sui/transactions', isType: true },
	TransactionArgument: { module: '@mysten/sui/transactions', isType: true },
	BcsType: { module: '@mysten/sui/bcs', isType: true },
	bcs: { module: '@mysten/sui/bcs', isType: false },
	MoveStruct: { module: '~root/../utils/index', isType: false },
	MoveTuple: { module: '~root/../utils/index', isType: false },
	MoveEnum: { module: '~root/../utils/index', isType: false },
	normalizeMoveArguments: { module: '~root/../utils/index', isType: false },
	RawTransactionArgument: { module: '~root/../utils/index', isType: true },
} as const;

type ImportName = keyof typeof IMPORT_MAP;

export class MoveModuleBuilder extends FileBuilder {
	summary: ModuleSummary;
	readonly registry: ModuleRegistry;
	#depsDir = './deps';
	#includedTypes: Set<string> = new Set();
	#includedFunctions: Set<string> = new Set();
	#orderedTypes: string[] = [];
	#mvrNameOrAddress?: string;
	#typeOrigins?: Record<string, string>;
	#rootPackageId?: string;
	#importNames: Partial<Record<ImportName, string>> = {};
	#importExtension: ImportExtension;
	#includePhantomTypeParameters: boolean;

	constructor({
		mvrNameOrAddress,
		typeOrigins,
		rootPackageId,
		summary,
		registry,
		importExtension = '.js',
		includePhantomTypeParameters = false,
	}: {
		summary: ModuleSummary;
		registry: ModuleRegistry;
		mvrNameOrAddress?: string;
		typeOrigins?: Record<string, string>;
		rootPackageId?: string;
		importExtension?: ImportExtension;
		includePhantomTypeParameters?: boolean;
	}) {
		super();
		this.summary = summary;
		this.registry = registry;
		this.registry.register(this);
		this.#mvrNameOrAddress = mvrNameOrAddress;
		this.#typeOrigins = typeOrigins;
		this.#rootPackageId = rootPackageId;
		this.#importExtension = importExtension;
		this.#includePhantomTypeParameters = includePhantomTypeParameters;
	}

	static async fromSummaryFile(
		file: string,
		registry: ModuleRegistry,
		mvrNameOrAddress?: string,
		importExtension?: ImportExtension,
		includePhantomTypeParameters?: boolean,
		typeOrigins?: Record<string, string>,
		rootPackageId?: string,
	) {
		const summary = JSON.parse(await readFile(file, 'utf-8'));
		return new MoveModuleBuilder({
			summary,
			registry,
			mvrNameOrAddress,
			typeOrigins,
			rootPackageId,
			importExtension,
			includePhantomTypeParameters,
		});
	}

	#resolveAddress(address: string) {
		return this.registry.resolveAddress(address);
	}

	#getModuleTypeName() {
		const resolvedAddress = this.#resolveAddress(this.summary.id.address);
		if (resolvedAddress === SUI_FRAMEWORK_ADDRESS) {
			return '0x2';
		} else if (resolvedAddress === SUI_SYSTEM_ADDRESS) {
			return '0x3';
		} else if (this.#rootPackageId) {
			return this.#rootPackageId;
		} else if (this.#mvrNameOrAddress && !isValidSuiObjectId(this.#mvrNameOrAddress)) {
			return this.#mvrNameOrAddress;
		} else {
			return this.summary.id.address;
		}
	}

	#getTypePrefix(datatypeName: string): string | null {
		const originPackageId = this.#typeOrigins?.[datatypeName];
		if (originPackageId === undefined) return null;
		if (this.#resolveAddress(originPackageId) === this.#resolveAddress(this.summary.id.address)) {
			return null;
		}
		return `${originPackageId}::${this.summary.id.name}`;
	}

	#getImportName(name: ImportName): string {
		if (!this.#importNames[name]) {
			const config = IMPORT_MAP[name];
			const importSpec = config.isType ? `type ${name}` : name;
			// Add extension for relative imports (utils)
			const module = config.module.startsWith('~root')
				? `${config.module}${this.#importExtension}`
				: config.module;
			this.#importNames[name] = this.addImport(module, importSpec);
		}
		return this.#importNames[name]!;
	}

	override async getHeader() {
		if (!this.summary.doc) {
			return super.getHeader();
		}

		return `${await super.getHeader()}\n\n/*${await formatComment(this.summary.doc)}*/\n\n`;
	}

	includeFunctions(option?: FunctionsOption) {
		if (option === false) return;

		const filterByVisibility = !Array.isArray(option);
		const names = Array.isArray(option) ? option : Object.keys(this.summary.functions);
		const privateFunctions =
			typeof option === 'object' && filterByVisibility ? (option.private ?? 'entry') : 'entry';

		for (const name of names) {
			const func = this.summary.functions[name];
			if (!func) {
				throw new Error(
					`Function ${name} not found in ${this.summary.id.address}::${this.summary.id.name}`,
				);
			}

			if (func.macro_) {
				continue;
			}

			if (filterByVisibility && func.visibility !== 'Public') {
				if (privateFunctions === false) continue;
				if (privateFunctions === 'entry' && !func.entry) continue;
			}

			const safeName = getSafeName(camelCase(name));

			this.reservedNames.add(safeName);
			this.#includedFunctions.add(name);
		}
	}

	includeType(name: string) {
		if (this.#includedTypes.has(name)) {
			return;
		}

		this.#includedTypes.add(name);
		this.reservedNames.add(name);

		const struct = this.summary.structs[name];
		const enum_ = this.summary.enums[name];

		if (!struct && !enum_) {
			throw new Error(
				`Type ${name} not found in ${this.summary.id.address}::${this.summary.id.name}`,
			);
		}

		const includeFromField = (field: { type_: Type }, typeParameters: TypeParameter[]) => {
			renderTypeSignature(field.type_, {
				format: 'bcs',
				summary: this.summary,
				typeParameters,
				includePhantomTypeParameters: false,
				registry: this.registry,
				onDependency: (address, mod, depName) => {
					const builder = this.registry.getBuilder(address, mod);
					if (!builder) {
						throw new Error(`Module builder not found for ${address}::${mod}`);
					}
					builder.includeType(depName);
					return undefined;
				},
			});
		};

		if (struct) {
			Object.values(struct.fields.fields).forEach((field) =>
				includeFromField(field, struct.type_parameters),
			);
		}

		if (enum_) {
			Object.values(enum_.variants).forEach((variant) =>
				Object.values(variant.fields.fields).forEach((field) =>
					includeFromField(field, enum_.type_parameters),
				),
			);
		}

		// Add after all dependencies are included to avoid declaration order issues
		this.#orderedTypes.push(name);
	}

	includeTypes(option?: TypesOption) {
		if (option === false) return;

		const names = Array.isArray(option)
			? option
			: [...Object.keys(this.summary.structs), ...Object.keys(this.summary.enums)];

		for (const name of names) {
			this.includeType(name);
		}
	}

	async renderBCSTypes() {
		const needsModuleName =
			this.hasBcsTypes() && this.#orderedTypes.some((name) => this.#getTypePrefix(name) === null);

		if (needsModuleName) {
			this.statements.push(
				...parseTS /* ts */ `
				const $moduleName = '${this.#getModuleTypeName()}::${this.summary.id.name}';
				`,
			);
		}
		for (const name of this.#orderedTypes) {
			if (this.summary.structs[name]) {
				await this.renderStruct(name);
			} else if (this.summary.enums[name]) {
				await this.renderEnum(name);
			}
		}
	}

	hasBcsTypes() {
		return this.#includedTypes.size > 0;
	}

	hasFunctions() {
		return this.#includedFunctions.size > 0;
	}

	hasTypesOrFunctions() {
		return this.hasBcsTypes() || this.hasFunctions();
	}

	#importDependency = (address: string, mod: string): string | undefined => {
		if (address !== this.summary.id.address || mod !== this.summary.id.name) {
			return this.addStarImport(
				address === this.summary.id.address
					? `./${mod}${this.#importExtension}`
					: join(`~root`, this.#depsDir, `${address}/${mod}${this.#importExtension}`),
				mod,
			);
		}
		return undefined;
	};

	async #renderFieldsAsStruct(
		name: string,
		{ fields }: Fields,
		typeParameters: TypeParameter[] = [],
		includePhantomTypeParameters = false,
	) {
		const moveStructName = this.#getImportName('MoveStruct');
		const fieldObject = await mapToObject({
			items: Object.entries(fields),
			getComment: ([_name, field]) => field.doc,
			mapper: ([name, field]) => [
				name,
				renderTypeSignature(field.type_, {
					format: 'bcs',
					bcsImport: () => this.#getImportName('bcs'),
					summary: this.summary,
					typeParameters,
					includePhantomTypeParameters,
					registry: this.registry,
					onDependency: this.#importDependency,
				}),
			],
		});

		return parseTS /* ts */ `new ${moveStructName}({ name: \`${name}\`, fields: ${fieldObject} })`;
	}

	async #renderFieldsAsTuple(
		name: string,
		{ fields }: Fields,
		typeParameters: TypeParameter[] = [],
		includePhantomTypeParameters = false,
	) {
		const moveTupleName = this.#getImportName('MoveTuple');
		const values = Object.values(fields).map((field) =>
			renderTypeSignature(field.type_, {
				format: 'bcs',
				summary: this.summary,
				typeParameters,
				includePhantomTypeParameters,
				bcsImport: () => this.#getImportName('bcs'),
				registry: this.registry,
				onDependency: this.#importDependency,
			}),
		);

		return parseTS /* ts */ `new ${moveTupleName}({ name: \`${name}\`, fields: [${values.join(', ')}] })`;
	}

	async renderStruct(name: string) {
		if (!this.#includedTypes.has(name)) {
			return;
		}

		const struct = this.summary.structs[name];

		if (!struct) {
			throw new Error(
				`Struct ${name} not found in ${this.summary.id.address}::${this.summary.id.name}`,
			);
		}

		this.exports.push(name);

		const includePhantom = this.#includePhantomTypeParameters;
		const params = struct.type_parameters
			.map((param, i) => ({ param, originalIndex: i }))
			.filter(({ param }) => includePhantom || !param.phantom);

		const prefix = this.#getTypePrefix(name);
		const structName = prefix !== null ? `${prefix}::${name}` : `\${$moduleName}::${name}`;

		if (params.length === 0) {
			const hasPhantoms = struct.type_parameters.some((p) => p.phantom);
			const phantomPlaceholders = hasPhantoms
				? `<${struct.type_parameters.map((p, i) => `phantom ${p.name ?? `T${i}`}`).join(', ')}>`
				: '';
			this.statements.push(
				...parseTS /* ts */ `export const ${name} = ${
					struct.fields.positional_fields
						? await this.#renderFieldsAsTuple(
								`${structName}${phantomPlaceholders}`,
								struct.fields,
								struct.type_parameters,
								includePhantom,
							)
						: await this.#renderFieldsAsStruct(
								`${structName}${phantomPlaceholders}`,
								struct.fields,
								struct.type_parameters,
								includePhantom,
							)
				}`,
			);
		} else {
			const bcsTypeName = this.#getImportName('BcsType');

			const typeParams = `...typeParameters: [${params.map(({ param, originalIndex }) => param.name ?? `T${originalIndex}`).join(', ')}]`;
			const typeGenerics = `${params.map(({ param, originalIndex }) => `${param.name ?? `T${originalIndex}`} extends ${bcsTypeName}<any>`).join(', ')}`;

			let filteredIndex = 0;
			const nameGenerics = struct.type_parameters
				.map((param, i) => {
					if (!includePhantom && param.phantom) {
						return `phantom ${param.name ?? `T${i}`}`;
					}
					const idx = filteredIndex++;
					const paramName = param.name ?? `T${idx}`;
					return `\${typeParameters[${idx}].name as ${paramName}['name']}`;
				})
				.join(', ');

			this.statements.push(
				...(await withComment(
					struct,
					parseTS /* ts */ `export function ${name}<${typeGenerics}>(${typeParams}) {
						return ${
							struct.fields.positional_fields
								? await this.#renderFieldsAsTuple(
										`${structName}<${nameGenerics}>`,
										struct.fields,
										struct.type_parameters,
										includePhantom,
									)
								: await this.#renderFieldsAsStruct(
										`${structName}<${nameGenerics}>`,
										struct.fields,
										struct.type_parameters,
										includePhantom,
									)
						}
					}`,
				)),
			);
		}
	}

	async renderEnum(name: string) {
		if (!this.#includedTypes.has(name)) {
			return;
		}

		const enumDef = this.summary.enums[name];

		if (!enumDef) {
			throw new Error(
				`Enum ${name} not found in ${this.summary.id.address}::${this.summary.id.name}`,
			);
		}

		const includePhantom = this.#includePhantomTypeParameters;
		const moveEnumName = this.#getImportName('MoveEnum');
		this.exports.push(name);

		const prefix = this.#getTypePrefix(name);
		const enumName = prefix !== null ? `${prefix}::${name}` : `\${$moduleName}::${name}`;

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
									includePhantomTypeParameters: includePhantom,
									bcsImport: () => this.#getImportName('bcs'),
									registry: this.registry,
									onDependency: this.#importDependency,
								})
							: await this.#renderFieldsAsTuple(
									`${name}.${variantName}`,
									variant.fields,
									enumDef.type_parameters,
									includePhantom,
								)
						: await this.#renderFieldsAsStruct(
								`${name}.${variantName}`,
								variant.fields,
								enumDef.type_parameters,
								includePhantom,
							),
			],
		});

		const params = enumDef.type_parameters
			.map((param, i) => ({ param, originalIndex: i }))
			.filter(({ param }) => includePhantom || !param.phantom);

		if (params.length === 0) {
			const hasPhantoms = enumDef.type_parameters.some((p) => p.phantom);
			const phantomPlaceholders = hasPhantoms
				? `<${enumDef.type_parameters.map((p, i) => `phantom ${p.name ?? `T${i}`}`).join(', ')}>`
				: '';
			this.statements.push(
				...(await withComment(
					enumDef,
					parseTS /* ts */ `export const ${name} = new ${moveEnumName}({ name: \`${enumName}${phantomPlaceholders}\`, fields: ${variantsObject} })`,
				)),
			);
		} else {
			const bcsTypeName = this.#getImportName('BcsType');

			const typeParams = `...typeParameters: [${params.map(({ param, originalIndex }) => param.name ?? `T${originalIndex}`).join(', ')}]`;
			const typeGenerics = `${params.map(({ param, originalIndex }) => `${param.name ?? `T${originalIndex}`} extends ${bcsTypeName}<any>`).join(', ')}`;

			let filteredIndex = 0;
			const nameGenerics = enumDef.type_parameters
				.map((param, i) => {
					if (!includePhantom && param.phantom) {
						return `phantom ${param.name ?? `T${i}`}`;
					}
					const idx = filteredIndex++;
					const paramName = param.name ?? `T${idx}`;
					return `\${typeParameters[${idx}].name as ${paramName}['name']}`;
				})
				.join(', ');

			this.statements.push(
				...(await withComment(
					enumDef,
					parseTS /* ts */ `
					export function ${name}<${typeGenerics}>(${typeParams}) {
						return new ${moveEnumName}({ name: \`${enumName}<${nameGenerics}>\`, fields: ${variantsObject} })
					}`,
				)),
			);
		}
	}

	async renderFunctions() {
		const names = [];

		if (!this.hasFunctions()) {
			return;
		}

		const transactionTypeName = this.#getImportName('Transaction');

		for (const [name, func] of Object.entries(this.summary.functions)) {
			if (func.macro_ || !this.#includedFunctions.has(name)) {
				continue;
			}

			const parameters = func.parameters.filter((param) => !this.isContextReference(param.type_));
			const hasAllParameterNames =
				parameters.length > 0 &&
				parameters.every(
					(param, i) => param.name && parameters.findIndex((p) => p.name === param.name) === i,
				);
			const fnName = getSafeName(camelCase(name));
			const requiredParameters = parameters.filter(
				(param) =>
					!isWellKnownObjectParameter(param.type_, (address) => this.#resolveAddress(address)),
			);

			const normalizeName =
				parameters.length > 0 ? this.#getImportName('normalizeMoveArguments') : null;

			names.push(fnName);

			const usedTypeParameters = new Set<number | string>();

			const renderedArgTypes = requiredParameters.map((param) => {
				const renderOptions = {
					format: 'typescriptArg' as const,
					summary: this.summary,
					typeParameters: func.type_parameters,
					includePhantomTypeParameters: false,
					registry: this.registry,
					onTypeParameter: (typeParameter: number | string) =>
						usedTypeParameters.add(typeParameter),
				};

				return isSupportedRawTransactionInput(param.type_, renderOptions)
					? renderTypeSignature(param.type_, renderOptions)
					: null;
			});

			const anyRawInput = renderedArgTypes.some((t) => t !== null);
			const anyTransactionOnly = renderedArgTypes.some((t) => t === null);

			const rawTxArgName = anyRawInput ? this.#getImportName('RawTransactionArgument') : null;
			const transactionArgName = anyTransactionOnly
				? this.#getImportName('TransactionArgument')
				: null;

			const wrap = (type: string | null): string =>
				type === null ? transactionArgName! : `${rawTxArgName}<${type}>`;

			const argumentsTypes = renderedArgTypes
				.map((type, i) =>
					requiredParameters[i].name
						? `${camelCase(requiredParameters[i].name)}: ${wrap(type)}`
						: wrap(type),
				)
				.join(',\n');

			const bcsTypeName = usedTypeParameters.size > 0 ? this.#getImportName('BcsType') : null;

			const filteredTypeParameters = func.type_parameters
				.map((param, i) => ({ param, originalIndex: i }))
				.filter(
					({ param, originalIndex }) =>
						usedTypeParameters.has(originalIndex) ||
						(param.name && usedTypeParameters.has(param.name)),
				);

			const genericTypes =
				filteredTypeParameters.length > 0
					? `<${filteredTypeParameters.map(({ param, originalIndex }) => `${param.name ?? `T${originalIndex}`} extends ${bcsTypeName}<any>`).join(', ')}>`
					: '';
			const genericTypeArgs =
				filteredTypeParameters.length > 0
					? `<${filteredTypeParameters.map(({ param, originalIndex }) => `${param.name ?? `T${originalIndex}`}`).join(', ')}>`
					: '';

			const argumentsInterface = this.getUnusedName(
				`${capitalize(fnName.replace(/^_/, ''))}Arguments`,
			);
			if (hasAllParameterNames) {
				this.statements.push(
					...parseTS /* ts */ `export interface ${argumentsInterface}${genericTypes} {
						${argumentsTypes}
					}`,
				);
			}

			const optionsInterface = this.getUnusedName(`${capitalize(fnName.replace(/^_/, ''))}Options`);
			const requiresOptions =
				argumentsTypes.length > 0 || func.type_parameters.length > 0 || !this.#mvrNameOrAddress;

			this.statements.push(
				...parseTS /* ts */ `export interface ${optionsInterface}${genericTypes} {
					package${this.#mvrNameOrAddress ? '?: string' : ': string'}
					${argumentsTypes.length > 0 ? 'arguments: ' : 'arguments?: '}${
						hasAllParameterNames
							? `${argumentsInterface}${genericTypeArgs} | [${argumentsTypes}]`
							: `[${argumentsTypes}]`
					},
					${
						func.type_parameters.length
							? `typeArguments: [${func.type_parameters.map(() => 'string').join(', ')}]`
							: ''
					}
			}`,
			);

			this.statements.push(
				...(await withComment(
					func,
					parseTS /* ts */ `export function ${fnName}${genericTypes}(options: ${optionsInterface}${genericTypeArgs}${requiresOptions ? '' : ' = {}'}) {
					const packageAddress = options.package${this.#mvrNameOrAddress ? ` ?? '${this.#mvrNameOrAddress}'` : ''};
					${
						parameters.length > 0
							? `const argumentsTypes = [
						${parameters
							.map((param) =>
								renderTypeSignature(param.type_, {
									format: 'typeTag',
									summary: this.summary,
									typeParameters: func.type_parameters,
									includePhantomTypeParameters: false,
									registry: this.registry,
								}),
							)
							.map((tag) =>
								tag === 'null' ? 'null' : tag.includes('{') ? `\`${tag}\`` : `'${tag}'`,
							)
							.join(',\n')}
					] satisfies (string | null)[]\n`
							: ''
					}${hasAllParameterNames ? `const parameterNames = ${JSON.stringify(requiredParameters.map((param) => camelCase(param.name!)))}\n` : ''}
					return (tx: ${transactionTypeName}) => tx.moveCall({
						package: packageAddress,
						module: '${this.summary.id.name}',
						function: '${name}',
						${parameters.length > 0 ? `arguments: ${normalizeName}(options.arguments${argumentsTypes.length > 0 ? '' : ' ?? []'} , argumentsTypes${hasAllParameterNames ? `, parameterNames` : ''}),` : ''}
						${func.type_parameters.length ? 'typeArguments: options.typeArguments' : ''}
					})
				}`,
				)),
			);
		}
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

function isPositional(fields: Fields) {
	if (fields.positional_fields === true) {
		return true;
	}

	if (Object.keys(fields.fields).every((field, i) => field === `pos${i}`)) {
		return true;
	}

	return false;
}
