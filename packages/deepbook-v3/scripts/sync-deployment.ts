// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Regenerates `src/deployments/<network>.ts` from a deployment manifest in the sibling
 * `deepbookv3` checkout.
 *
 * The manifest records shared objects, coin types and the initial deployment. Read the
 * matching Predict/Sessions Published.toml records for the latest call targets and original
 * type IDs. Both sources must come from the same deployment lineage and chain.
 *
 * Use a checkout containing the latest publication metadata (currently PR #1311), not the
 * manifest's sourceCommit, which predates its creation and subsequent package upgrades.
 * --published-root can point to that deepbookv3 checkout when the manifest is stored elsewhere.
 *
 * The emitted file is not prettier-formatted, so follow with `sync-deployment:format`. They
 * are two scripts rather than one `&&` chain because pnpm appends `-- <args>` after the whole
 * chain: `sync-deployment -- --manifest <path>` sent the flag to prettier, which reformatted
 * the manifest in place, while the generator silently used the default path.
 *
 *   git -C ../../../deepbookv3 checkout <published-upgrade-ref>
 *   pnpm --filter @mysten/deepbook-v3 sync-deployment
 *   pnpm --filter @mysten/deepbook-v3 sync-deployment -- --manifest /path/to/deployment.testnet.json
 *   pnpm --filter @mysten/deepbook-v3 sync-deployment:format
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parse } from '@iarna/toml';

const DEFAULT_MANIFEST = '../../../deepbookv3/packages/predict/deployment/deployment.testnet.json';
// The two live deployments carry different schema versions — testnet v8, mainnet v9 — so this
// is a set, not a high-water mark: a manifest is only safe to read if its shape was checked,
// and silently accepting anything newer is exactly what this guard exists to prevent.
//
// v6 -> v8 re-keyed `writers.*` to `oracleDependencies.*`, dropped `writers.keeper.lifecycleCap`
// (the pool-valuation cap split), and renamed the collateral's `coinTypes` key to `usdc`. Of
// those only the `coinTypes` key is read here. v8 -> v9 adds and removes no keys at all: the two
// manifests' key sets are identical, and their `initialConfiguration.units` agree field for
// field. This script reads only `packages`, `objects`, `coinTypes`, `underlyings`,
// `initialConfiguration.units` and `sourceCommit`, all present in both.
const SUPPORTED_SCHEMA = [8, 9];

interface Manifest {
	schemaVersion: number;
	deployment: string;
	network: string;
	chainId: string;
	sourceCommit: string;
	packages: Record<string, string>;
	coinTypes: Record<string, string>;
	objects: Record<string, string>;
	underlyings: Record<string, Record<string, unknown>>;
	initialConfiguration: { units: Record<string, number> };
}

function arg(name: string): string | undefined {
	const i = process.argv.indexOf(`--${name}`);
	return i === -1 ? undefined : process.argv[i + 1];
}

/**
 * Every value below is interpolated into TypeScript source, so each one is validated and
 * then escaped with `JSON.stringify`. Raw interpolation is how a manifest value carrying a
 * quote, a backslash, a newline, or `', other: '` stops being data: it can close the string
 * literal it sits in and emit a second object key that silently wins over the real one.
 */
function lit(value: string): string {
	return JSON.stringify(value);
}

function req(obj: Record<string, unknown>, key: string, where: string): string {
	const v = obj?.[key];
	if (typeof v !== 'string' || !v) {
		throw new Error(
			`manifest ${where}.${key} must be a non-empty string, got ${JSON.stringify(v)} — ` +
				'cannot generate a partial record',
		);
	}
	return v;
}

/**
 * A free-text label. These also land in the emitted file's HEADER COMMENT, where
 * `JSON.stringify` escaping does not protect: a newline ends the comment and anything after
 * it becomes top-level code. Restrict the charset instead.
 */
function reqLabel(obj: Record<string, unknown>, key: string, where: string): string {
	const v = req(obj, key, where);
	if (!/^[\w.\-/ ]+$/.test(v)) {
		throw new Error(
			`manifest ${where}.${key} must be a plain label (letters, digits, . - _ / space), ` +
				`got ${JSON.stringify(v)} — it is emitted into a comment as well as a string`,
		);
	}
	return v;
}

