/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * Governance module handles the governance of the `Pool` that it's attached to.
 * Users with non zero stake can create proposals and vote on them. Winning
 * proposals are used to set the trade parameters for the next epoch.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as vec_map from './deps/sui/vec_map.js';
import * as trade_params from './trade_params.js';
const $moduleName = '@deepbook/core::governance';
export const Proposal: MoveStruct<{
    "taker_fee": ReturnType<typeof bcs.u64>;
    "maker_fee": ReturnType<typeof bcs.u64>;
    "stake_required": ReturnType<typeof bcs.u64>;
    "votes": ReturnType<typeof bcs.u64>;
}> = new MoveStruct({ name: `${$moduleName}::Proposal`, fields: {
        taker_fee: bcs.u64(),
        maker_fee: bcs.u64(),
        stake_required: bcs.u64(),
        votes: bcs.u64()
    } });
export const Governance: MoveStruct<{
    "epoch": ReturnType<typeof bcs.u64>;
    "whitelisted": ReturnType<typeof bcs.bool>;
    "stable": ReturnType<typeof bcs.bool>;
    "proposals": ReturnType<typeof vec_map.VecMap<typeof bcs.Address, typeof Proposal>>;
    "trade_params": typeof trade_params.TradeParams;
    "next_trade_params": typeof trade_params.TradeParams;
    "voting_power": ReturnType<typeof bcs.u64>;
    "quorum": ReturnType<typeof bcs.u64>;
}> = new MoveStruct({ name: `${$moduleName}::Governance`, fields: {
        /** Tracks refreshes. */
        epoch: bcs.u64(),
        /** If Pool is whitelisted. */
        whitelisted: bcs.bool(),
        /** If Pool is stable or volatile. */
        stable: bcs.bool(),
        /** List of proposals for the current epoch. */
        proposals: vec_map.VecMap(bcs.Address, Proposal),
        /** Trade parameters for the current epoch. */
        trade_params: trade_params.TradeParams,
        /** Trade parameters for the next epoch. */
        next_trade_params: trade_params.TradeParams,
        /** All voting power from the current stakes. */
        voting_power: bcs.u64(),
        /** Quorum for the current epoch. */
        quorum: bcs.u64()
    } });
export const TradeParamsUpdateEvent: MoveStruct<{
    "taker_fee": ReturnType<typeof bcs.u64>;
    "maker_fee": ReturnType<typeof bcs.u64>;
    "stake_required": ReturnType<typeof bcs.u64>;
}> = new MoveStruct({ name: `${$moduleName}::TradeParamsUpdateEvent`, fields: {
        taker_fee: bcs.u64(),
        maker_fee: bcs.u64(),
        stake_required: bcs.u64()
    } });