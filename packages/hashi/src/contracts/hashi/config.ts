/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * A general-purpose, typed key-value configuration store: a map from string keys
 * to `config_value::Value`s, with domain-specific accessors layered on top (pause
 * state, guardian, emergency thresholds). Chain-specific configuration (e.g. BTC
 * fee parameters) lives in separate modules that use get/upsert.
 *
 * `Config` has `copy, drop, store` and carries no policy of its own (no
 * versioning, no upgrade authority — those live in `versioning`), so it can be
 * embedded by value wherever a bag of settings is needed: it backs the package's
 * global config and is also pinned per-epoch onto a `Committee`.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as vec_map from './deps/sui/vec_map.js';
import * as config_value from './config_value.js';
const $moduleName = '@local-pkg/hashi::config';
export const Config = new MoveStruct({
	name: `${$moduleName}::Config`,
	fields: {
		config: vec_map.VecMap(bcs.string(), config_value.Value),
	},
});
