// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { parsers } from 'prettier/plugins/typescript';

type AstNode = {
	type: string;
	[key: string]: unknown;
};

type Scope = {
	parent: Scope | null;
	kind: 'block' | 'function' | 'program';
	bindings: Map<string, Binding>;
	invalidBindings: Set<string>;
	opaque?: boolean;
};

type ConstBinding = {
	kind: 'const';
	initializer: AstNode;
	scope: Scope;
};

type Binding = ConstBinding | { kind: 'unsupported' };

type TypeScriptParser = {
	parse: (text: string, options: { filepath: string }) => AstNode | Promise<AstNode>;
};

type ExtractionBudget = {
	astNodes: number;
	candidates: number;
	evaluations: number;
	resolvedCharacters: number;
};

type ResolvedBinding = { value: string };
type EvaluationResult =
	{ status: 'resolved'; value: string } | { status: 'permanent' } | { status: 'transient' };

const typescriptParser = parsers.typescript as unknown as TypeScriptParser;

// Bounds keep AST-assisted extraction from adding unbounded work beyond the regex fallback.
export const MAX_AST_SOURCE_CHARACTERS = 100_000;
export const MAX_AST_SOURCE_BYTES = 100_000;
export const MAX_AST_NODES = 100_000;
export const MAX_AST_CANDIDATES = 10_000;
export const MAX_AST_EVALUATIONS = 2_000;
export const MAX_AST_RESOLVED_CHARACTERS = 1_000_000;
export const MAX_RESOLVED_STRING_LENGTH = 100_000;
const MAX_EVALUATION_DEPTH = 100;
const NON_CHILD_KEYS = new Set(['comments', 'loc', 'parent', 'range', 'tokens']);
const TRANSPARENT_EXPRESSION_TYPES = new Set([
	'ParenthesizedExpression',
	'TSAsExpression',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
]);
const FUNCTION_NODE_TYPES = new Set([
	'ArrowFunctionExpression',
	'FunctionDeclaration',
	'FunctionExpression',
]);
const METHOD_NODE_TYPES = new Set(['MethodDefinition', 'TSAbstractMethodDefinition']);

/**
 * Extracts strings represented by safe, same-file constant expressions.
 *
 * The accepted expression grammar is intentionally small. It does not execute code or resolve
 * anything outside of the parsed file. Budget exhaustion throws so the caller can retain only the
 * regex results for the file.
 */
export async function extractLocalConstantStrings(content: string, filepath: string) {
	if (
		content.length > MAX_AST_SOURCE_CHARACTERS ||
		Buffer.byteLength(content, 'utf8') > MAX_AST_SOURCE_BYTES
	) {
		return new Set<string>();
	}

	const root = await typescriptParser.parse(content, { filepath });
	if (!isAstNode(root)) return new Set<string>();

	const budget: ExtractionBudget = {
		astNodes: MAX_AST_NODES,
		candidates: MAX_AST_CANDIDATES,
		evaluations: MAX_AST_EVALUATIONS,
		resolvedCharacters: MAX_AST_RESOLVED_CHARACTERS,
	};
	const nodeScopes = new WeakMap<AstNode, Scope>();
	const candidates: AstNode[] = [];
	const rootScope = createScope(null, 'program');
	buildScopes(root, rootScope, nodeScopes, candidates, budget);

	const bindingValues = new WeakMap<ConstBinding, ResolvedBinding>();
	const permanentlyUnresolved = new WeakSet<ConstBinding>();
	const strings = new Set<string>();

	for (const candidate of candidates) {
		const scope = nodeScopes.get(candidate);
		if (!scope) continue;

		const result = evaluateString(
			candidate,
			scope,
			nodeScopes,
			bindingValues,
			permanentlyUnresolved,
			new Set(),
			budget,
			0,
		);
		if (result.status !== 'resolved') continue;

		strings.add(result.value);
	}

	return strings;
}

