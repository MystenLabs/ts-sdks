// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { AccountConfig } from '../../account.js';
import type { DeepbookPredictConfig } from '../../contracts/deepbook_predict/config-arguments.js';
import type { DeepbookPredictMathConfig } from '../../contracts/deepbook_predict_math/config-arguments.js';
import type { DeepbookPredictOrdersConfig } from '../../contracts/deepbook_predict_orders/config-arguments.js';
import { PredictInputError } from '../errors.js';
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
 * this projection always supplies one. `predictPackageIdV1` separately supplies the original
 * identity for existing struct tags and dynamic-field keys. The two account ids restate a narrowing
 * `AccountConfig` already applies, so they are redundant today; they are kept so this projection
 * still compiles to plain ids if that package ever widens them back.
 */
export type GeneratedConfig = DeepbookPredictConfig &
	AccountConfig & {
		predictPackageId: string;
		predictPackageIdV1: string;
		accountPackageId: string;
		accountRegistry: string;
	};

export function toGeneratedConfig(cfg: PredictConfig): GeneratedConfig {
	return {
		predictPackageId: cfg.packages.predict,
		predictPackageIdV1: cfg.packages.predictV1 ?? cfg.packages.predict,
		accountPackageId: cfg.packages.account,
		protocolConfig: cfg.objects.protocolConfig,
		poolVault: cfg.objects.poolVault,
		registry: cfg.objects.registry,
		oracleRegistry: cfg.objects.oracleRegistry,
		accountRegistry: cfg.objects.accountRegistry,
	};
}

/**
 * {@link GeneratedConfig} plus the order-flow companion (`deepbook_predict_orders`) and the math
 * library: the slice the queued-order thunks and reads take. A queued order calls the companion,
 * which calls into Predict, so one object carries both packages' keys. `predictOrdersPackageIdV1`
 * is the companion's original ID, which types `OrderFlow` and the queue events.
 */
export type OrdersGeneratedConfig = GeneratedConfig &
	DeepbookPredictOrdersConfig &
	DeepbookPredictMathConfig & {
		predictOrdersPackageId: string;
		predictOrdersPackageIdV1: string;
		orderDesk: string;
		queueRegistry: string;
	};

/**
 * Project a config that records delayed execution onto {@link OrdersGeneratedConfig}. Throws
 * `PredictInputError` while the config lacks the Predict upgrade, the companion package, its desk
 * or its queue registry: building a queued order against a guessed package would abort on chain
 * or, worse, address the wrong one.
 */
export function toOrdersConfig(cfg: PredictConfig): OrdersGeneratedConfig {
	const { predictDelayedExecution, predictOrders, predictOrdersV1, predictMath } = cfg.packages;
	const { orderDesk, queueRegistry } = cfg.objects;
	if (!predictDelayedExecution || !predictOrders || !orderDesk || !queueRegistry) {
		const missing = [
			!predictDelayedExecution && '`packages.predictDelayedExecution`',
			!predictOrders && '`packages.predictOrders`',
			!orderDesk && '`objects.orderDesk`',
			!queueRegistry && '`objects.queueRegistry`',
		].filter(Boolean);
		throw new PredictInputError(
			`delayed execution isn't recorded for ${cfg.network} in this SDK version (missing ` +
				`${missing.join(', ')}): pass a \`config\` that records the Predict upgrade, the ` +
				'`deepbook_predict_orders` package, its order desk and its queue registry',
		);
	}
	return {
		...toGeneratedConfig(cfg),
		predictOrdersPackageId: predictOrders,
		predictOrdersPackageIdV1: predictOrdersV1 ?? predictOrders,
		predictMathPackageId: predictMath,
		orderDesk,
		queueRegistry,
	};
}
