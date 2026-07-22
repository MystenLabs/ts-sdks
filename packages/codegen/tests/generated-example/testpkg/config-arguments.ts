/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type ConfigValue, type ConfigResolverContext } from '../utils/index.js';
import { type TransactionObjectArgument } from '@mysten/sui/transactions';
export interface TestpkgConfig {
    registry: ConfigValue;
    container: (ctx: ConfigResolverContext) => string | TransactionObjectArgument;
    status: ConfigValue;
    testpkgPackageId?: string;
}