/** A 32-byte object or package id. */
function reqId(obj: Record<string, unknown>, key: string, where: string): string {
	const v = req(obj, key, where);
	if (!/^0x[0-9a-f]{64}$/.test(v)) {
		throw new Error(`manifest ${where}.${key} is not a 32-byte hex id: ${JSON.stringify(v)}`);
	}
	return v;
}

/** A fully qualified Move type tag. */
function reqType(obj: Record<string, unknown>, key: string, where: string): string {
	const v = req(obj, key, where);
	if (!/^0x[0-9a-f]{64}::\w+::\w+$/.test(v)) {
		throw new Error(`manifest ${where}.${key} is not a Move type tag: ${JSON.stringify(v)}`);
	}
	return v;
}

/**
 * The manifest carries some scale constants as JSON strings, so accept both — but reject
 * anything that would lose precision as a TS numeric literal, since values in the same
 * block already reach u64 max.
 */
function reqNum(obj: Record<string, unknown>, key: string, where: string): number {
	const raw = obj?.[key];
	const v = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw;
	if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
		throw new Error(
			`manifest ${where}.${key} must be a non-negative integer, got ${JSON.stringify(raw)}`,
		);
	}
	if (v > Number.MAX_SAFE_INTEGER) {
		throw new Error(
			`manifest ${where}.${key} is ${raw}, which cannot be emitted as an exact TS number`,
		);
	}
	return v;
}

const manifestPath = resolve(process.cwd(), arg('manifest') ?? DEFAULT_MANIFEST);
let manifest: Manifest;
try {
	manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
} catch (cause) {
	throw new Error(
		`could not read the deployment manifest at ${manifestPath}. ` +
			'Check the sibling deepbookv3 checkout out to the deployment BRANCH (e.g. ' +
			"`deepbook-predict-testnet`), not to the manifest's sourceCommit — the deploy tooling " +
			'writes the manifest in a later commit, so it does not exist at that commit. ' +
			'Or pass --manifest with an explicit path.',
		{ cause },
	);
}

// A schema bump can move or re-key ids. Failing here beats emitting a file whose ids are
// silently `undefined`.
if (!SUPPORTED_SCHEMA.includes(manifest.schemaVersion)) {
	throw new Error(
		`manifest schemaVersion ${manifest.schemaVersion} is not supported (expected one of ` +
			`${SUPPORTED_SCHEMA.join(', ')}). Re-read the manifest and update this script before ` +
			'regenerating.',
	);
}

// `network` becomes both a filename and part of an exported identifier, so it must be a
// bare lowercase word — otherwise a path in the manifest writes outside the package, and a
// space produces `export const TEST NET_DEPLOYMENT`.
if (!/^[a-z][a-z0-9]*$/.test(manifest.network ?? '')) {
	throw new Error(
		`manifest network must be a lowercase word, got ${JSON.stringify(manifest.network)}`,
	);
}

// A record for a network the accessors do not know would be written and then imported by
// nothing — `getDeployment('mainnet')` would still throw. Wiring it is a deliberate edit to
// src/deployments/index.ts, so fail here rather than leave an orphan file behind.
const WIRED_NETWORKS = ['testnet', 'mainnet'];
if (!WIRED_NETWORKS.includes(manifest.network)) {
	throw new Error(
		`network '${manifest.network}' has no accessor wiring. Add it to src/deployments/index.ts ` +
			`(getDeployment / getUnits) and to WIRED_NETWORKS in this script, then re-run.`,
	);
}

const { packages: p, objects: o, coinTypes: c } = manifest;