function createScope(parent: Scope | null, kind: Scope['kind'], opaque = false): Scope {
	return { parent, kind, bindings: new Map(), invalidBindings: new Set(), opaque };
}

function collectCandidate(
	parent: AstNode,
	child: AstNode,
	key: string,
	candidates: AstNode[],
	budget: ExtractionBudget,
) {
	if (
		(parent.type === 'VariableDeclarator' && key === 'init') ||
		(parent.type === 'AssignmentPattern' && key === 'right') ||
		(parent.type === 'TaggedTemplateExpression' && key === 'quasi') ||
		isSafeStringExpression(parent) ||
		parent.type === 'ConditionalExpression' ||
		parent.type === 'LogicalExpression'
	) {
		return;
	}

	if (isSafeStringExpression(child)) addCandidate(child, candidates, budget);
}

function addCandidate(node: AstNode, candidates: AstNode[], budget: ExtractionBudget) {
	consumeBudget(budget, 'candidates');
	candidates.push(node);
}

function isSafeStringExpression(node: AstNode) {
	return (
		node.type === 'Literal' ||
		node.type === 'StringLiteral' ||
		node.type === 'TemplateLiteral' ||
		node.type === 'Identifier' ||
		(node.type === 'BinaryExpression' && node.operator === '+') ||
		TRANSPARENT_EXPRESSION_TYPES.has(node.type)
	);
}

function buildScopes(
	node: AstNode,
	scope: Scope,
	nodeScopes: WeakMap<AstNode, Scope>,
	candidates: AstNode[],
	budget: ExtractionBudget,
) {
	consumeBudget(budget, 'astNodes');

	if (METHOD_NODE_TYPES.has(node.type)) {
		buildMethodScopes(node, scope, nodeScopes, candidates, budget);
		return;
	}

	if (FUNCTION_NODE_TYPES.has(node.type)) {
		buildFunctionScope(node, scope, nodeScopes, candidates, budget);
		return;
	}

	switch (node.type) {
		case 'Program':
			nodeScopes.set(node, scope);
			visitChildrenInScope(node, scope, nodeScopes, candidates, budget);
			return;
		case 'BlockStatement': {
			const blockScope = createScope(scope, 'block');
			nodeScopes.set(node, blockScope);
			visitChildrenInScope(node, blockScope, nodeScopes, candidates, budget);
			return;
		}
		case 'StaticBlock':
		case 'TSModuleBlock': {
			const boundaryScope = createScope(scope, 'function');
			nodeScopes.set(node, boundaryScope);
			visitChildrenInScope(node, boundaryScope, nodeScopes, candidates, budget);
			return;
		}
		case 'SwitchStatement':
			buildSwitchScopes(node, scope, nodeScopes, candidates, budget);
			return;
		case 'ForInStatement':
		case 'ForOfStatement':
		case 'ForStatement': {
			const loopScope = createScope(scope, 'block');
			nodeScopes.set(node, loopScope);
			visitChildrenInScope(node, loopScope, nodeScopes, candidates, budget);
			return;
		}
		case 'CatchClause': {
			const catchScope = createScope(scope, 'block');
			nodeScopes.set(node, catchScope);
			if (isAstNode(node.param)) registerPattern(node.param, catchScope);
			visitChildrenInScope(node, catchScope, nodeScopes, candidates, budget);
			return;
		}
		case 'WithStatement':
			buildWithScopes(node, scope, nodeScopes, candidates, budget);
			return;
		case 'ClassDeclaration':
		case 'ClassExpression':
			buildClassScope(node, scope, nodeScopes, candidates, budget);
			return;
		case 'VariableDeclaration':
			nodeScopes.set(node, scope);
			registerVariableDeclaration(node, scope);
			collectConstInitializerCandidates(node, candidates, budget);
			visitChildrenInScope(node, scope, nodeScopes, candidates, budget);
			return;
		case 'ImportDeclaration':
			nodeScopes.set(node, scope);
			registerImportBindings(node, scope);
			visitChildrenInScope(node, scope, nodeScopes, candidates, budget);
			return;
		case 'TSImportEqualsDeclaration':
			nodeScopes.set(node, scope);
			if (node.importKind !== 'type') registerNamedUnsupportedBinding(node, scope);
			visitChildrenInScope(node, scope, nodeScopes, candidates, budget);
			return;
		case 'TSEnumDeclaration':
		case 'TSModuleDeclaration':
			nodeScopes.set(node, scope);
			registerNamedUnsupportedBinding(node, scope);
			visitChildrenInScope(node, scope, nodeScopes, candidates, budget);
			return;
		default:
			nodeScopes.set(node, scope);
			visitChildrenInScope(node, scope, nodeScopes, candidates, budget);
	}
}

