// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { MoveEnum } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as type_name from './deps/std/type_name.js';
const $moduleName = '@local-pkg/payment-kit::config';
export const Value = new MoveEnum({
	name: `${$moduleName}::Value`,
	fields: {
		U64: bcs.u64(),
		Address: bcs.Address,
		String: bcs.string(),
		AsciiString: bcs.string(),
		Bool: bcs.bool(),
		Bytes: bcs.vector(bcs.u8()),
		Type: type_name.TypeName,
	},
});