// A deployment manifest records the initial publication. Upgrades are recorded in
// Published.toml; keep call targets separate from original struct identities.
const publishedRoot = resolve(arg('published-root') ?? resolve(dirname(manifestPath), '../../..'));
function publication(name: 'predict' | 'sessions'): { latest: string; original: string } {
	const path = resolve(publishedRoot, 'packages', name, 'Published.toml');
	const records = parse(readFileSync(path, 'utf8')).published as Record<
		string,
		Record<string, unknown>
	>;
	const record = records?.[manifest.network];
	const where = `${path}:published.${manifest.network}`;
	if (record?.['chain-id'] !== manifest.chainId) {
		throw new Error(`${where} chain-id does not match the deployment manifest`);
	}
	const latest = reqId(record, 'published-at', where);
	const original = reqId(record, 'original-id', where);
	const recorded = reqId(p, name, 'packages');
	if (recorded !== original && recorded !== latest) {
		throw new Error(`${where} does not belong to the manifest's ${name} package`);
	}
	return { latest, original };
}
const predict = publication('predict');
const sessions = publication('sessions');
if (reqType(c, 'plp', 'coinTypes') !== `${predict.original}::plp::PLP`) {
	throw new Error('coinTypes.plp must use the original Predict package ID');
}

if (!manifest.underlyings || Object.keys(manifest.underlyings).length === 0) {
	throw new Error('manifest has no underlyings — a record with zero markets is not usable');
}

// Validated the same way as everything else. Interpolating these raw is how a renamed or
// missing manifest key becomes the literal string 'undefined' in a shipped id — which
// compiles, passes every test, and only surfaces as "Object undefined not found" at
// simulate time.
const underlyings = Object.entries(manifest.underlyings ?? {})
	.map(([symbol, u]) => {
		const where = `underlyings.${symbol}`;
		return `		${lit(symbol)}: Object.freeze({
			symbol: ${lit(req(u, 'symbol', where))},
			propbookUnderlyingId: ${reqNum(u, 'propbookUnderlyingId', where)},
			pythFeed: ${lit(reqId(u, 'pythFeed', where))},
			blockScholesValueStore: ${lit(reqId(u, 'blockScholesValueStore', where))},
			blockScholesSviStore: ${lit(reqId(u, 'blockScholesSviStore', where))},
		}),`;
	})
	.join('\n');

