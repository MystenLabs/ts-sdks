// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Predict version 6 config reads, decoded straight from the dynamic fields that hold them, so they
// need no simulate and no call target: an underlying's `OracleBinding` on `ProtocolConfig`
// (`protocol_config::oracle_binding`) and the order desk's `BsTiming` (`desk::bs_timing`).
//
// Both keys are types version 6 introduced, so their type tags carry the version 6 package IDs
// (`packages.predictV6`, `packages.predictOrdersV3`), not the original IDs.
import { bcs } from '@mysten/sui/bcs';
import type { ClientWithCoreApi } from '@mysten/sui/client';
import { deriveDynamicFieldID, normalizeSuiAddress } from '@mysten/sui/utils';
import { DEFAULT_BS_TIMING, type BsTiming } from '../queue.js';
import { OracleBinding as OracleBindingBcs } from '../../contracts/deepbook_predict/protocol_config.js';
import { BsTiming as BsTimingBcs } from '../../contracts/deepbook_predict_orders/delayed_execution_config.js';

/**
 * `protocol_config::OracleBinding`: the signed data that prices, settles and values one
 * underlying's markets from Predict version 6.
 */
export interface OracleBinding {
	propbookUnderlyingId: number;
	/** The Pyth Lazer feed of the underlying's spot. */
	lazerFeedId: number;
	/** The Lazer channel settlement, reference ticks and the flush read: `2` (50 ms) or `3` (200 ms). */
	lazerChannel: number;
	/** The Block Scholes base asset of the spot, forward and SVI series. */
	blockScholesBaseAsset: string;
	/** The Block Scholes SVI model. */
	sviModel: string;
	/** The decimals the SVI series is signed at: `9` or `18`. */
	sviDecimals: number;
}

const BindingField = bcs.struct('Field<OracleBindingKey,OracleBinding>', {
	id: bcs.Address,
	name: bcs.u32(),
	value: OracleBindingBcs,
});

const TimingField = bcs.struct('Field<BsTimingKey,BsTiming>', {
	id: bcs.Address,
	name: bcs.bool(),
	value: BsTimingBcs,
});

async function fieldContent(
	client: ClientWithCoreApi,
	fieldId: string,
): Promise<Uint8Array | null> {
	const {
		objects: [field],
	} = await client.core.getObjects({ objectIds: [fieldId], include: { content: true } });
	if (field instanceof Error) return null;
	if (!field.content) throw new Error(`dynamic field ${fieldId} returned no content`);
	return field.content;
}

/**
 * An underlying's oracle binding, decoded from the `OracleBindingKey(propbookUnderlyingId)`
 * dynamic field on `ProtocolConfig`, or `null` while the admin hasn't set one. `predictV6` is the
 * Predict version 6 package, which defines the key type.
 */
export async function readOracleBinding(
	client: ClientWithCoreApi,
	args: { protocolConfigId: string; predictV6: string; propbookUnderlyingId: number },
): Promise<OracleBinding | null> {
	const fieldId = deriveDynamicFieldID(
		args.protocolConfigId,
		`${args.predictV6}::protocol_config::OracleBindingKey`,
		bcs.u32().serialize(args.propbookUnderlyingId).toBytes(),
	);
	const content = await fieldContent(client, fieldId);
	if (!content) return null;
	const b = BindingField.parse(content).value;
	return {
		propbookUnderlyingId: args.propbookUnderlyingId,
		lazerFeedId: b.lazer_feed_id,
		lazerChannel: b.lazer_channel,
		blockScholesBaseAsset: b.block_scholes_base_asset,
		sviModel: b.svi_model,
		sviDecimals: b.svi_decimals,
	};
}

/**
 * The order desk's Block Scholes slot timing, decoded from its `BsTimingKey()` dynamic field, or
 * the defaults the chain reads while the admin hasn't set one (value lag 500 ms, SVI lag 1,000 ms,
 * gap wait 1,000 ms). `predictOrdersV3` is the `deepbook_predict_orders` version 3 package, which
 * defines the key type.
 */
export async function readBsTiming(
	client: ClientWithCoreApi,
	args: { orderDeskId: string; predictOrdersV3: string },
): Promise<BsTiming & { isDefault: boolean }> {
	const fieldId = deriveDynamicFieldID(
		args.orderDeskId,
		`${args.predictOrdersV3}::desk::BsTimingKey`,
		new Uint8Array([0]),
	);
	const content = await fieldContent(client, fieldId);
	if (!content) return { ...DEFAULT_BS_TIMING, isDefault: true };
	const t = TimingField.parse(content).value;
	return {
		valueLagMs: BigInt(t.value_lag_ms),
		sviLagMs: BigInt(t.svi_lag_ms),
		gapWaitMs: BigInt(t.gap_wait_ms),
		isDefault: false,
	};
}

/**
 * The Block Scholes verifier a version 6 commit calls: `packageId`, the package to call, and the
 * original ID that types `verify::ValueUpdate` and `verify::SviUpdate`, read from the type of its
 * shared `SignerRegistry` (both types come from the verifier's first publication).
 */
export async function blockScholesPackages(
	client: ClientWithCoreApi,
	args: { signerRegistryId: string; packageId: string },
): Promise<{ signerRegistryId: string; packageId: string; originalId: string }> {
	const { object } = await client.core.getObject({ objectId: args.signerRegistryId });
	const [originalId, module, name] = object.type.split('::');
	if (module !== 'registry' || name !== 'SignerRegistry') {
		throw new Error(
			`${args.signerRegistryId} is a ${object.type}, not a Block Scholes SignerRegistry`,
		);
	}
	return {
		signerRegistryId: normalizeSuiAddress(args.signerRegistryId),
		packageId: normalizeSuiAddress(args.packageId),
		originalId: normalizeSuiAddress(originalId),
	};
}
