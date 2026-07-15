// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Value } from './contracts/hashi/config_value.js';
import { HashiConfigError, InvalidParamsError } from './errors.js';

export type ConfigValue = typeof Value.$inferType;
export type ConfigEntry = { key: string; value: ConfigValue };

/** 0x-prefixed 32-byte hex (66 chars). Matches Sui addresses and Bitcoin txids. */
const HEX32_RE = /^0x[0-9a-fA-F]{64}$/;

/**
 * Guards that `value` is a 0x-prefixed 32-byte hex string, throwing
 * `InvalidParamsError` otherwise. `fieldName` is interpolated into
 * the error message so callers can tell which deposit parameter failed.
 */
export function assertHex32(value: unknown, fieldName: string): void {
	if (typeof value !== 'string' || !HEX32_RE.test(value)) {
		throw new InvalidParamsError({
			reason: `\`${fieldName}\` must be a 0x-prefixed 32-byte hex string`,
			detail: `got ${JSON.stringify(value)}`,
		});
	}
}

/**
 * Reverse the 32 bytes of a Bitcoin txid between display order (the
 * big-endian form shown by mempool.space, blockstream.info, and
 * `bitcoin-cli`) and internal byte order (the little-endian form Bitcoin
 * Core stores natively, and the form `bitcoin::Txid` parses to).
 *
 * The Hashi committee verifier reads `Utxo.txid` from on-chain state as a
 * `bitcoin::Txid`, so deposits must record the txid in **internal byte
 * order**. End users hold display-order txids (everything user-facing
 * shows that), so the SDK accepts display-order as input and reverses
 * here before recording.
 */
export function reverseTxidBytes(txid: string): string {
	assertHex32(txid, 'txid');
	const hex = txid.slice(2);
	let reversed = '';
	for (let i = hex.length - 2; i >= 0; i -= 2) {
		reversed += hex.slice(i, i + 2);
	}
	return reversed;
}

/**
 * Find a VecMap entry by key and narrow its `Value` variant. Discriminating
 * on `$kind` lets TypeScript narrow the returned payload — callers get the
 * variant-specific fields (e.g. `.U64: string`, `.Bool: boolean`) without
 * any manual type assertions.
 */
export function entry<K extends ConfigValue['$kind']>(
	contents: readonly ConfigEntry[],
	key: string,
	expectedVariant: K,
): Extract<ConfigValue, { $kind: K }> {
	const e = contents.find((c) => c.key === key);
	if (!e) throw HashiConfigError.missing(key, expectedVariant);
	if (e.value.$kind !== expectedVariant) {
		throw HashiConfigError.wrongVariant(key, expectedVariant, e.value.$kind);
	}
	return e.value as Extract<ConfigValue, { $kind: K }>;
}

/**
 * Read a `Bytes` config entry and assert its byte length. Throws
 * `HashiConfigError` if the key is missing, holds a non-`Bytes` variant, or
 * has the wrong length.
 */
export function configBytes(
	contents: readonly ConfigEntry[],
	key: string,
	expectedLen: number,
): Uint8Array {
	const v = entry(contents, key, 'Bytes');
	if (v.Bytes.length !== expectedLen) {
		throw HashiConfigError.malformedPayload(
			key,
			'Bytes',
			`expected ${expectedLen} bytes, got ${v.Bytes.length}`,
		);
	}
	return new Uint8Array(v.Bytes);
}
