/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {  MoveEnum  } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as type_name from './deps/std/type_name.js';
const $moduleName = '@mysten/payment-kit::config';
export const Value: MoveEnum<{
	U64: ReturnType<typeof bcs.u64>;
	Address: typeof bcs.Address;
	String: ReturnType<typeof bcs.string>;
	AsciiString: ReturnType<typeof bcs.string>;
	Bool: ReturnType<typeof bcs.bool>;
	Bytes: ReturnType<typeof bcs.vector<ReturnType<typeof bcs.u8>>>;
	Type: typeof type_name.TypeName;
}> = new MoveEnum({
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
