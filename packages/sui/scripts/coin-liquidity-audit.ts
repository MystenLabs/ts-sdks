// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Cross-protocol liquidity audit for a single Sui coin type.
 *
 * Answers "where does this coin actually sit, and how much of it is there?"
 * without hardcoding knowledge of any particular DeFi protocol. Each venue is
 * probed generically: the script reads the venue's Move struct, asks the node
 * for the concrete type of every field, and keeps the fields whose type is a
 * `Balance<COIN>` or `Coin<COIN>`. A Bluefin CLMM pool, a lending market
 * reserve and a vault therefore all work through the same code path.
 *
 * Usage:
 *   pnpm tsx scripts/coin-liquidity-audit.ts \
 *     --venue 0x<pool-or-market-object-id> \
 *     --venue 0x<another-one> \
 *     --owner 0x<protocol-owned-address>
 *
 * Options:
 *   --coin-type <type>  Coin type to audit. Defaults to svBTC (see the lib).
 *   --network <net>     mainnet | testnet | devnet. Default mainnet.
 *   --url <url>         Explicit GraphQL endpoint. Overrides --network.
 *   --venue <id>        Object ID of a pool / lending market / vault to probe.
 *                       Repeatable, and accepts a comma-separated list.
 *   --owner <address>   Address to report coin holdings for. Repeatable.
 *   --depth <n>         Levels of nested struct fields to expand. Default 2.
 *   --json              Emit machine-readable JSON instead of a table.
 *
 * Known limitation: reserves parked in *dynamic fields* rather than in the
 * venue struct itself are not scanned. If a venue reports no holdings but you
 * expect some, inspect its dynamic fields and pass those object IDs as venues.
 */

import { parseArgs } from 'node:util';

import { SuiGraphQLClient } from '../src/graphql/index.js';
import type { Match, Network, OwnerReport, VenueReport } from './coin-liquidity-lib.js';
import {
	amountFromJson,
	canonicalizeType,
	dedupeMatches,
	DEFAULT_COIN_TYPE,
	denominatesCoin,
	enumeratePaths,
	formatUnits,
	GRAPHQL_ENDPOINTS,
	inferFromFieldNames,
	splitList,
} from './coin-liquidity-lib.js';

/** Cap on aliased `extract` selections per venue, to keep queries reasonable. */
const MAX_PROBES = 80;

interface GraphQLResult<T> {
	data?: T | null;
	errors?: { message: string }[];
}

async function runQuery<T>(
	client: SuiGraphQLClient,
	query: string,
	variables: Record<string, unknown>,
): Promise<T> {
	const result = (await client.query({ query, variables })) as GraphQLResult<T>;

	if (result.errors?.length) {
		throw new Error(result.errors.map((error) => error.message).join('; '));
	}

	if (!result.data) {
		throw new Error('GraphQL response contained no data');
	}

	return result.data;
}

const COIN_INFO_QUERY = /* GraphQL */ `
	query CoinInfo($coinType: String!) {
		coinMetadata(coinType: $coinType) {
			name
			symbol
			decimals
			supply
		}
	}
`;

const VENUE_CONTENTS_QUERY = /* GraphQL */ `
	query VenueContents($id: SuiAddress!) {
		object(address: $id) {
			asMoveObject {
				contents {
					type {
						repr
					}
					json
				}
			}
		}
	}
`;

const OWNER_BALANCE_QUERY = /* GraphQL */ `
	query OwnerBalance($address: SuiAddress!, $coinType: String!) {
		address(address: $address) {
			balance(coinType: $coinType) {
				totalBalance
			}
		}
	}
`;

interface CoinInfo {
	coinMetadata: {
		name: string | null;
		symbol: string | null;
		decimals: number | null;
		supply: string | null;
	} | null;
}

interface VenueContents {
	object: {
		asMoveObject: {
			contents: { type: { repr: string } | null; json: unknown } | null;
		} | null;
	} | null;
}

/**
 * Ask the node for the concrete type of each candidate path in one round trip,
 * using aliased `extract` selections.
 */
