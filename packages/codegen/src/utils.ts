// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { format } from 'prettier';
import ts from 'typescript';
import type { Type } from './types/summary.js';
import { SUI_FRAMEWORK_ADDRESS, SUI_SYSTEM_ADDRESS } from './render-types.js';

export function printNodes(...nodes: ts.Node[]) {
	const printer = ts.createPrinter({
		removeComments: false,
	});

	return nodes
		.map((node) => printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile()))
		.join('\n');
}

type TSTemplateValue = string | number | boolean | ts.Statement[] | ts.Expression;

export function parseTS(strings: TemplateStringsArray, ...values: TSTemplateValue[]) {
	const source = strings.reduce((acc, str, i) => {
		if (typeof values[i] === 'object') {
			if (Array.isArray(values[i])) {
				return `${acc}${str}${printNodes(...values[i])}`;
			}

			return `${acc}${str}${printNodes(values[i])}`;
		}

		return `${acc}${str}${values[i] ?? ''}`;
	}, '');

	const lines = source.replace(/^\s/m, '').split('\n');
	const firstLine = lines[0];
	const indent = firstLine.match(/^\s*/)?.[0] ?? '';
	const unIndented = lines.map((line) => line.replace(indent, '')).join('\n');

	const sourceFile = ts.createSourceFile('file.ts', unIndented, ts.ScriptTarget.Latest, true);
	return [...sourceFile.statements.values()];
}

export async function mapToObject<T>({
	items,
	mapper,
	getComment,
}: {
	items: Iterable<T>;
	mapper: (
		item: T,
	) =>
		| Promise<null | [string, TSTemplateValue | TSTemplateValue]>
		| null
		| [string, TSTemplateValue | TSTemplateValue];
	getComment?: (item: T) => string | null | undefined;
}) {
	const fieldProps = await Promise.all(
		(
			await Promise.all(
				[...items].map(async (item) => {
					const mapped = await mapper(item);
					if (!mapped) {
						return null;
					}

					const [key, value] = mapped;
					return [item, key, value] as const;
				}),
			)
		)
			.filter((value) => value !== null)
			.map(([item, key, value]) => {
				const [node] = parseTS /* ts */ `({${key}: ${value}})`;

				if (!ts.isExpressionStatement(node)) {
					throw new Error('Expected Expression statement');
				}

				if (!ts.isParenthesizedExpression(node.expression)) {
					throw new Error('Expected Parenthesized Expression');
				}

				if (!ts.isObjectLiteralExpression(node.expression.expression)) {
					throw new Error('Expected Object Literal Expression');
				}

				const comment = getComment?.(item);
				return withComment({ comment }, node.expression.expression.properties[0]);
			}),
	);

	return ts.factory.createObjectLiteralExpression(fieldProps, true);
}

export async function withComment<T extends ts.Node | ts.Node[]>(
	options:
		| { comment?: string | null; doc?: never }
		| { doc?: string | null | undefined; comment?: never },
	nodes: T,
): Promise<T> {
	const comment = options.comment ?? options.doc;

	if (comment) {
		const firstNode = Array.isArray(nodes) ? nodes[0] : (nodes as ts.Node);
		ts.addSyntheticLeadingComment(
			firstNode,
			ts.SyntaxKind.MultiLineCommentTrivia,
			await formatComment(comment),
			true,
		);
	}

	return nodes;
}

export async function formatComment(text: string) {
	const lines = (
		await format(text, {
			printWidth: 80,
			semi: true,
			singleQuote: true,
			tabWidth: 2,
			trailingComma: 'all',
			useTabs: true,
			proseWrap: 'always',
			parser: 'markdown',
		})
	)
		.trim()
		.replaceAll('*/', '*\\/')
		.split('\n');

	if (lines.length === 1) return `* ${lines[0]} `;

	return `*\n${lines.map((line) => ` * ${line}`).join('\n')}\n `;
}

export function camelCase(str: string) {
	return str.replaceAll(/(?:_)([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function capitalize(str: string) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function isWellKnownObjectParameter(
	type: Type,
	resolveAddress: (address: string) => string,
) {
	if (typeof type === 'string') {
		return false;
	}

	if ('Reference' in type) {
		return isWellKnownObjectParameter(type.Reference[1], resolveAddress);
	}

	if (!('Datatype' in type)) {
		return false;
	}

	const { Datatype } = type;

	const address = resolveAddress(Datatype.module.address);
	if (address === SUI_FRAMEWORK_ADDRESS) {
		if (Datatype.module.name === 'deny_list') {
			return Datatype.name === 'DenyList';
		}

		if (Datatype.module.name === 'random') {
			return Datatype.name === 'Random';
		}

		if (Datatype.module.name === 'clock') {
			return Datatype.name === 'Clock';
		}
	}

	if (address === SUI_SYSTEM_ADDRESS) {
		if (Datatype.module.name === 'sui_system') {
			return Datatype.name === 'SuiSystemState';
		}
	}

	return false;
}
