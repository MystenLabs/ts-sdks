// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi, SuiClientRegistration, SuiClientTypes } from '@mysten/sui/client';
import type { Transaction } from '@mysten/sui/transactions';

import type { QueryContext } from './queries/context.js';
import { AccountQueries } from './queries/accountQueries.js';
import { BalanceManagerQueries } from './queries/balanceManagerQueries.js';
import { MarginManagerQueries } from './queries/marginManagerQueries.js';
import { MarginPoolQueries } from './queries/marginPoolQueries.js';
import { OrderQueries } from './queries/orderQueries.js';
import { PoolQueries } from './queries/poolQueries.js';
import { PriceFeedQueries } from './queries/priceFeedQueries.js';
import { QuantityQueries } from './queries/quantityQueries.js';
import { ReferralQueries } from './queries/referralQueries.js';
import { RegistryQueries } from './queries/registryQueries.js';
import { TPSLQueries } from './queries/tpslQueries.js';
import { BalanceManagerContract } from './transactions/balanceManager.js';
import { DeepBookContract } from './transactions/deepbook.js';
import { DeepBookAdminContract } from './transactions/deepbookAdmin.js';
import { FlashLoanContract } from './transactions/flashLoans.js';
import { GovernanceContract } from './transactions/governance.js';
import { MarginAdminContract } from './transactions/marginAdmin.js';
import { MarginLiquidationsContract } from './transactions/marginLiquidations.js';
import { MarginMaintainerContract } from './transactions/marginMaintainer.js';
import { MarginManagerContract } from './transactions/marginManager.js';
import { MarginPoolContract } from './transactions/marginPool.js';
import { MarginRegistryContract } from './transactions/marginRegistry.js';
import { MarginTPSLContract } from './transactions/marginTPSL.js';
import { PoolProxyContract } from './transactions/poolProxy.js';
import type {
	AccountInfo,
	BalanceManager,
	BaseQuantityIn,
	BaseQuantityOut,
	BorrowedShares,
	CanPlaceLimitOrderParams,
	CanPlaceMarketOrderParams,
	DecodedOrderId,
	Level2Range,
	Level2TicksFromMid,
	LockedBalances,
	ManagerBalance,
	MarginManager,
	MarginManagerAssets,
	MarginManagerBalancesResult,
	MarginManagerDebts,
	MarginManagerState,
	OrderDeepRequiredResult,
	PoolBookParams,
	PoolDeepPrice,
	PoolTradeParams,
	QuantityOut,
	QuoteQuantityIn,
	QuoteQuantityOut,
	ReferralBalances,
	VaultBalances,
} from './types/index.js';
import { DeepBookConfig } from './utils/config.js';
import type { CoinMap, DeepbookPackageIds, PoolMap } from './utils/constants.js';
import { normalizeSuiAddress } from '@mysten/sui/utils';

export interface DeepBookCompatibleClient extends ClientWithCoreApi {}

export interface DeepBookOptions<Name = 'deepbook'> {
	address: string;
	balanceManagers?: { [key: string]: BalanceManager };
	marginManagers?: { [key: string]: MarginManager };
	coins?: CoinMap;
	pools?: PoolMap;
	adminCap?: string;
	marginAdminCap?: string;
	marginMaintainerCap?: string;
	packageIds?: DeepbookPackageIds;
	pyth?: { pythStateId: string; wormholeStateId: string };
	name?: Name;
}

export interface DeepBookClientOptions extends DeepBookOptions {
	client: DeepBookCompatibleClient;
	network: SuiClientTypes.Network;
}

export function deepbook<Name extends string = 'deepbook'>({
	name = 'deepbook' as Name,
	...options
}: DeepBookOptions<Name>): SuiClientRegistration<DeepBookCompatibleClient, Name, DeepBookClient> {
	return {
		name,
		register: (client) => {
			return new DeepBookClient({
				client,
				network: client.network,
				...options,
			});
		},
	};
}

/**
 * DeepBookClient class for managing DeepBook operations.
 */
export class DeepBookClient {
	#balanceManagerQueries: BalanceManagerQueries;
	#poolQueries: PoolQueries;
	#quantityQueries: QuantityQueries;
	#orderQueries: OrderQueries;
	#accountQueries: AccountQueries;
	#referralQueries: ReferralQueries;
	#priceFeedQueries: PriceFeedQueries;
	#marginPoolQueries: MarginPoolQueries;
	#marginManagerQueries: MarginManagerQueries;
	#tpslQueries: TPSLQueries;
	#registryQueries: RegistryQueries;

