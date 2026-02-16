/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as balance from '../sui/balance.js';
import * as bag from '../sui/bag.js';
const $moduleName = '0x3::stake_subsidy';
export const StakeSubsidy = new MoveStruct({
	name: `${$moduleName}::StakeSubsidy`,
	fields: {
		/** Balance of SUI set aside for stake subsidies that will be drawn down over time. */
		balance: balance.Balance,
		/** Count of the number of times stake subsidies have been distributed. */
		distribution_counter: bcs.u64(),
		/**
		 * The amount of stake subsidy to be drawn down per distribution. This amount
		 * decays and decreases over time.
		 */
		current_distribution_amount: bcs.u64(),
		/** Number of distributions to occur before the distribution amount decays. */
		stake_subsidy_period_length: bcs.u64(),
		/**
		 * The rate at which the distribution amount decays at the end of each period.
		 * Expressed in basis points.
		 */
		stake_subsidy_decrease_rate: bcs.u16(),
		/** Any extra fields that's not defined statically. */
		extra_fields: bag.Bag,
	},
});
export interface CurrentEpochSubsidyAmountArguments {
	self: RawTransactionArgument<string>;
}
export interface CurrentEpochSubsidyAmountOptions {
	package: string;
	arguments: CurrentEpochSubsidyAmountArguments | [self: RawTransactionArgument<string>];
}
/** Returns the amount of stake subsidy to be added at the end of the current epoch. */
export function currentEpochSubsidyAmount(options: CurrentEpochSubsidyAmountOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'stake_subsidy',
			function: 'current_epoch_subsidy_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
