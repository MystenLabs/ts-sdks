// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import { Account, Order, OrderDeepPrice, VecSet } from './types/bcs.js';
import type { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';

import { BalanceManagerContract } from './transactions/balanceManager.js';
import { DeepBookContract } from './transactions/deepbook.js';
import { DeepBookAdminContract } from './transactions/deepbookAdmin.js';
import { FlashLoanContract } from './transactions/flashLoans.js';
import { GovernanceContract } from './transactions/governance.js';
import type { BalanceManager, Environment, MarginManager } from './types/index.js';
import {
	DEEP_SCALAR,
	DeepBookConfig,
	FLOAT_SCALAR,
	PRICE_INFO_OBJECT_MAX_AGE,
} from './utils/config.js';
import type { CoinMap, PoolMap } from './utils/constants.js';
import { MarginAdminContract } from './transactions/marginAdmin.js';
import { MarginMaintainerContract } from './transactions/marginMaintainer.js';
import { MarginPoolContract } from './transactions/marginPool.js';
import { MarginManagerContract } from './transactions/marginManager.js';
import { SuiPriceServiceConnection } from './pyth/pyth.js';
import { SuiPythClient } from './pyth/pyth.js';
import { PoolProxyContract } from './transactions/poolProxy.js';

/**
 * DeepBookClient class for managing DeepBook operations.
 */
export class DeepBookClient {
	client: SuiJsonRpcClient;
	#config: DeepBookConfig;
	#address: string;
	balanceManager: BalanceManagerContract;
	deepBook: DeepBookContract;
	deepBookAdmin: DeepBookAdminContract;
	flashLoans: FlashLoanContract;
	governance: GovernanceContract;
	marginAdmin: MarginAdminContract;
	marginMaintainer: MarginMaintainerContract;
	marginPool: MarginPoolContract;
	marginManager: MarginManagerContract;
	poolProxy: PoolProxyContract;

	/**
	 * @param {SuiJsonRpcClient} client SuiJsonRpcClient instance
	 * @param {string} address Address of the client
	 * @param {Environment} env Environment configuration
	 * @param {Object.<string, BalanceManager>} [balanceManagers] Optional initial BalanceManager map
	 * @param {Object.<string, MarginManager>} [marginManagers] Optional initial MarginManager map
	 * @param {CoinMap} [coins] Optional initial CoinMap
	 * @param {PoolMap} [pools] Optional initial PoolMap
	 * @param {string} [adminCap] Optional admin capability
	 * @param {string} [marginAdminCap] Optional margin admin capability
	 * @param {string} [marginMaintainerCap] Optional margin maintainer capability
	 */
	constructor({
		client,
		address,
		env,
		balanceManagers,
		marginManagers,
		coins,
		pools,
		adminCap,
		marginAdminCap,
		marginMaintainerCap,
	}: {
		client: SuiJsonRpcClient;
		address: string;
		env: Environment;
		balanceManagers?: { [key: string]: BalanceManager };
		marginManagers?: { [key: string]: MarginManager };
		coins?: CoinMap;
		pools?: PoolMap;
		adminCap?: string;
		marginAdminCap?: string;
		marginMaintainerCap?: string;
	}) {
		this.client = client;
		this.#address = normalizeSuiAddress(address);
		this.#config = new DeepBookConfig({
			address: this.#address,
			env,
			balanceManagers,
			marginManagers,
			coins,
			pools,
			adminCap,
			marginAdminCap,
			marginMaintainerCap,
		});
		this.balanceManager = new BalanceManagerContract(this.#config);
		this.deepBook = new DeepBookContract(this.#config);
		this.deepBookAdmin = new DeepBookAdminContract(this.#config);
		this.flashLoans = new FlashLoanContract(this.#config);
		this.governance = new GovernanceContract(this.#config);
		this.marginAdmin = new MarginAdminContract(this.#config);
		this.marginMaintainer = new MarginMaintainerContract(this.#config);
		this.marginPool = new MarginPoolContract(this.#config);
		this.marginManager = new MarginManagerContract(this.#config);
		this.poolProxy = new PoolProxyContract(this.#config);
	}

	/**
	 * @description Check the balance of a balance manager for a specific coin
	 * @param {string} managerKey Key of the balance manager
	 * @param {string} coinKey Key of the coin
	 * @returns {Promise<{ coinType: string, balance: number }>} An object with coin type and balance
	 */
	async checkManagerBalance(managerKey: string, coinKey: string) {
		const tx = new Transaction();
		const coin = this.#config.getCoin(coinKey);

		tx.add(this.balanceManager.checkManagerBalance(managerKey, coinKey));
		const res = await this.client.devInspectTransactionBlock({
			sender: this.#address,
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const parsed_balance = bcs.U64.parse(new Uint8Array(bytes));
		const balanceNumber = Number(parsed_balance);
		const adjusted_balance = balanceNumber / coin.scalar;

		return {
			coinType: coin.type,
			balance: Number(adjusted_balance.toFixed(9)),
		};
	}

	/**
	 * @description Check if a pool is whitelisted
	 * @param {string} poolKey Key of the pool
	 * @returns {Promise<boolean>} Boolean indicating if the pool is whitelisted
	 */
	async whitelisted(poolKey: string) {
		const tx = new Transaction();

		tx.add(this.deepBook.whitelisted(poolKey));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const whitelisted = bcs.Bool.parse(new Uint8Array(bytes));

		return whitelisted;
	}

	/**
	 * @description Get the quote quantity out for a given base quantity
	 * @param {string} poolKey Key of the pool
	 * @param {number} baseQuantity Base quantity to convert
	 * @returns {Promise<{ baseQuantity: number, baseOut: number, quoteOut: number, deepRequired: number }>}
	 * An object with base quantity, base out, quote out, and deep required for the dry run
	 */
	async getQuoteQuantityOut(poolKey: string, baseQuantity: number) {
		const tx = new Transaction();
		const pool = this.#config.getPool(poolKey);
		const baseScalar = this.#config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.deepBook.getQuoteQuantityOut(poolKey, baseQuantity));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const baseOut = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![0][0])));
		const quoteOut = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![1][0])));
		const deepRequired = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![2][0])));

		return {
			baseQuantity,
			baseOut: Number((baseOut / baseScalar).toFixed(9)),
			quoteOut: Number((quoteOut / quoteScalar).toFixed(9)),
			deepRequired: Number((deepRequired / DEEP_SCALAR).toFixed(9)),
		};
	}

	/**
	 * @description Get the base quantity out for a given quote quantity
	 * @param {string} poolKey Key of the pool
	 * @param {number} quoteQuantity Quote quantity to convert
	 * @returns {Promise<{ quoteQuantity: number, baseOut: number, quoteOut: number, deepRequired: number }>}
	 * An object with quote quantity, base out, quote out, and deep required for the dry run
	 */
	async getBaseQuantityOut(poolKey: string, quoteQuantity: number) {
		const tx = new Transaction();
		const pool = this.#config.getPool(poolKey);
		const baseScalar = this.#config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.deepBook.getBaseQuantityOut(poolKey, quoteQuantity));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const baseOut = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![0][0])));
		const quoteOut = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![1][0])));
		const deepRequired = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![2][0])));

		return {
			quoteQuantity: quoteQuantity,
			baseOut: Number((baseOut / baseScalar).toFixed(9)),
			quoteOut: Number((quoteOut / quoteScalar).toFixed(9)),
			deepRequired: Number((deepRequired / DEEP_SCALAR).toFixed(9)),
		};
	}

	/**
	 * @description Get the output quantities for given base and quote quantities. Only one quantity can be non-zero
	 * @param {string} poolKey Key of the pool
	 * @param {number} baseQuantity Base quantity to convert
	 * @param {number} quoteQuantity Quote quantity to convert
	 * @returns {Promise<{ baseQuantity: number, quoteQuantity: number, baseOut: number, quoteOut: number, deepRequired: number }>}
	 * An object with base quantity, quote quantity, base out, quote out, and deep required for the dry run
	 */
	async getQuantityOut(poolKey: string, baseQuantity: number, quoteQuantity: number) {
		const tx = new Transaction();
		const pool = this.#config.getPool(poolKey);
		const baseScalar = this.#config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.deepBook.getQuantityOut(poolKey, baseQuantity, quoteQuantity));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const baseOut = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![0][0])));
		const quoteOut = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![1][0])));
		const deepRequired = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![2][0])));

		return {
			baseQuantity,
			quoteQuantity,
			baseOut: Number((baseOut / baseScalar).toFixed(9)),
			quoteOut: Number((quoteOut / quoteScalar).toFixed(9)),
			deepRequired: Number((deepRequired / DEEP_SCALAR).toFixed(9)),
		};
	}

	/**
	 * @description Get open orders for a balance manager in a pool
	 * @param {string} poolKey Key of the pool
	 * @param {string} managerKey Key of the balance manager
	 * @returns {Promise<Array>} An array of open order IDs
	 */
	async accountOpenOrders(poolKey: string, managerKey: string) {
		const tx = new Transaction();

		tx.add(this.deepBook.accountOpenOrders(poolKey, managerKey));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const order_ids = res.results![0].returnValues![0][0];

		return VecSet(bcs.u128()).parse(new Uint8Array(order_ids)).contents;
	}

	/**
	 * @description Get the order information for a specific order in a pool
	 * @param {string} poolKey Key of the pool
	 * @param {string} orderId Order ID
	 * @returns {Promise<Object>} A promise that resolves to an object containing the order information
	 */
	async getOrder(poolKey: string, orderId: string) {
		const tx = new Transaction();

		tx.add(this.deepBook.getOrder(poolKey, orderId));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		try {
			const orderInformation = res.results![0].returnValues![0][0];
			return Order.parse(new Uint8Array(orderInformation));
		} catch {
			return null;
		}
	}

	/**
	 * @description Get the order information for a specific order in a pool, with normalized price
	 * @param {string} poolKey Key of the pool
	 * @param {string} orderId Order ID
	 * @returns {Promise<Object>} A promise that resolves to an object containing the order information with normalized price
	 */
	async getOrderNormalized(poolKey: string, orderId: string) {
		const tx = new Transaction();
		tx.add(this.deepBook.getOrder(poolKey, orderId));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		try {
			const orderInformation = res.results![0].returnValues![0][0];
			const orderInfo = Order.parse(new Uint8Array(orderInformation));

			if (!orderInfo) {
				return null;
			}
			const baseCoin = this.#config.getCoin(this.#config.getPool(poolKey).baseCoin);
			const quoteCoin = this.#config.getCoin(this.#config.getPool(poolKey).quoteCoin);
			const { isBid, price: rawPrice } = this.decodeOrderId(BigInt(orderInfo.order_id));
			const normalizedPrice = (rawPrice * baseCoin.scalar) / quoteCoin.scalar / FLOAT_SCALAR;

			const normalizedOrderInfo = {
				...orderInfo,
				quantity: String((Number(orderInfo.quantity) / baseCoin.scalar).toFixed(9)),
				filled_quantity: String((Number(orderInfo.filled_quantity) / baseCoin.scalar).toFixed(9)),
				order_deep_price: {
					...orderInfo.order_deep_price,
					deep_per_asset: String(
						(Number(orderInfo.order_deep_price.deep_per_asset) / DEEP_SCALAR).toFixed(9),
					),
				},
				isBid,
				normalized_price: normalizedPrice.toFixed(9),
			};
			return normalizedOrderInfo;
		} catch {
			return null;
		}
	}

	/**
	 * @description Retrieves information for multiple specific orders in a pool.
	 * @param {string} poolKey - The key identifying the pool from which to retrieve order information.
	 * @param {string[]} orderIds - List of order IDs to retrieve information for.
	 * @returns {Promise<Object[] | null>} A promise that resolves to an array of order objects, each containing details such as
	 * balance manager ID, order ID, client order ID, quantity, filled quantity, fee information, order price, epoch, status,
	 * and expiration timestamp. Returns `null` if the retrieval fails.
	 */
	async getOrders(poolKey: string, orderIds: string[]) {
		const tx = new Transaction();

		tx.add(this.deepBook.getOrders(poolKey, orderIds));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		try {
			const orderInformation = res.results![0].returnValues![0][0];
			return bcs.vector(Order).parse(new Uint8Array(orderInformation));
		} catch {
			return null;
		}
	}

	/**
	 * @description Get level 2 order book specifying range of price
	 * @param {string} poolKey Key of the pool
	 * @param {number} priceLow Lower bound of the price range
	 * @param {number} priceHigh Upper bound of the price range
	 * @param {boolean} isBid Whether to get bid or ask orders
	 * @returns {Promise<{ prices: Array<number>, quantities: Array<number> }>}
	 * An object with arrays of prices and quantities
	 */
	async getLevel2Range(poolKey: string, priceLow: number, priceHigh: number, isBid: boolean) {
		const tx = new Transaction();
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(this.deepBook.getLevel2Range(poolKey, priceLow, priceHigh, isBid));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const prices = res.results![0].returnValues![0][0];
		const parsed_prices = bcs.vector(bcs.u64()).parse(new Uint8Array(prices));
		const quantities = res.results![0].returnValues![1][0];
		const parsed_quantities = bcs.vector(bcs.u64()).parse(new Uint8Array(quantities));

		return {
			prices: parsed_prices.map((price) =>
				Number(((Number(price) / FLOAT_SCALAR / quoteCoin.scalar) * baseCoin.scalar).toFixed(9)),
			),
			quantities: parsed_quantities.map((price) =>
				Number((Number(price) / baseCoin.scalar).toFixed(9)),
			),
		};
	}

	/**
	 * @description Get level 2 order book ticks from mid-price for a pool
	 * @param {string} poolKey Key of the pool
	 * @param {number} ticks Number of ticks from mid-price
	 * @returns {Promise<{ bid_prices: Array<number>, bid_quantities: Array<number>, ask_prices: Array<number>, ask_quantities: Array<number> }>}
	 * An object with arrays of prices and quantities
	 */
	async getLevel2TicksFromMid(poolKey: string, ticks: number) {
		const tx = new Transaction();
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(this.deepBook.getLevel2TicksFromMid(poolKey, ticks));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bid_prices = res.results![0].returnValues![0][0];
		const bid_parsed_prices = bcs.vector(bcs.u64()).parse(new Uint8Array(bid_prices));
		const bid_quantities = res.results![0].returnValues![1][0];
		const bid_parsed_quantities = bcs.vector(bcs.u64()).parse(new Uint8Array(bid_quantities));

		const ask_prices = res.results![0].returnValues![2][0];
		const ask_parsed_prices = bcs.vector(bcs.u64()).parse(new Uint8Array(ask_prices));
		const ask_quantities = res.results![0].returnValues![3][0];
		const ask_parsed_quantities = bcs.vector(bcs.u64()).parse(new Uint8Array(ask_quantities));

		return {
			bid_prices: bid_parsed_prices.map((price) =>
				Number(((Number(price) / FLOAT_SCALAR / quoteCoin.scalar) * baseCoin.scalar).toFixed(9)),
			),
			bid_quantities: bid_parsed_quantities.map((quantity) =>
				Number((Number(quantity) / baseCoin.scalar).toFixed(9)),
			),
			ask_prices: ask_parsed_prices.map((price) =>
				Number(((Number(price) / FLOAT_SCALAR / quoteCoin.scalar) * baseCoin.scalar).toFixed(9)),
			),
			ask_quantities: ask_parsed_quantities.map((quantity) =>
				Number((Number(quantity) / baseCoin.scalar).toFixed(9)),
			),
		};
	}

	/**
	 * @description Get the vault balances for a pool
	 * @param {string} poolKey Key of the pool
	 * @returns {Promise<{ base: number, quote: number, deep: number }>}
	 * An object with base, quote, and deep balances in the vault
	 */
	async vaultBalances(poolKey: string) {
		const tx = new Transaction();
		const pool = this.#config.getPool(poolKey);
		const baseScalar = this.#config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.deepBook.vaultBalances(poolKey));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const baseInVault = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![0][0])));
		const quoteInVault = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![1][0])));
		const deepInVault = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![2][0])));

		return {
			base: Number((baseInVault / baseScalar).toFixed(9)),
			quote: Number((quoteInVault / quoteScalar).toFixed(9)),
			deep: Number((deepInVault / DEEP_SCALAR).toFixed(9)),
		};
	}

	/**
	 * @description Get the pool ID by asset types
	 * @param {string} baseType Type of the base asset
	 * @param {string} quoteType Type of the quote asset
	 * @returns {Promise<string>} The address of the pool
	 */
	async getPoolIdByAssets(baseType: string, quoteType: string) {
		const tx = new Transaction();
		tx.add(this.deepBook.getPoolIdByAssets(baseType, quoteType));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const address = bcs.Address.parse(new Uint8Array(res.results![0].returnValues![0][0]));

		return address;
	}

	/**
	 * @description Get the mid price for a pool
	 * @param {string} poolKey Key of the pool
	 * @returns {Promise<number>} The mid price
	 */
	async midPrice(poolKey: string) {
		const tx = new Transaction();
		const pool = this.#config.getPool(poolKey);
		tx.add(this.deepBook.midPrice(poolKey));

		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const parsed_mid_price = Number(bcs.U64.parse(new Uint8Array(bytes)));
		const adjusted_mid_price =
			(parsed_mid_price * baseCoin.scalar) / quoteCoin.scalar / FLOAT_SCALAR;

		return Number(adjusted_mid_price.toFixed(9));
	}

	/**
	 * @description Get the trade parameters for a given pool, including taker fee, maker fee, and stake required.
	 * @param {string} poolKey Key of the pool
	 * @returns {Promise<{ takerFee: number, makerFee: number, stakeRequired: number }>}
	 */
	async poolTradeParams(poolKey: string) {
		const tx = new Transaction();

		tx.add(this.deepBook.poolTradeParams(poolKey));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const takerFee = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![0][0])));
		const makerFee = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![1][0])));
		const stakeRequired = Number(
			bcs.U64.parse(new Uint8Array(res.results![0].returnValues![2][0])),
		);

		return {
			takerFee: Number(takerFee / FLOAT_SCALAR),
			makerFee: Number(makerFee / FLOAT_SCALAR),
			stakeRequired: Number(stakeRequired / DEEP_SCALAR),
		};
	}

	/**
	 * @description Get the trade parameters for a given pool, including tick size, lot size, and min size.
	 * @param {string} poolKey Key of the pool
	 * @returns {Promise<{ tickSize: number, lotSize: number, minSize: number }>}
	 */
	async poolBookParams(poolKey: string) {
		const tx = new Transaction();
		const pool = this.#config.getPool(poolKey);
		const baseScalar = this.#config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.deepBook.poolBookParams(poolKey));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const tickSize = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![0][0])));
		const lotSize = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![1][0])));
		const minSize = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![2][0])));

		return {
			tickSize: Number((tickSize * baseScalar) / quoteScalar / FLOAT_SCALAR),
			lotSize: Number(lotSize / baseScalar),
			minSize: Number(minSize / baseScalar),
		};
	}

	/**
	 * @description Get the account information for a given pool and balance manager
	 * @param {string} poolKey Key of the pool
	 * @param {string} managerKey The key of the BalanceManager
	 * @returns {Promise<Object>} A promise that resolves to an object containing the account information
	 */
	async account(poolKey: string, managerKey: string) {
		const tx = new Transaction();
		const pool = this.#config.getPool(poolKey);
		const baseScalar = this.#config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.deepBook.account(poolKey, managerKey));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const accountInformation = res.results![0].returnValues![0][0];
		const accountInfo = Account.parse(new Uint8Array(accountInformation));

		return {
			epoch: accountInfo.epoch,
			open_orders: accountInfo.open_orders,
			taker_volume: Number(accountInfo.taker_volume) / baseScalar,
			maker_volume: Number(accountInfo.maker_volume) / baseScalar,
			active_stake: Number(accountInfo.active_stake) / DEEP_SCALAR,
			inactive_stake: Number(accountInfo.inactive_stake) / DEEP_SCALAR,
			created_proposal: accountInfo.created_proposal,
			voted_proposal: accountInfo.voted_proposal,
			unclaimed_rebates: {
				base: Number(accountInfo.unclaimed_rebates.base) / baseScalar,
				quote: Number(accountInfo.unclaimed_rebates.quote) / quoteScalar,
				deep: Number(accountInfo.unclaimed_rebates.deep) / DEEP_SCALAR,
			},
			settled_balances: {
				base: Number(accountInfo.settled_balances.base) / baseScalar,
				quote: Number(accountInfo.settled_balances.quote) / quoteScalar,
				deep: Number(accountInfo.settled_balances.deep) / DEEP_SCALAR,
			},
			owed_balances: {
				base: Number(accountInfo.owed_balances.base) / baseScalar,
				quote: Number(accountInfo.owed_balances.quote) / quoteScalar,
				deep: Number(accountInfo.owed_balances.deep) / DEEP_SCALAR,
			},
		};
	}

	/**
	 * @description Get the locked balances for a pool and balance manager
	 * @param {string} poolKey Key of the pool
	 * @param {string} managerKey The key of the BalanceManager
	 * @returns {Promise<{ base: number, quote: number, deep: number }>}
	 * An object with base, quote, and deep locked for the balance manager in the pool
	 */
	async lockedBalance(poolKey: string, balanceManagerKey: string) {
		const tx = new Transaction();
		const pool = this.#config.getPool(poolKey);
		const baseScalar = this.#config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.deepBook.lockedBalance(poolKey, balanceManagerKey));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const baseLocked = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![0][0])));
		const quoteLocked = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![1][0])));
		const deepLocked = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![2][0])));

		return {
			base: Number((baseLocked / baseScalar).toFixed(9)),
			quote: Number((quoteLocked / quoteScalar).toFixed(9)),
			deep: Number((deepLocked / DEEP_SCALAR).toFixed(9)),
		};
	}

	/**
	 * @description Get the DEEP price conversion for a pool
	 * @param {string} poolKey Key of the pool
	 * @returns {Promise<{ asset_is_base: bool, deep_per_quote: number }>} Deep price conversion
	 */
	async getPoolDeepPrice(poolKey: string) {
		const tx = new Transaction();
		const pool = this.#config.getPool(poolKey);
		tx.add(this.deepBook.getPoolDeepPrice(poolKey));

		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const deepCoin = this.#config.getCoin('DEEP');

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const poolDeepPriceBytes = res.results![0].returnValues![0][0];
		const poolDeepPrice = OrderDeepPrice.parse(new Uint8Array(poolDeepPriceBytes));

		if (poolDeepPrice.asset_is_base) {
			return {
				asset_is_base: poolDeepPrice.asset_is_base,
				deep_per_base:
					((Number(poolDeepPrice.deep_per_asset) / FLOAT_SCALAR) * baseCoin.scalar) /
					deepCoin.scalar,
			};
		} else {
			return {
				asset_is_base: poolDeepPrice.asset_is_base,
				deep_per_quote:
					((Number(poolDeepPrice.deep_per_asset) / FLOAT_SCALAR) * quoteCoin.scalar) /
					deepCoin.scalar,
			};
		}
	}

	/**
	 * @description Decode the order ID to get bid/ask status, price, and orderId
	 * @param {bigint} encodedOrderId Encoded order ID
	 * @returns {Object} Object containing isBid, price, and orderId
	 */
	decodeOrderId(encodedOrderId: bigint): { isBid: boolean; price: number; orderId: number } {
		const isBid = encodedOrderId >> 127n === 0n;
		const price = Number((encodedOrderId >> 64n) & ((1n << 63n) - 1n));
		const orderId = Number(encodedOrderId & ((1n << 64n) - 1n));

		return { isBid, price, orderId };
	}

	/**
	 * @description Get all balance manager IDs for a given owner
	 * @param {string} owner The owner address to get balance manager IDs for
	 * @returns {Promise<string[]>} Array of balance manager ID strings
	 */
	async getBalanceManagerIds(owner: string): Promise<string[]> {
		const tx = new Transaction();
		tx.add(this.deepBook.getBalanceManagerIds(owner));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const vecOfAddresses = bcs.vector(bcs.Address).parse(new Uint8Array(bytes));

		return vecOfAddresses.map((id: string) => normalizeSuiAddress(id));
	}

	/**
	 * @description Get the owner of the referral
	 * @param {string} referral The ID of the referral to get the owner of
	 * @returns {Promise<string>} The owner of the referral
	 */
	async referralOwner(referral: string) {
		const tx = new Transaction();
		tx.add(this.balanceManager.referralOwner(referral));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const owner = bcs.Address.parse(new Uint8Array(bytes));

		return owner;
	}

	/**
	 * @description Get the referral balances for a pool and referral
	 * @param {string} poolKey Key of the pool
	 * @param {string} referral The referral ID to get balances for
	 * @returns {Promise<{ base: number, quote: number, deep: number }>} Object with base, quote, and deep balances
	 */
	async getReferralBalances(
		poolKey: string,
		referral: string,
	): Promise<{ base: number; quote: number; deep: number }> {
		const tx = new Transaction();
		const pool = this.#config.getPool(poolKey);
		const baseScalar = this.#config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.deepBook.getReferralBalances(poolKey, referral));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		// The function returns three u64 values: (base, quote, deep)
		const baseBytes = res.results![0].returnValues![0][0];
		const quoteBytes = res.results![0].returnValues![1][0];
		const deepBytes = res.results![0].returnValues![2][0];

		const baseBalance = Number(bcs.U64.parse(new Uint8Array(baseBytes)));
		const quoteBalance = Number(bcs.U64.parse(new Uint8Array(quoteBytes)));
		const deepBalance = Number(bcs.U64.parse(new Uint8Array(deepBytes)));

		return {
			base: baseBalance / baseScalar,
			quote: quoteBalance / quoteScalar,
			deep: deepBalance / DEEP_SCALAR,
		};
	}

	async getPriceInfoObject(tx: Transaction, coinKey: string): Promise<string> {
		const currentTime = Date.now();
		const dbusdcPriceInfoObjectAge = (await this.getPriceInfoObjectAge(coinKey)) * 1000;
		if (currentTime - dbusdcPriceInfoObjectAge < PRICE_INFO_OBJECT_MAX_AGE) {
			return await this.#config.getCoin(coinKey).priceInfoObjectId!;
		}

		// Initialize connection to the Sui Price Service
		const endpoint =
			this.#config.env === 'testnet'
				? 'https://hermes-beta.pyth.network'
				: 'https://hermes.pyth.network';
		const connection = new SuiPriceServiceConnection(endpoint);

		// List of price feed IDs
		const priceIDs = [
			this.#config.getCoin(coinKey).feed!, // ASSET/USD price ID
		];

		// Fetch price feed update data
		const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIDs);

		// Initialize Sui Client and Pyth Client
		const wormholeStateId = this.#config.pyth.wormholeStateId;
		const pythStateId = this.#config.pyth.pythStateId;

		const client = new SuiPythClient(this.client, pythStateId, wormholeStateId);

		return (await client.updatePriceFeeds(tx, priceUpdateData, priceIDs))[0]; // returns priceInfoObjectIds
	}

	/**
	 * @description Get the age of the price info object for a specific coin
	 * @param {string} coinKey Key of the coin
	 * @returns {Promise<string>} The arrival time of the price info object
	 */
	async getPriceInfoObjectAge(coinKey: string) {
		const priceInfoObjectId = this.#config.getCoin(coinKey).priceInfoObjectId!;
		const res = await this.client.getObject({
			id: priceInfoObjectId,
			options: {
				showContent: true,
			},
		});

		if (!res.data?.content) {
			throw new Error(`Price info object not found for ${coinKey}`);
		}

		// Type guard to check if content has fields property
		if ('fields' in res.data.content) {
			const fields = res.data.content.fields as any;
			return fields.price_info?.fields?.arrival_time;
		} else {
			throw new Error(`Invalid price info object structure for ${coinKey}`);
		}
	}
}