	balanceManager: BalanceManagerContract;
	deepBook: DeepBookContract;
	deepBookAdmin: DeepBookAdminContract;
	flashLoans: FlashLoanContract;
	governance: GovernanceContract;
	marginAdmin: MarginAdminContract;
	marginMaintainer: MarginMaintainerContract;
	marginPool: MarginPoolContract;
	marginManager: MarginManagerContract;
	marginRegistry: MarginRegistryContract;
	marginLiquidations: MarginLiquidationsContract;
	poolProxy: PoolProxyContract;
	marginTPSL: MarginTPSLContract;

	/**
	 * Creates a new DeepBookClient instance
	 */
	constructor({
		client,
		address,
		network,
		balanceManagers,
		marginManagers,
		coins,
		pools,
		adminCap,
		marginAdminCap,
		marginMaintainerCap,
		packageIds,
		pyth,
	}: DeepBookClientOptions) {
		const normalizedAddress = normalizeSuiAddress(address);
		const config = new DeepBookConfig({
			address: normalizedAddress,
			network,
			balanceManagers,
			marginManagers,
			coins,
			pools,
			adminCap,
			marginAdminCap,
			marginMaintainerCap,
			packageIds,
			pyth,
		});

		this.balanceManager = new BalanceManagerContract(config);
		this.deepBook = new DeepBookContract(config);
		this.deepBookAdmin = new DeepBookAdminContract(config);
		this.flashLoans = new FlashLoanContract(config);
		this.governance = new GovernanceContract(config);
		this.marginAdmin = new MarginAdminContract(config);
		this.marginMaintainer = new MarginMaintainerContract(config);
		this.marginPool = new MarginPoolContract(config);
		this.marginManager = new MarginManagerContract(config);
		this.marginRegistry = new MarginRegistryContract(config);
		this.marginLiquidations = new MarginLiquidationsContract(config);
		this.poolProxy = new PoolProxyContract(config);
		this.marginTPSL = new MarginTPSLContract(config);

		const ctx: QueryContext = {
			client,
			config,
			address: normalizedAddress,
			balanceManager: this.balanceManager,
			deepBook: this.deepBook,
			marginManager: this.marginManager,
			marginPool: this.marginPool,
			marginRegistry: this.marginRegistry,
			marginTPSL: this.marginTPSL,
		};

		this.#balanceManagerQueries = new BalanceManagerQueries(ctx);
		this.#poolQueries = new PoolQueries(ctx);
		this.#quantityQueries = new QuantityQueries(ctx);
		this.#orderQueries = new OrderQueries(ctx);
		this.#accountQueries = new AccountQueries(ctx);
		this.#referralQueries = new ReferralQueries(ctx);
		this.#priceFeedQueries = new PriceFeedQueries(ctx);
		this.#marginPoolQueries = new MarginPoolQueries(ctx);
		this.#marginManagerQueries = new MarginManagerQueries(ctx);
		this.#tpslQueries = new TPSLQueries(ctx);
		this.#registryQueries = new RegistryQueries(ctx);
	}

	// === Balance Manager Queries ===

	checkManagerBalance(managerKey: string, coinKey: string): Promise<ManagerBalance> {
		return this.#balanceManagerQueries.checkManagerBalance(managerKey, coinKey);
	}

	checkManagerBalanceWithAddress(managerAddress: string, coinKey: string): Promise<ManagerBalance> {
		return this.#balanceManagerQueries.checkManagerBalanceWithAddress(managerAddress, coinKey);
	}

	checkManagerBalancesWithAddress(
		managerAddresses: string[],
		coinKeys: string[],
	): Promise<Record<string, Record<string, number>>> {
		return this.#balanceManagerQueries.checkManagerBalancesWithAddress(managerAddresses, coinKeys);
	}

	getBalanceManagerIds(owner: string): Promise<string[]> {
		return this.#balanceManagerQueries.getBalanceManagerIds(owner);
	}

	accountExists(poolKey: string, managerKey: string): Promise<boolean> {
		return this.#balanceManagerQueries.accountExists(poolKey, managerKey);
	}