function visitChildrenInScope(
	node: AstNode,
	scope: Scope,
	nodeScopes: WeakMap<AstNode, Scope>,
	candidates: AstNode[],
	budget: ExtractionBudget,
) {
	visitChildren(node, (child, key) => {
		collectCandidate(node, child, key, candidates, budget);
		buildScopes(child, scope, nodeScopes, candidates, budget);
	});
}

function visitChildInScope(
	parent: AstNode,
	child: AstNode,
	key: string,
	scope: Scope,
	nodeScopes: WeakMap<AstNode, Scope>,
	candidates: AstNode[],
	budget: ExtractionBudget,
) {
	collectCandidate(parent, child, key, candidates, budget);
	buildScopes(child, scope, nodeScopes, candidates, budget);
}

function buildSwitchScopes(
	node: AstNode,
	parentScope: Scope,
	nodeScopes: WeakMap<AstNode, Scope>,
	candidates: AstNode[],
	budget: ExtractionBudget,
) {
	nodeScopes.set(node, parentScope);
	if (isAstNode(node.discriminant)) {
		visitChildInScope(
			node,
			node.discriminant,
			'discriminant',
			parentScope,
			nodeScopes,
			candidates,
			budget,
		);
	}

	const switchScope = createScope(parentScope, 'block');
	if (Array.isArray(node.cases)) {
		for (const switchCase of node.cases) {
			if (!isAstNode(switchCase)) continue;
			visitChildInScope(node, switchCase, 'cases', switchScope, nodeScopes, candidates, budget);
		}
	}
}

function buildWithScopes(
	node: AstNode,
	parentScope: Scope,
	nodeScopes: WeakMap<AstNode, Scope>,
	candidates: AstNode[],
	budget: ExtractionBudget,
) {
	nodeScopes.set(node, parentScope);
	if (isAstNode(node.object)) {
		visitChildInScope(node, node.object, 'object', parentScope, nodeScopes, candidates, budget);
	}
	if (isAstNode(node.body)) {
		const withScope = createScope(parentScope, 'block', true);
		visitChildInScope(node, node.body, 'body', withScope, nodeScopes, candidates, budget);
	}
}

function buildFunctionScope(
	node: AstNode,
	parentScope: Scope,
	nodeScopes: WeakMap<AstNode, Scope>,
	candidates: AstNode[],
	budget: ExtractionBudget,
) {
	if (node.type === 'FunctionDeclaration') registerNamedUnsupportedBinding(node, parentScope);

	const parameterScope = createScope(parentScope, 'block');
	const functionScope = createScope(parameterScope, 'function');
	nodeScopes.set(node, parameterScope);
	registerNamedUnsupportedBinding(node, parameterScope);
	registerParameters(node, parameterScope);
	visitFunctionChildren(node, parameterScope, functionScope, nodeScopes, candidates, budget);
}