async function probePaths(
	client: SuiGraphQLClient,
	id: string,
	paths: string[],
): Promise<Map<string, { typeRepr: string | null; json: unknown }>> {
	const results = new Map<string, { typeRepr: string | null; json: unknown }>();

	if (!paths.length) {
		return results;
	}

	const selections = paths
		.map(
			(path, index) => `p${index}: extract(path: ${JSON.stringify(path)}) { type { repr } json }`,
		)
		.join('\n\t\t\t\t\t\t');

	const query = `
		query VenueFields($id: SuiAddress!) {
			object(address: $id) {
				asMoveObject {
					contents {
						${selections}
					}
				}
			}
		}
	`;

	const data = await runQuery<{
		object: {
			asMoveObject: {
				contents: Record<string, { type: { repr: string } | null; json: unknown } | null> | null;
			} | null;
		} | null;
	}>(client, query, { id });

	const contents = data.object?.asMoveObject?.contents;
	if (!contents) {
		return results;
	}

	paths.forEach((path, index) => {
		const probe = contents[`p${index}`];
		if (probe) {
			results.set(path, { typeRepr: probe.type?.repr ?? null, json: probe.json });
		}
	});

	return results;
}

async function probeVenue(
	client: SuiGraphQLClient,
	id: string,
	canonicalCoin: string,
	depth: number,
): Promise<VenueReport> {
	try {
		const data = await runQuery<VenueContents>(client, VENUE_CONTENTS_QUERY, { id });
		const contents = data.object?.asMoveObject?.contents;

		if (!contents) {
			return {
				id,
				type: null,
				matches: [],
				total: 0n,
				confidence: 'none',
				error: 'not a Move object, or not found at the latest checkpoint',
			};
		}

		const venueType = contents.type?.repr ?? null;
		const paths = enumeratePaths(contents.json, depth).slice(0, MAX_PROBES);
		const probes = await probePaths(client, id, paths);

		const matches: Match[] = [];
		for (const [path, probe] of probes) {
			if (!probe.typeRepr || !denominatesCoin(probe.typeRepr, canonicalCoin)) {
				continue;
			}

			const amount = amountFromJson(probe.json);
			if (amount !== null) {
				matches.push({ path, amount, confidence: 'typed', type: probe.typeRepr });
			}
		}

		const deduped = dedupeMatches(matches);

		if (deduped.length) {
			return {
				id,
				type: venueType,
				matches: deduped,
				total: deduped.reduce((sum, match) => sum + match.amount, 0n),
				confidence: 'typed',
			};
		}

		const inferred = venueType ? inferFromFieldNames(contents.json, venueType, canonicalCoin) : [];

		return {
			id,
			type: venueType,
			matches: inferred,
			total: inferred.reduce((sum, match) => sum + match.amount, 0n),
			confidence: inferred.length ? 'inferred' : 'none',
		};
	} catch (error) {
		return {
			id,
			type: null,
			matches: [],
			total: 0n,
			confidence: 'none',
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

async function probeOwner(
	client: SuiGraphQLClient,
	owner: string,
	coinType: string,
): Promise<OwnerReport> {
	try {
		const data = await runQuery<{
			address: { balance: { totalBalance: string | null } | null } | null;
		}>(client, OWNER_BALANCE_QUERY, { address: owner, coinType });

		const total = data.address?.balance?.totalBalance;
		return { owner, amount: total ? BigInt(total) : 0n };
	} catch (error) {
		return {
			owner,
			amount: 0n,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

const { values } = parseArgs({
	options: {
		'coin-type': { type: 'string' },
		network: { type: 'string' },
		url: { type: 'string' },
		venue: { type: 'string', multiple: true },
		owner: { type: 'string', multiple: true },
		depth: { type: 'string' },
		json: { type: 'boolean' },
	},
});

const coinType = values['coin-type'] ?? DEFAULT_COIN_TYPE;
const network = (values.network ?? 'mainnet') as Network;

if (!values.url && !(network in GRAPHQL_ENDPOINTS)) {
	throw new Error(
		`Unknown network "${network}". Use one of ${Object.keys(GRAPHQL_ENDPOINTS).join(', ')}, or pass --url.`,
	);
}

const depth = Math.max(1, Number(values.depth ?? '2'));
const venues = splitList(values.venue);
const owners = splitList(values.owner);
const canonicalCoin = canonicalizeType(coinType);

const endpoint = values.url ?? GRAPHQL_ENDPOINTS[network];
const client = new SuiGraphQLClient({ url: endpoint, network });

// The metadata lookup doubles as a reachability check: fail here with something
// readable rather than letting a transport error surface as a raw stack trace.
let info: CoinInfo;
try {
	info = await runQuery<CoinInfo>(client, COIN_INFO_QUERY, { coinType });
} catch (error) {
	console.error(`\nCould not query ${endpoint}`);
	console.error(`  ${error instanceof Error ? error.message : String(error)}`);
	console.error('\nPass --url to point at a GraphQL endpoint this machine can reach.\n');
	process.exit(1);
}

const metadata = info.coinMetadata;

if (!metadata) {
	throw new Error(
		`No coin metadata found for ${coinType} on ${network}. Check the coin type and ` +
			`network — a typo here silently produces an empty audit rather than an error.`,
	);
}

const symbol = metadata.symbol ?? 'UNKNOWN';
const decimals = metadata.decimals ?? 0;
const totalSupply = metadata.supply === null ? null : BigInt(metadata.supply);

const venueReports = await Promise.all(
	venues.map((venue) => probeVenue(client, venue, canonicalCoin, depth)),
);
const ownerReports = await Promise.all(owners.map((owner) => probeOwner(client, owner, coinType)));

const located =
	venueReports.reduce((sum, report) => sum + report.total, 0n) +
	ownerReports.reduce((sum, report) => sum + report.amount, 0n);

if (values.json) {
	console.log(
		JSON.stringify(
			{
				coinType,
				network,
				symbol,
				decimals,
				totalSupply: totalSupply?.toString() ?? null,
				located: located.toString(),
				venues: venueReports.map((report) => ({
					...report,
					total: report.total.toString(),
					matches: report.matches.map((match) => ({ ...match, amount: match.amount.toString() })),
				})),
				owners: ownerReports.map((report) => ({ ...report, amount: report.amount.toString() })),
			},
			null,
			2,
		),
	);
} else {
	const pct = (amount: bigint) =>
		totalSupply && totalSupply > 0n
			? `${((Number(amount) / Number(totalSupply)) * 100).toFixed(2)}%`
			: 'n/a';

	console.log(`\n${symbol}${metadata.name ? ` (${metadata.name})` : ''} — ${network}`);
	console.log(coinType);
	console.log(
		`Total supply: ${
			totalSupply === null ? 'unavailable' : `${formatUnits(totalSupply, decimals)} ${symbol}`
		}\n`,
	);

	if (!venueReports.length && !ownerReports.length) {
		console.log('No venues or owners supplied — nothing to scan.\n');
		console.log('Pass --venue <objectId> for each pool / lending market / vault to probe,');
		console.log('and --owner <address> for any protocol-controlled address.\n');
	}

	for (const report of venueReports) {
		console.log(`venue ${report.id}`);
		console.log(`  type:  ${report.type ?? 'unknown'}`);

		if (report.error) {
			console.log(`  error: ${report.error}\n`);
			continue;
		}

		if (!report.matches.length) {
			console.log(`  held:  none found — no ${symbol}-denominated field in this object\n`);
			continue;
		}

		console.log(
			`  held:  ${formatUnits(report.total, decimals)} ${symbol} (${pct(report.total)} of supply)`,
		);
		console.log(`  basis: ${report.confidence}`);

		for (const match of report.matches) {
			console.log(`    ${match.path}: ${formatUnits(match.amount, decimals)}`);
		}

		if (report.confidence === 'inferred') {
			console.log(`  NOTE:  no ${symbol}-typed field found. The figures above are inferred from`);
			console.log(`         field names and must be confirmed against the protocol UI.`);
		}

		console.log();
	}

	for (const report of ownerReports) {
		console.log(`owner ${report.owner}`);
		if (report.error) {
			console.log(`  error: ${report.error}\n`);
			continue;
		}
		console.log(
			`  held:  ${formatUnits(report.amount, decimals)} ${symbol} (${pct(report.amount)} of supply)\n`,
		);
	}

	if (venueReports.length || ownerReports.length) {
		console.log(`Located: ${formatUnits(located, decimals)} ${symbol} (${pct(located)})`);

		if (totalSupply !== null) {
			const remainder = totalSupply - located;
			console.log(
				`Unscanned remainder: ${formatUnits(remainder, decimals)} ${symbol} (${pct(remainder)})`,
			);
			console.log('\nThe remainder is supply in venues you did not pass, or in user wallets.');
			console.log('It is evidence of an incomplete venue list, not of missing funds.');
		}
	}
}