	// === Pool Queries ===

	whitelisted(poolKey: string): Promise<boolean> {
		return this.#poolQueries.whitelisted(poolKey);
	}

	vaultBalances(poolKey: string): Promise<VaultBalances> {
		return this.#poolQueries.vaultBalances(poolKey);
	}

	getPoolIdByAssets(baseType: string, quoteType: string): Promise<string> {
		return this.#poolQueries.getPoolIdByAssets(baseType, quoteType);
	}

	midPrice(poolKey: string): Promise<number> {
		return this.#poolQueries.midPrice(poolKey);
	}

	poolTradeParams(poolKey: string): Promise<PoolTradeParams> {
		return this.#poolQueries.poolTradeParams(poolKey);
	}

	poolBookParams(poolKey: string): Promise<PoolBookParams> {
		return this.#poolQueries.poolBookParams(poolKey);
	}

	stablePool(poolKey: string): Promise<boolean> {
		return this.#poolQueries.stablePool(poolKey);
	}

	registeredPool(poolKey: string): Promise<boolean> {
		return this.#poolQueries.registeredPool(poolKey);
	}

	poolTradeParamsNext(poolKey: string): Promise<PoolTradeParams> {
		return this.#poolQueries.poolTradeParamsNext(poolKey);
	}

	quorum(poolKey: string): Promise<number> {
		return this.#poolQueries.quorum(poolKey);
	}

	poolId(poolKey: string): Promise<string> {
		return this.#poolQueries.poolId(poolKey);
	}

	canPlaceLimitOrder(params: CanPlaceLimitOrderParams): Promise<boolean> {
		return this.#poolQueries.canPlaceLimitOrder(params);
	}

	canPlaceMarketOrder(params: CanPlaceMarketOrderParams): Promise<boolean> {
		return this.#poolQueries.canPlaceMarketOrder(params);
	}

	checkMarketOrderParams(poolKey: string, quantity: number | bigint): Promise<boolean> {
		return this.#poolQueries.checkMarketOrderParams(poolKey, quantity);
	}

	checkLimitOrderParams(
		poolKey: string,
		price: number | bigint,
		quantity: number | bigint,
		expireTimestamp: number,
	): Promise<boolean> {
		return this.#poolQueries.checkLimitOrderParams(poolKey, price, quantity, expireTimestamp);
	}

	// === Quantity Queries ===

	getQuoteQuantityOut(poolKey: string, baseQuantity: number | bigint): Promise<QuoteQuantityOut> {
		return this.#quantityQueries.getQuoteQuantityOut(poolKey, baseQuantity);
	}

	getBaseQuantityOut(poolKey: string, quoteQuantity: number | bigint): Promise<BaseQuantityOut> {
		return this.#quantityQueries.getBaseQuantityOut(poolKey, quoteQuantity);
	}

	getQuantityOut(
		poolKey: string,
		baseQuantity: number | bigint,
		quoteQuantity: number | bigint,
	): Promise<QuantityOut> {
		return this.#quantityQueries.getQuantityOut(poolKey, baseQuantity, quoteQuantity);
	}

	getQuoteQuantityOutInputFee(
		poolKey: string,
		baseQuantity: number | bigint,
	): Promise<QuoteQuantityOut> {
		return this.#quantityQueries.getQuoteQuantityOutInputFee(poolKey, baseQuantity);
	}

	getBaseQuantityOutInputFee(
		poolKey: string,
		quoteQuantity: number | bigint,
	): Promise<BaseQuantityOut> {
		return this.#quantityQueries.getBaseQuantityOutInputFee(poolKey, quoteQuantity);
	}

	getQuantityOutInputFee(
		poolKey: string,
		baseQuantity: number | bigint,
		quoteQuantity: number | bigint,
	): Promise<QuantityOut> {
		return this.#quantityQueries.getQuantityOutInputFee(poolKey, baseQuantity, quoteQuantity);
	}

	getBaseQuantityIn(
		poolKey: string,
		targetQuoteQuantity: number | bigint,
		payWithDeep: boolean,
	): Promise<BaseQuantityIn> {
		return this.#quantityQueries.getBaseQuantityIn(poolKey, targetQuoteQuantity, payWithDeep);
	}