function buildMethodScopes(
	node: AstNode,
	parentScope: Scope,
	nodeScopes: WeakMap<AstNode, Scope>,
	candidates: AstNode[],
	budget: ExtractionBudget,
) {
	nodeScopes.set(node, parentScope);

	// Decorators and computed keys execute in the enclosing class scope, before parameters exist.
	if (Array.isArray(node.decorators)) {
		for (const decorator of node.decorators) {
			if (!isAstNode(decorator)) continue;
			collectCandidate(node, decorator, 'decorators', candidates, budget);
			buildScopes(decorator, parentScope, nodeScopes, candidates, budget);
		}
	}
	if (node.computed === true && isAstNode(node.key)) {
		collectCandidate(node, node.key, 'key', candidates, budget);
		buildScopes(node.key, parentScope, nodeScopes, candidates, budget);
	}

	const methodNode = isAstNode(node.value) ? node.value : node;
	const parameterScope = createScope(parentScope, 'block');
	const functionScope = createScope(parameterScope, 'function');
	if (methodNode !== node) {
		consumeBudget(budget, 'astNodes');
		nodeScopes.set(methodNode, parameterScope);
	}
	registerParameters(methodNode, parameterScope);
	visitParameterDecorators(methodNode, parentScope, nodeScopes, candidates, budget);
	visitFunctionChildren(
		methodNode,
		parameterScope,
		functionScope,
		nodeScopes,
		candidates,
		budget,
		node,
	);
}

function visitFunctionChildren(
	functionNode: AstNode,
	parameterScope: Scope,
	functionScope: Scope,
	nodeScopes: WeakMap<AstNode, Scope>,
	candidates: AstNode[],
	budget: ExtractionBudget,
	methodNode?: AstNode,
) {
	visitChildren(functionNode, (child, key) => {
		if (functionNode === methodNode && (key === 'decorators' || key === 'key')) return;
		if (key === 'params') {
			visitParameterWithoutDecorators(child, parameterScope, nodeScopes, candidates, budget);
			return;
		}
		visitChildInScope(
			functionNode,
			child,
			key,
			key === 'body' ? functionScope : parameterScope,
			nodeScopes,
			candidates,
			budget,
		);
	});
}

function visitParameterDecorators(
	methodNode: AstNode,
	parentScope: Scope,
	nodeScopes: WeakMap<AstNode, Scope>,
	candidates: AstNode[],
	budget: ExtractionBudget,
) {
	if (!Array.isArray(methodNode.params)) return;

	for (const parameter of methodNode.params) {
		if (!isAstNode(parameter)) continue;
		const decorators = getParameterDecorators(parameter);
		const decoratorParent = getParameterDecoratorParent(parameter);
		for (const decorator of decorators) {
			visitChildInScope(
				decoratorParent,
				decorator,
				'decorators',
				parentScope,
				nodeScopes,
				candidates,
				budget,
			);
		}
	}
}

function getParameterDecorators(parameter: AstNode) {
	if (Array.isArray(parameter.decorators)) return parameter.decorators.filter(isAstNode);
	const innerParameter = getInnerParameter(parameter);
	return innerParameter && Array.isArray(innerParameter.decorators)
		? innerParameter.decorators.filter(isAstNode)
		: [];
}

function getParameterDecoratorParent(parameter: AstNode) {
	return getInnerParameter(parameter) ?? parameter;
}

function getInnerParameter(parameter: AstNode) {
	return parameter.type === 'TSParameterProperty' && isAstNode(parameter.parameter)
		? parameter.parameter
		: undefined;
}

function visitParameterWithoutDecorators(
	parameter: AstNode,
	parameterScope: Scope,
	nodeScopes: WeakMap<AstNode, Scope>,
	candidates: AstNode[],
	budget: ExtractionBudget,
) {
	consumeBudget(budget, 'astNodes');
	nodeScopes.set(parameter, parameterScope);
	visitChildren(parameter, (child, key) => {
		if (key === 'decorators') return;
		if (parameter.type === 'TSParameterProperty' && key === 'parameter') {
			visitParameterWithoutDecorators(child, parameterScope, nodeScopes, candidates, budget);
			return;
		}
		visitChildInScope(parameter, child, key, parameterScope, nodeScopes, candidates, budget);
	});
}

