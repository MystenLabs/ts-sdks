// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';

import * as type_name from '../0x0000000000000000000000000000000000000000000000000000000000000001/type_name.js';
import * as balance from './balance.js';
import * as object from './object.js';
import * as vec_map from './vec_map.js';
import * as vec_set from './vec_set.js';

export function Token() {
	return bcs.struct('Token', {
		id: object.UID(),
		balance: balance.Balance(),
	});
}
export function TokenPolicyCap() {
	return bcs.struct('TokenPolicyCap', {
		id: object.UID(),
		for: bcs.Address,
	});
}
export function TokenPolicy() {
	return bcs.struct('TokenPolicy', {
		id: object.UID(),
		spent_balance: balance.Balance(),
		rules: vec_map.VecMap(bcs.string(), vec_set.VecSet(type_name.TypeName())),
	});
}
export function ActionRequest() {
	return bcs.struct('ActionRequest', {
		name: bcs.string(),
		amount: bcs.u64(),
		sender: bcs.Address,
		recipient: bcs.option(bcs.Address),
		spent_balance: bcs.option(balance.Balance()),
		approvals: vec_set.VecSet(type_name.TypeName()),
	});
}
export function RuleKey() {
	return bcs.struct('RuleKey', {
		is_protected: bcs.bool(),
	});
}
export function TokenPolicyCreated() {
	return bcs.struct('TokenPolicyCreated', {
		id: bcs.Address,
		is_mutable: bcs.bool(),
	});
}
