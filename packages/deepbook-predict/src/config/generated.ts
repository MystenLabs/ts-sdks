import type { AccountConfig } from '@mysten/deepbook-account';
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
 * `predictPackageId` is narrowed to `string` because codegen types package ids as optional, while
 * this projection always supplies one — and the helper that hand-builds the `DataKey` type tag
 * needs a `string`, not a maybe-absent `ConfigValue`. The two account ids restate a narrowing
 * `AccountConfig` already applies, so they are redundant today; they are kept so this projection
 * still compiles to plain ids if that package ever widens them back.
 */
export type GeneratedConfig = DeepbookPredictConfig &
	AccountConfig & {
		predictPackageId: string;
		accountPackageId: string;
		accountRegistry: string;
	};

export function toGeneratedConfig(cfg: PredictConfig): GeneratedConfig {
	return {
		predictPackageId: cfg.packages.predict,
		accountPackageId: cfg.packages.account,
		protocolConfig: cfg.objects.protocolConfig,
		poolVault: cfg.objects.poolVault,
		registry: cfg.objects.registry,
		oracleRegistry: cfg.objects.oracleRegistry,
		accountRegistry: cfg.objects.accountRegistry,
	};
}