function buildClassScope(
	node: AstNode,
	parentScope: Scope,
	nodeScopes: WeakMap<AstNode, Scope>,
	candidates: AstNode[],
	budget: ExtractionBudget,
) {
	if (node.type === 'ClassDeclaration') registerNamedUnsupportedBinding(node, parentScope);

	const classScope = createScope(parentScope, 'block');
	nodeScopes.set(node, classScope);
	registerNamedUnsupportedBinding(node, classScope);
	visitChildrenInScope(node, classScope, nodeScopes, candidates, budget);
}

function registerParameters(node: AstNode, scope: Scope) {
	if (!Array.isArray(node.params)) return;

	for (const parameter of node.params) {
		if (isAstNode(parameter)) registerPattern(parameter, scope);
	}
}

function collectConstInitializerCandidates(
	node: AstNode,
	candidates: AstNode[],
	budget: ExtractionBudget,
) {
	if (node.kind !== 'const' || !Array.isArray(node.declarations)) return;

	for (const declaration of node.declarations) {
		if (!isAstNode(declaration) || !isAstNode(declaration.init)) continue;
		addCandidate(declaration.init, candidates, budget);
	}
}

function registerVariableDeclaration(node: AstNode, scope: Scope) {
	if (!Array.isArray(node.declarations)) return;

	const declarationScope = node.kind === 'var' ? nearestFunctionScope(scope) : scope;
	for (const declaration of node.declarations) {
		if (!isAstNode(declaration) || !isAstNode(declaration.id)) continue;

		if (
			node.kind === 'const' &&
			declaration.id.type === 'Identifier' &&
			typeof declaration.id.name === 'string' &&
			isAstNode(declaration.init)
		) {
			setBinding(declarationScope, declaration.id.name, {
				kind: 'const',
				initializer: declaration.init,
				scope,
			});
		} else {
			registerPattern(declaration.id, declarationScope);
		}
	}
}

function registerImportBindings(node: AstNode, scope: Scope) {
	if (node.importKind === 'type' || !Array.isArray(node.specifiers)) return;

	for (const specifier of node.specifiers) {
		if (!isAstNode(specifier) || specifier.importKind === 'type' || !isAstNode(specifier.local)) {
			continue;
		}
		registerPattern(specifier.local, scope);
	}
}

function registerNamedUnsupportedBinding(node: AstNode, scope: Scope) {
	const identifier = isAstNode(node.id) ? node.id : isAstNode(node.name) ? node.name : undefined;
	if (!identifier || identifier.type !== 'Identifier' || typeof identifier.name !== 'string')
		return;

	setBinding(scope, identifier.name, { kind: 'unsupported' });
}

function registerPattern(pattern: AstNode, scope: Scope) {
	switch (pattern.type) {
		case 'Identifier':
			if (typeof pattern.name === 'string') {
				setBinding(scope, pattern.name, { kind: 'unsupported' });
			}
			return;
		case 'AssignmentPattern':
			if (isAstNode(pattern.left)) registerPattern(pattern.left, scope);
			return;
		case 'RestElement':
			if (isAstNode(pattern.argument)) registerPattern(pattern.argument, scope);
			return;
		case 'TSParameterProperty':
			if (isAstNode(pattern.parameter)) registerPattern(pattern.parameter, scope);
			return;
		case 'ArrayPattern':
			if (Array.isArray(pattern.elements)) {
				for (const element of pattern.elements) {
					if (isAstNode(element)) registerPattern(element, scope);
				}
			}
			return;
		case 'ObjectPattern':
			if (Array.isArray(pattern.properties)) {
				for (const property of pattern.properties) {
					if (!isAstNode(property)) continue;
					if (property.type === 'RestElement' && isAstNode(property.argument)) {
						registerPattern(property.argument, scope);
					} else if (isAstNode(property.value)) {
						registerPattern(property.value, scope);
					}
				}
			}
	}
}