const out = `// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// GENERATED by \`pnpm sync-deployment\` from the deploy tooling's own manifest
// (\`packages/predict/deployment/deployment.${manifest.network}.json\`) and the Predict/Sessions
// \`Published.toml\` records for current call targets and original type IDs. Do not hand-edit:
// the next regeneration overwrites it, and a hand-patched id is exactly the drift this
// file exists to prevent. To move to a new deployment, check the sibling deepbookv3
// checkout out to the new anchor and re-run the script.
//
// Deployment: ${manifest.deployment}
// sourceCommit: ${manifest.sourceCommit}
//
// Runtime-dependency-free — every subpath reads a slice of this, so a value import here
// would pull that module into all of their graphs. The type import below is erased.
//
// Frozen: these are shared module singletons, so an accessor handing one to a caller who
// mutates it would change what every other caller sees.

import type {
	AccountIds,
	DeploymentInfo,
	DeploymentUnits,
	PredictIds,
	SessionsIds,
} from './types.js';

/** Which on-chain deployment the ids below came from. */
export const ${manifest.network.toUpperCase()}_DEPLOYMENT: DeploymentInfo = Object.freeze({
	deployment: ${lit(reqLabel(manifest as unknown as Record<string, unknown>, 'deployment', 'manifest'))},
	network: ${lit(manifest.network)},
	chainId: ${lit(reqLabel(manifest as unknown as Record<string, unknown>, 'chainId', 'manifest'))},
	sourceCommit: ${lit(reqLabel(manifest as unknown as Record<string, unknown>, 'sourceCommit', 'manifest'))},
});

/** Ids for the shared \`account\` primitive — the \`/account\` subpath's slice. */
export const ${manifest.network.toUpperCase()}_ACCOUNT: AccountIds = Object.freeze({
	accountPackageId: ${lit(reqId(p, 'account', 'packages'))},
	accountRegistry: ${lit(reqId(o, 'accountRegistry', 'objects'))},
});

/**
 * Ids for time-limited sessions — the \`/sessions\` subpath's slice.
 *
 * \`deepbookRegistry\` is only needed by the DeepBook **spot** session wrappers; the Predict
 * wrappers never take it. It is carried here so a spot caller does not have to reach into
 * the package root for one id.
 */
export const ${manifest.network.toUpperCase()}_SESSIONS: SessionsIds = Object.freeze({
	sessionsPackageId: ${lit(sessions.latest)},
	sessionsPackageIdV1: ${lit(sessions.original)},
	sessionsConfig: ${lit(reqId(o, 'sessionsConfig', 'objects'))},
	accountPackageId: ${lit(reqId(p, 'account', 'packages'))},
	accountRegistry: ${lit(reqId(o, 'accountRegistry', 'objects'))},
	deepbookRegistry: ${lit(reqId(o, 'deepbookRegistry', 'objects'))},
	deepbookCoreAccountPackageId: ${lit(reqId(p, 'deepbookCoreAccount', 'packages'))},
	/** Required by every Predict session wrapper — they all take \`config: &ProtocolConfig\`. */
	protocolConfig: ${lit(reqId(o, 'protocolConfig', 'objects'))},
});

/**
 * Scale constants the deployment owns rather than the SDK. Deployment-wide:
 * \`quoteCoinDecimals\` and \`fixedPointScale\` apply to any subpath formatting a custody
 * balance, not just Predict.
 */
export const ${manifest.network.toUpperCase()}_UNITS: DeploymentUnits = Object.freeze({
	positionLotSize: ${reqNum(manifest.initialConfiguration?.units ?? {}, 'positionLotSize', 'initialConfiguration.units')},
	fixedPointScale: ${reqNum(manifest.initialConfiguration?.units ?? {}, 'fixedPointScale', 'initialConfiguration.units')},
	quoteCoinDecimals: ${reqNum(manifest.initialConfiguration?.units ?? {}, 'quoteCoinDecimals', 'initialConfiguration.units')},
	positionQuantityDecimals: ${reqNum(manifest.initialConfiguration?.units ?? {}, 'positionQuantityDecimals', 'initialConfiguration.units')},
});

/** Ids for DeepBook Predict — the \`/predict\` subpath's slice. */
export const ${manifest.network.toUpperCase()}_PREDICT: PredictIds = Object.freeze({
	network: '${manifest.network}',
	packages: Object.freeze({
		predict: ${lit(predict.latest)},
		predictV1: ${lit(predict.original)},
		account: ${lit(reqId(p, 'account', 'packages'))},
		propbook: ${lit(reqId(p, 'propbook', 'packages'))},
	}),
	objects: Object.freeze({
		registry: ${lit(reqId(o, 'registry', 'objects'))},
		protocolConfig: ${lit(reqId(o, 'protocolConfig', 'objects'))},
		poolVault: ${lit(reqId(o, 'poolVault', 'objects'))},
		oracleRegistry: ${lit(reqId(o, 'oracleRegistry', 'objects'))},
		accountRegistry: ${lit(reqId(o, 'accountRegistry', 'objects'))},
	}),
	quoteCoinType: ${lit(reqType(c, 'usdc', 'coinTypes'))},
	/**
	 * \`plp\` is the LP share coin type. It is NOT derivable from \`packages.predict\`: a Move
	 * type tag keeps the ORIGINAL package id across an upgrade, while \`packages.predict\`
	 * moves to the latest. They agree only while predict is at v1.
	 */
	coinTypes: Object.freeze({
		plp: ${lit(reqType(c, 'plp', 'coinTypes'))},
		deep: ${lit(reqType(c, 'deep', 'coinTypes'))},
	}),
	units: ${manifest.network.toUpperCase()}_UNITS,
	underlyings: Object.freeze({
${underlyings}
	}),
});
`;

const target = resolve(process.cwd(), `src/deployments/${manifest.network}.ts`);
writeFileSync(target, out);
console.log(`wrote ${target} from ${manifest.deployment} (sourceCommit ${manifest.sourceCommit})`);
