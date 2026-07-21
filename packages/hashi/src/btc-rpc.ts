// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { UtxoLookupResult } from './types.js';

async function rpcCall<T = unknown>(
	url: string,
	method: string,
	params: unknown[],
	id: string,
): Promise<T> {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ jsonrpc: '1.0', id, method, params }),
	});
	const data = (await res.json()) as { error?: { message: string }; result?: T };
	if (data.error) throw new Error(data.error.message);
	return data.result as T;
}

export async function lookupVout(
	btcRpcUrl: string,
	txid: string,
	depositAddress: string,
): Promise<UtxoLookupResult | null> {
	const tx = await rpcCall<{
		vout: Array<{ n: number; value: number; scriptPubKey?: { address?: string } }>;
	}>(btcRpcUrl, 'getrawtransaction', [txid, true], 'hashi-lookup-vout');
	for (const output of tx.vout) {
		if (output.scriptPubKey?.address === depositAddress) {
			return { vout: output.n, amountSats: BigInt(Math.round(output.value * 1e8)) };
		}
	}
	return null;
}

export async function lookupAllVouts(
	btcRpcUrl: string,
	txid: string,
	depositAddress: string,
): Promise<UtxoLookupResult[]> {
	const tx = await rpcCall<{
		vout: Array<{ n: number; value: number; scriptPubKey?: { address?: string } }>;
	}>(btcRpcUrl, 'getrawtransaction', [txid, true], 'hashi-lookup-all');
	const matches: UtxoLookupResult[] = [];
	for (const output of tx.vout) {
		if (output.scriptPubKey?.address === depositAddress) {
			matches.push({ vout: output.n, amountSats: BigInt(Math.round(output.value * 1e8)) });
		}
	}
	return matches;
}

export async function getTxConfirmations(btcRpcUrl: string, txid: string): Promise<number> {
	const tx = await rpcCall<{ confirmations?: number }>(
		btcRpcUrl,
		'getrawtransaction',
		[txid, true],
		'hashi-confirmations',
	);
	return Number(tx?.confirmations ?? 0);
}