function setBinding(scope: Scope, name: string, binding: Binding) {
	// Duplicate value declarations are invalid or ambiguous. Treat them conservatively and
	// deterministically without allowing type-only declarations to interfere.
	if (scope.bindings.has(name)) {
		scope.invalidBindings.add(name);
		scope.bindings.set(name, { kind: 'unsupported' });
	} else {
		scope.bindings.set(name, binding);
	}
}

function nearestFunctionScope(scope: Scope) {
	let current = scope;
	while (current.kind === 'block' && current.parent) current = current.parent;
	return current;
}

function evaluateString(
	node: AstNode,
	scope: Scope,
	nodeScopes: WeakMap<AstNode, Scope>,
	bindingValues: WeakMap<ConstBinding, ResolvedBinding>,
	permanentlyUnresolved: WeakSet<ConstBinding>,
	visiting: Set<ConstBinding>,
	budget: ExtractionBudget,
	depth: number,
): EvaluationResult {
	consumeBudget(budget, 'evaluations');
	if (depth > MAX_EVALUATION_DEPTH) return { status: 'transient' };

	if (
		(node.type === 'Literal' || node.type === 'StringLiteral') &&
		typeof node.value === 'string'
	) {
		if (node.value.length > MAX_RESOLVED_STRING_LENGTH) return { status: 'permanent' };
		consumeBudget(budget, 'resolvedCharacters', node.value.length);
		return { status: 'resolved', value: node.value };
	}

	if (node.type === 'TemplateLiteral') {
		return evaluateTemplate(
			node,
			scope,
			nodeScopes,
			bindingValues,
			permanentlyUnresolved,
			visiting,
			budget,
			depth,
		);
	}

	if (node.type === 'BinaryExpression' && node.operator === '+') {
		if (!isAstNode(node.left) || !isAstNode(node.right)) return { status: 'permanent' };
		const left = evaluateChild(
			node.left,
			scope,
			nodeScopes,
			bindingValues,
			permanentlyUnresolved,
			visiting,
			budget,
			depth,
		);
		if (left.status !== 'resolved') return left;
		const right = evaluateChild(
			node.right,
			scope,
			nodeScopes,
			bindingValues,
			permanentlyUnresolved,
			visiting,
			budget,
			depth,
		);
		if (right.status !== 'resolved') return right;
		if (left.value.length + right.value.length > MAX_RESOLVED_STRING_LENGTH) {
			return { status: 'permanent' };
		}
		const value = left.value + right.value;
		consumeBudget(budget, 'resolvedCharacters', value.length);
		return { status: 'resolved', value };
	}

	if (node.type === 'Identifier' && typeof node.name === 'string') {
		return evaluateIdentifier(
			node.name,
			scope,
			nodeScopes,
			bindingValues,
			permanentlyUnresolved,
			visiting,
			budget,
			depth,
		);
	}

	if (TRANSPARENT_EXPRESSION_TYPES.has(node.type) && isAstNode(node.expression)) {
		return evaluateChild(
			node.expression,
			scope,
			nodeScopes,
			bindingValues,
			permanentlyUnresolved,
			visiting,
			budget,
			depth,
		);
	}

	return { status: 'permanent' };
}