	getQuoteQuantityIn(
		poolKey: string,
		targetBaseQuantity: number | bigint,
		payWithDeep: boolean,
	): Promise<QuoteQuantityIn> {
		return this.#quantityQueries.getQuoteQuantityIn(poolKey, targetBaseQuantity, payWithDeep);
	}

	getOrderDeepRequired(
		poolKey: string,
		baseQuantity: number | bigint,
		price: number | bigint,
	): Promise<OrderDeepRequiredResult> {
		return this.#quantityQueries.getOrderDeepRequired(poolKey, baseQuantity, price);
	}

	// === Order Queries ===

	accountOpenOrders(poolKey: string, managerKey: string): Promise<string[]> {
		return this.#orderQueries.accountOpenOrders(poolKey, managerKey);
	}

	getOrder(poolKey: string, orderId: string) {
		return this.#orderQueries.getOrder(poolKey, orderId);
	}

	getOrderNormalized(poolKey: string, orderId: string) {
		return this.#orderQueries.getOrderNormalized(poolKey, orderId);
	}

	getOrders(poolKey: string, orderIds: string[]) {
		return this.#orderQueries.getOrders(poolKey, orderIds);
	}

	getLevel2Range(
		poolKey: string,
		priceLow: number | bigint,
		priceHigh: number | bigint,
		isBid: boolean,
	): Promise<Level2Range> {
		return this.#orderQueries.getLevel2Range(poolKey, priceLow, priceHigh, isBid);
	}

	getLevel2TicksFromMid(poolKey: string, ticks: number): Promise<Level2TicksFromMid> {
		return this.#orderQueries.getLevel2TicksFromMid(poolKey, ticks);
	}

	getAccountOrderDetails(poolKey: string, managerKey: string) {
		return this.#orderQueries.getAccountOrderDetails(poolKey, managerKey);
	}

	// === Account Queries ===

	account(poolKey: string, managerKey: string): Promise<AccountInfo> {
		return this.#accountQueries.account(poolKey, managerKey);
	}

	lockedBalance(poolKey: string, balanceManagerKey: string): Promise<LockedBalances> {
		return this.#accountQueries.lockedBalance(poolKey, balanceManagerKey);
	}

	getPoolDeepPrice(poolKey: string): Promise<PoolDeepPrice> {
		return this.#accountQueries.getPoolDeepPrice(poolKey);
	}

	// === Referral Queries ===

	balanceManagerReferralOwner(referral: string): Promise<string> {
		return this.#referralQueries.balanceManagerReferralOwner(referral);
	}

	getPoolReferralBalances(poolKey: string, referral: string): Promise<ReferralBalances> {
		return this.#referralQueries.getPoolReferralBalances(poolKey, referral);
	}

	balanceManagerReferralPoolId(referral: string): Promise<string> {
		return this.#referralQueries.balanceManagerReferralPoolId(referral);
	}

	poolReferralMultiplier(poolKey: string, referral: string): Promise<number> {
		return this.#referralQueries.poolReferralMultiplier(poolKey, referral);
	}

	getBalanceManagerReferralId(managerKey: string, poolKey: string): Promise<string | null> {
		return this.#referralQueries.getBalanceManagerReferralId(managerKey, poolKey);
	}

	// === Price Feed Queries ===

	getPriceInfoObject(tx: Transaction, coinKey: string): Promise<string> {
		return this.#priceFeedQueries.getPriceInfoObject(tx, coinKey);
	}

	getPriceInfoObjects(tx: Transaction, coinKeys: string[]): Promise<Record<string, string>> {
		return this.#priceFeedQueries.getPriceInfoObjects(tx, coinKeys);
	}

	getPriceInfoObjectAge(coinKey: string): Promise<number> {
		return this.#priceFeedQueries.getPriceInfoObjectAge(coinKey);
	}

	// === Margin Pool Queries ===

	getMarginPoolId(coinKey: string): Promise<string> {
		return this.#marginPoolQueries.getMarginPoolId(coinKey);
	}

	isDeepbookPoolAllowed(coinKey: string, deepbookPoolId: string): Promise<boolean> {
		return this.#marginPoolQueries.isDeepbookPoolAllowed(coinKey, deepbookPoolId);
	}

	getMarginPoolTotalSupply(coinKey: string, decimals: number = 6): Promise<string> {
		return this.#marginPoolQueries.getMarginPoolTotalSupply(coinKey, decimals);
	}

