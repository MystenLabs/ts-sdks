/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * The companion's authority over Predict's order-flow primitives.
 *
 * Predict lets admission, commit, and fills run only for an allowlisted witness
 * type (`protocol_config::set_order_flow<OrderFlow>`). This module defines that
 * witness and is the only place that builds it: each Predict call that needs it
 * goes through a package-only function here, so no caller outside this package can
 * obtain the witness or reach Predict with it. `release` and `try_pay_settled`
 * need no authority and are called directly.
 */

import { MoveTuple } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/deepbook_predict_orders::order_flow';
export const OrderFlow = new MoveTuple({ name: `${$moduleName}::OrderFlow`, fields: [bcs.bool()] });
