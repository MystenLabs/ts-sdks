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
 * - `Pending(presig_index)` — awaiting its signature; carries the presignature
 *   index it will consume (valid within `epoch`), or
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
 * - every `Pending` index is unique within (batch, epoch) — `new` / `reallocate`
 *   assign distinct offsets from a freshly allocated block;
 * - indices are globally disjoint within an epoch — the allocator is monotonic
 *   (see `hashi::allocate_presigs`);
 * - a stale-epoch index is never used after a reconfig — `reallocate` overwrites
 *   EVERY `Pending` slot before any signing happens in the new epoch, and the
 *   caller must `reallocate` whenever `epoch` is stale;
 * - a `Signed` slot holds no index, so there is nothing stale to reuse.
 */

import { MoveEnum, MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/hashi::mpc_signing';
/** Per-input signing slot. */
export const MpcSig = new MoveEnum({
	name: `${$moduleName}::MpcSig`,
	fields: {
		/**
		 * Awaiting signature; holds the presignature index this input will consume, valid
		 * within the owning batch's `epoch`.
		 */
		Pending: bcs.u64(),
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