	getMarginPoolSupplyShares(coinKey: string, decimals: number = 6): Promise<string> {
		return this.#marginPoolQueries.getMarginPoolSupplyShares(coinKey, decimals);
	}

	getMarginPoolTotalBorrow(coinKey: string, decimals: number = 6): Promise<string> {
		return this.#marginPoolQueries.getMarginPoolTotalBorrow(coinKey, decimals);
	}

	getMarginPoolBorrowShares(coinKey: string, decimals: number = 6): Promise<string> {
		return this.#marginPoolQueries.getMarginPoolBorrowShares(coinKey, decimals);
	}

	getMarginPoolLastUpdateTimestamp(coinKey: string): Promise<number> {
		return this.#marginPoolQueries.getMarginPoolLastUpdateTimestamp(coinKey);
	}

	getMarginPoolSupplyCap(coinKey: string, decimals: number = 6): Promise<string> {
		return this.#marginPoolQueries.getMarginPoolSupplyCap(coinKey, decimals);
	}

	getMarginPoolMaxUtilizationRate(coinKey: string): Promise<number> {
		return this.#marginPoolQueries.getMarginPoolMaxUtilizationRate(coinKey);
	}

	getMarginPoolProtocolSpread(coinKey: string): Promise<number> {
		return this.#marginPoolQueries.getMarginPoolProtocolSpread(coinKey);
	}

	getMarginPoolMinBorrow(coinKey: string, decimals: number = 6): Promise<string> {
		return this.#marginPoolQueries.getMarginPoolMinBorrow(coinKey, decimals);
	}

	getMarginPoolInterestRate(coinKey: string): Promise<number> {
		return this.#marginPoolQueries.getMarginPoolInterestRate(coinKey);
	}

	getUserSupplyShares(
		coinKey: string,
		supplierCapId: string,
		decimals: number = 6,
	): Promise<string> {
		return this.#marginPoolQueries.getUserSupplyShares(coinKey, supplierCapId, decimals);
	}

	getUserSupplyAmount(
		coinKey: string,
		supplierCapId: string,
		decimals: number = 6,
	): Promise<string> {
		return this.#marginPoolQueries.getUserSupplyAmount(coinKey, supplierCapId, decimals);
	}

	// === Margin Manager Queries ===

	getMarginManagerOwner(marginManagerKey: string): Promise<string> {
		return this.#marginManagerQueries.getMarginManagerOwner(marginManagerKey);
	}

	getMarginManagerDeepbookPool(marginManagerKey: string): Promise<string> {
		return this.#marginManagerQueries.getMarginManagerDeepbookPool(marginManagerKey);
	}

	getMarginManagerMarginPoolId(marginManagerKey: string): Promise<string | null> {
		return this.#marginManagerQueries.getMarginManagerMarginPoolId(marginManagerKey);
	}

	getMarginManagerBorrowedShares(marginManagerKey: string): Promise<BorrowedShares> {
		return this.#marginManagerQueries.getMarginManagerBorrowedShares(marginManagerKey);
	}

	getMarginManagerBorrowedBaseShares(marginManagerKey: string): Promise<string> {
		return this.#marginManagerQueries.getMarginManagerBorrowedBaseShares(marginManagerKey);
	}

	getMarginManagerBorrowedQuoteShares(marginManagerKey: string): Promise<string> {
		return this.#marginManagerQueries.getMarginManagerBorrowedQuoteShares(marginManagerKey);
	}

	getMarginManagerHasBaseDebt(marginManagerKey: string): Promise<boolean> {
		return this.#marginManagerQueries.getMarginManagerHasBaseDebt(marginManagerKey);
	}

	getMarginManagerBalanceManagerId(marginManagerAddress: string): Promise<string> {
		return this.#marginManagerQueries.getMarginManagerBalanceManagerId(marginManagerAddress);
	}

	getMarginManagerAssets(
		marginManagerKey: string,
		decimals: number = 6,
	): Promise<MarginManagerAssets> {
		return this.#marginManagerQueries.getMarginManagerAssets(marginManagerKey, decimals);
	}

	getMarginManagerDebts(
		marginManagerKey: string,
		decimals: number = 6,
	): Promise<MarginManagerDebts> {
		return this.#marginManagerQueries.getMarginManagerDebts(marginManagerKey, decimals);
	}