function evaluateTemplate(
	node: AstNode,
	scope: Scope,
	nodeScopes: WeakMap<AstNode, Scope>,
	bindingValues: WeakMap<ConstBinding, ResolvedBinding>,
	permanentlyUnresolved: WeakSet<ConstBinding>,
	visiting: Set<ConstBinding>,
	budget: ExtractionBudget,
	depth: number,
): EvaluationResult {
	if (!Array.isArray(node.quasis) || !Array.isArray(node.expressions)) {
		return { status: 'permanent' };
	}
	if (node.quasis.length !== node.expressions.length + 1) return { status: 'permanent' };

	let result = '';
	for (let index = 0; index < node.quasis.length; index++) {
		const quasi = node.quasis[index];
		if (!isAstNode(quasi) || !isRecord(quasi.value) || typeof quasi.value.cooked !== 'string') {
			return { status: 'permanent' };
		}

		if (result.length + quasi.value.cooked.length > MAX_RESOLVED_STRING_LENGTH) {
			return { status: 'permanent' };
		}
		result += quasi.value.cooked;
		consumeBudget(budget, 'resolvedCharacters', quasi.value.cooked.length);

		const expression = node.expressions[index];
		if (expression === undefined) continue;
		if (!isAstNode(expression)) return { status: 'permanent' };

		const value = evaluateChild(
			expression,
			scope,
			nodeScopes,
			bindingValues,
			permanentlyUnresolved,
			visiting,
			budget,
			depth,
		);
		if (value.status !== 'resolved') return value;
		if (result.length + value.value.length > MAX_RESOLVED_STRING_LENGTH) {
			return { status: 'permanent' };
		}
		result += value.value;
		consumeBudget(budget, 'resolvedCharacters', value.value.length);
	}

	return { status: 'resolved', value: result };
}

function evaluateChild(
	node: AstNode,
	fallbackScope: Scope,
	nodeScopes: WeakMap<AstNode, Scope>,
	bindingValues: WeakMap<ConstBinding, ResolvedBinding>,
	permanentlyUnresolved: WeakSet<ConstBinding>,
	visiting: Set<ConstBinding>,
	budget: ExtractionBudget,
	depth: number,
) {
	return evaluateString(
		node,
		nodeScopes.get(node) ?? fallbackScope,
		nodeScopes,
		bindingValues,
		permanentlyUnresolved,
		visiting,
		budget,
		depth + 1,
	);
}

function evaluateIdentifier(
	name: string,
	scope: Scope,
	nodeScopes: WeakMap<AstNode, Scope>,
	bindingValues: WeakMap<ConstBinding, ResolvedBinding>,
	permanentlyUnresolved: WeakSet<ConstBinding>,
	visiting: Set<ConstBinding>,
	budget: ExtractionBudget,
	depth: number,
): EvaluationResult {
	const binding = findBinding(scope, name);
	if (!binding || binding.kind !== 'const') return { status: 'permanent' };

	const cached = bindingValues.get(binding);
	if (cached !== undefined) {
		consumeBudget(budget, 'resolvedCharacters', cached.value.length);
		return { status: 'resolved', ...cached };
	}
	if (permanentlyUnresolved.has(binding)) return { status: 'permanent' };
	if (visiting.has(binding)) return { status: 'transient' };

	visiting.add(binding);
	const result = evaluateString(
		binding.initializer,
		nodeScopes.get(binding.initializer) ?? binding.scope,
		nodeScopes,
		bindingValues,
		permanentlyUnresolved,
		visiting,
		budget,
		depth + 1,
	);
	visiting.delete(binding);

	if (result.status === 'resolved') bindingValues.set(binding, { value: result.value });
	if (result.status === 'permanent') permanentlyUnresolved.add(binding);
	return result;
}

function findBinding(scope: Scope, name: string) {
	let current: Scope | null = scope;
	while (current) {
		if (current.invalidBindings.has(name)) return undefined;
		const binding = current.bindings.get(name);
		if (binding) return binding;
		if (current.opaque) return undefined;
		current = current.parent;
	}
	return undefined;
}

function consumeBudget(budget: ExtractionBudget, key: keyof ExtractionBudget, amount: number = 1) {
	budget[key] -= amount;
	if (budget[key] < 0) throw new Error(`AST ${key} limit exceeded`);
}

function visitChildren(node: AstNode, callback: (child: AstNode, key: string) => void) {
	for (const [key, value] of Object.entries(node)) {
		if (NON_CHILD_KEYS.has(key)) continue;

		if (isAstNode(value)) {
			callback(value, key);
		} else if (Array.isArray(value)) {
			for (const child of value) {
				if (isAstNode(child)) callback(child, key);
			}
		}
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object';
}

function isAstNode(value: unknown): value is AstNode {
	return isRecord(value) && typeof value.type === 'string';
}
