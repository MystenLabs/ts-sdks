import type { AccountConfig } from '../contracts/account/config-arguments.js';
import type { DeepbookPredictConfig } from '../contracts/deepbook_predict/config-arguments.js';
import type { PredictConfig } from './types.js';

/**
 * The flat config slice the generated bindings resolve `options.config` against, projected from
 * the nested public `PredictConfig`. Each generated call declares only the keys it consumes, so a
 * single object carrying all of them satisfies every call site.
 *
 * Typed as the intersection of the two generated interfaces on purpose: if codegen adds, drops, or
 * renames a config key, this file stops compiling instead of silently building a PTB against the
 * wrong object.
 *
 * The three ids below are additionally narrowed to `string`: codegen types package ids as optional
 * and object ids as the wider `ConfigValue`, but this projection always supplies plain ids — and
 * the helpers that read a package id or an object id directly (the wrapper-address derivation, the
 * hand-built `DataKey` type tag) need a `string`, not a maybe-absent `ConfigValue`.
 */
export type GeneratedConfig = DeepbookPredictConfig &
	AccountConfig & {
		predictPackageId: string;
		accountPackageId: string;
		accountRegistry: string;
	};

// Configs are long-lived (`TESTNET_CONFIG`, or one object held by a `PredictClient`) while
// builders are called per transaction, so the projection is memoized per config identity.
const cache = new WeakMap<PredictConfig, GeneratedConfig>();

export function toGeneratedConfig(cfg: PredictConfig): GeneratedConfig {
	const cached = cache.get(cfg);
	if (cached) return cached;
	const generated: GeneratedConfig = {
		predictPackageId: cfg.packages.predict,
		accountPackageId: cfg.packages.account,
		protocolConfig: cfg.objects.protocolConfig,
		poolVault: cfg.objects.poolVault,
		registry: cfg.objects.registry,
		oracleRegistry: cfg.objects.oracleRegistry,
		accountRegistry: cfg.objects.accountRegistry,
	};
	cache.set(cfg, generated);
	return generated;
}