	getMarginManagerState(
		marginManagerKey: string,
		decimals: number = 6,
	): Promise<MarginManagerState> {
		return this.#marginManagerQueries.getMarginManagerState(marginManagerKey, decimals);
	}

	getMarginManagerStates(
		marginManagers: Record<string, string>,
		decimals: number = 6,
	): Promise<Record<string, MarginManagerState>> {
		return this.#marginManagerQueries.getMarginManagerStates(marginManagers, decimals);
	}

	getMarginManagerBaseBalance(marginManagerKey: string, decimals: number = 9): Promise<string> {
		return this.#marginManagerQueries.getMarginManagerBaseBalance(marginManagerKey, decimals);
	}

	getMarginManagerQuoteBalance(marginManagerKey: string, decimals: number = 9): Promise<string> {
		return this.#marginManagerQueries.getMarginManagerQuoteBalance(marginManagerKey, decimals);
	}

	getMarginManagerDeepBalance(marginManagerKey: string, decimals: number = 6): Promise<string> {
		return this.#marginManagerQueries.getMarginManagerDeepBalance(marginManagerKey, decimals);
	}

	getMarginManagerBalances(
		marginManagers: Record<string, string>,
		decimals: number = 9,
	): Promise<Record<string, MarginManagerBalancesResult>> {
		return this.#marginManagerQueries.getMarginManagerBalances(marginManagers, decimals);
	}

	// === TPSL Queries ===

	getConditionalOrderIds(marginManagerKey: string): Promise<string[]> {
		return this.#tpslQueries.getConditionalOrderIds(marginManagerKey);
	}

	getLowestTriggerAbovePrice(marginManagerKey: string): Promise<bigint> {
		return this.#tpslQueries.getLowestTriggerAbovePrice(marginManagerKey);
	}

	getHighestTriggerBelowPrice(marginManagerKey: string): Promise<bigint> {
		return this.#tpslQueries.getHighestTriggerBelowPrice(marginManagerKey);
	}

	// === Registry Queries ===

	isPoolEnabledForMargin(poolKey: string): Promise<boolean> {
		return this.#registryQueries.isPoolEnabledForMargin(poolKey);
	}

	getMarginManagerIdsForOwner(owner: string): Promise<string[]> {
		return this.#registryQueries.getMarginManagerIdsForOwner(owner);
	}

	getBaseMarginPoolId(poolKey: string): Promise<string> {
		return this.#registryQueries.getBaseMarginPoolId(poolKey);
	}

	getQuoteMarginPoolId(poolKey: string): Promise<string> {
		return this.#registryQueries.getQuoteMarginPoolId(poolKey);
	}

	getMinWithdrawRiskRatio(poolKey: string): Promise<number> {
		return this.#registryQueries.getMinWithdrawRiskRatio(poolKey);
	}

	getMinBorrowRiskRatio(poolKey: string): Promise<number> {
		return this.#registryQueries.getMinBorrowRiskRatio(poolKey);
	}

	getLiquidationRiskRatio(poolKey: string): Promise<number> {
		return this.#registryQueries.getLiquidationRiskRatio(poolKey);
	}

	getTargetLiquidationRiskRatio(poolKey: string): Promise<number> {
		return this.#registryQueries.getTargetLiquidationRiskRatio(poolKey);
	}

	getUserLiquidationReward(poolKey: string): Promise<number> {
		return this.#registryQueries.getUserLiquidationReward(poolKey);
	}

	getPoolLiquidationReward(poolKey: string): Promise<number> {
		return this.#registryQueries.getPoolLiquidationReward(poolKey);
	}

	getAllowedMaintainers(): Promise<string[]> {
		return this.#registryQueries.getAllowedMaintainers();
	}

	getAllowedPauseCaps(): Promise<string[]> {
		return this.#registryQueries.getAllowedPauseCaps();
	}

	// === Synchronous Utilities ===

	decodeOrderId(encodedOrderId: bigint): DecodedOrderId {
		const isBid = encodedOrderId >> 127n === 0n;
		const price = Number((encodedOrderId >> 64n) & ((1n << 63n) - 1n));
		const orderId = Number(encodedOrderId & ((1n << 64n) - 1n));

		return { isBid, price, orderId };
	}
}
