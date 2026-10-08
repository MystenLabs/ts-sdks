/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Registry of Hashi committee state: registered member metadata (`MemberInfo`),
 * per-epoch `Committee`s, the current epoch, the MPC threshold public key, and the
 * pending epoch change while a reconfiguration is in flight. Members register (and
 * rotate keys/metadata) here between epochs; `start_reconfig` builds the next
 * committee from Sui's active validator set, and `end_reconfig` activates it —
 * storing the outgoing committee's handoff certificate for non-initial reconfigs.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as committee from './committee.js';
import * as bag from './deps/sui/bag.js';
import * as table from './deps/sui/table.js';
import * as group_ops from './deps/sui/group_ops.js';
import * as config from './config.js';
const $moduleName = '@local-pkg/hashi::committee_set';
export const PendingEpochChange = new MoveStruct({
	name: `${$moduleName}::PendingEpochChange`,
	fields: {
		epoch: bcs.u64(),
		committee_handoff_cert: bcs.option(committee.CommitteeSignature),
	},
});
export const CommitteeSet = new MoveStruct({
	name: `${$moduleName}::CommitteeSet`,
	fields: {
		members: bag.Bag,
		/**
		 * Reverse index from each registered TLS public key to the validator address of
		 * the member holding it. Kept in lockstep with `MemberInfo.tls_public_key` so that
		 * registration can reject a key already held by another member without scanning
		 * every member.
		 */
		tls_public_keys: table.Table,
		/** The current epoch. */
		epoch: bcs.u64(),
		committees: bag.Bag,
		pending_epoch_change: bcs.option(PendingEpochChange),
		/** The MPC committee's threshold public key. */
		mpc_public_key: bcs.vector(bcs.u8()),
	},
});
export const CommitteeHandoffKey = new MoveStruct({
	name: `${$moduleName}::CommitteeHandoffKey`,
	fields: {
		epoch: bcs.u64(),
	},
});
export const CommitteeHandoff = new MoveStruct({
	name: `${$moduleName}::CommitteeHandoff`,
	fields: {
		next_epoch: bcs.u64(),
		cert: committee.CommitteeSignature,
	},
});
export const MemberInfo = new MoveStruct({
	name: `${$moduleName}::MemberInfo`,
	fields: {
		/** Sui Validator Address of this node */
		validator_address: bcs.Address,
		/** Sui Address of an operations account */
		operator_address: bcs.Address,
		/**
		 * bls12381 public key to be used in the next epoch.
		 *
		 * The public key for this node which is active in the current epoch can be found
		 * in the `Committee` struct.
		 *
		 * This public key can be rotated but will only take effect at the beginning of the
		 * next epoch.
		 */
		next_epoch_public_key: group_ops.Element,
		/**
		 * The HTTPS network address where the instance of the `hashi` service for this
		 * validator can be reached.
		 *
		 * This HTTPS address can be rotated and any such updates will take effect
		 * immediately.
		 */
		endpoint_url: bcs.string(),
		/**
		 * ed25519 public key used to verify TLS self-signed x509 certs
		 *
		 * This public key can be rotated and any such updates will take effect
		 * immediately.
		 */
		tls_public_key: bcs.vector(bcs.u8()),
		/**
		 * A 32-byte ristretto255 Ristretto encryption public key (ristretto255
		 * RistrettoPoint) for MPC ECIES, to be used in the next epoch.
		 *
		 * This public key can be rotated but will only take effect at the beginning of the
		 * next epoch.
		 */
		next_epoch_encryption_public_key: bcs.vector(bcs.u8()),
		/**
		 * Governance "ignored" flag, set and cleared only through the quorum-gated
		 * `ignore_member` proposal. Read at committee formation: the next formation skips
		 * the member; the current epoch's committee is never altered.
		 */
		ignored: bcs.bool(),
		/**
		 * Voluntary "resigned" flag. Set by `request_resignation`, cleared by
		 * `clear_resignation`, honored by committee formation (skip); the registration
		 * itself is deleted by the permissionless `remove_inactive_member` once the member
		 * holds no epoch duties.
		 */
		resigned: bcs.bool(),
		/**
		 * Open-ended per-member extension slot; lets future upgrades attach new member
		 * data (e.g. per-protocol keys) without a MemberInfoV2 migration once the layout
		 * freezes at mainnet. Empty today.
		 */
		extra_fields: config.Config,
	},
});
