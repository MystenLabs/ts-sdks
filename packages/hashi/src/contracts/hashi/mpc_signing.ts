/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Durable, out-of-order accumulator for a withdrawal's per-input threshold Schnorr
 * signatures. This is the MPC-protocol side of incremental signing: the dangerous
 * presignature / nonce bookkeeping lives here, behind a module boundary, and is
 * embedded (field-private) inside the BTC `WithdrawalTransaction` rather than
 * stored as a separate object.
 *
 * Each input occupies one slot that is either:
 *
 * - `Pending(presig)` — awaiting its signature; carries the presignature it will
 *   consume (valid within `epoch`), or
 * - `Signed(bytes)` — the completed per-input MPC signature.
 *
 * Signatures are filled in any order (`record`), survive leader timeouts /
 * rotation / restart because they live on chain, and survive committee
 * reconfiguration: on an epoch change only the still-`Pending` slots are
 * reassigned fresh presignatures (`reallocate`); `Signed` slots are final and
 * epoch-independent (the committee group key is stable across rotation).
 *
 * NONCE SAFETY (a violation leaks the group secret share):
 *
 * - every `Pending` index is unique within an epoch — a `Presig` can only be
 *   minted by the monotonic `PresigAllocator` (reset only at reconfig) and is not
 *   `copy`, so each minted index lands in at most one slot;
 * - a stale-epoch index is never used after a reconfig — `reallocate` overwrites
 *   EVERY `Pending` slot before any signing happens in the new epoch, and the
 *   caller must `reallocate` whenever `epoch` is stale;
 * - a `Signed` slot holds no index, so there is nothing stale to reuse.
 */

import { MoveStruct, MoveEnum } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/hashi::mpc_signing';
export const PresigAllocator = new MoveStruct({
	name: `${$moduleName}::PresigAllocator`,
	fields: {
		/** Number of presignatures consumed in the current epoch. */
		num_consumed: bcs.u64(),
	},
});
export const Presig = new MoveStruct({
	name: `${$moduleName}::Presig`,
	fields: {
		index: bcs.u64(),
	},
});
/** Per-input signing slot. */
export const MpcSig = new MoveEnum({
	name: `${$moduleName}::MpcSig`,
	fields: {
		/**
		 * Awaiting signature; holds the presignature this input will consume, valid within
		 * the owning batch's `epoch`.
		 */
		Pending: Presig,
		/** Completed per-input MPC Schnorr signature bytes. */
		Signed: bcs.vector(bcs.u8()),
	},
});
export const SigningBatch = new MoveStruct({
	name: `${$moduleName}::SigningBatch`,
	fields: {
		/** One slot per input; same length/order as the withdrawal's inputs. */
		signatures: bcs.vector(MpcSig),
		/** Epoch the `Pending` presignature indices belong to. */
		epoch: bcs.u64(),
	},
});
