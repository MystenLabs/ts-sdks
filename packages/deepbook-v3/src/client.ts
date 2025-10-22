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
import type {
	BalanceManager,
	Environment,
	MarginManager,
	CanPlaceLimitOrderParams,
	CanPlaceMarketOrderParams,
} from './types/index.js';
import {
	DEEP_SCALAR,
	DeepBookConfig,
	FLOAT_SCALAR,
	PRICE_INFO_OBJECT_MAX_AGE_MS,
} from './utils/config.js';
import type { CoinMap, PoolMap } from './utils/constants.js';
import { MarginAdminContract } from './transactions/marginAdmin.js';
import { MarginMaintainerContract } from './transactions/marginMaintainer.js';
import { MarginPoolContract } from './transactions/marginPool.js';
import { MarginManagerContract } from './transactions/marginManager.js';
import { MarginRegistryContract } from './transactions/marginRegistry.js';
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
	marginRegistry: MarginRegistryContract;
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
		this.marginRegistry = new MarginRegistryContract(this.#config);
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
		const priceInfoObjectAge = (await this.getPriceInfoObjectAge(coinKey)) * 1000;
		if (currentTime - priceInfoObjectAge < PRICE_INFO_OBJECT_MAX_AGE_MS) {
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

	// === Margin Pool View Methods ===

	/**
	 * @description Get the margin pool ID
	 * @param {string} coinKey The key to identify the margin pool
	 * @returns {Promise<string>} The margin pool ID
	 */
	async getMarginPoolId(coinKey: string): Promise<string> {
		const tx = new Transaction();
		tx.add(this.marginPool.getId(coinKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return bcs.Address.parse(new Uint8Array(bytes));
	}

	/**
	 * @description Check if a deepbook pool is allowed for borrowing from margin pool
	 * @param {string} coinKey The key to identify the margin pool
	 * @param {string} deepbookPoolId The ID of the deepbook pool
	 * @returns {Promise<boolean>} Whether the deepbook pool is allowed
	 */
	async isDeepbookPoolAllowed(coinKey: string, deepbookPoolId: string): Promise<boolean> {
		const tx = new Transaction();
		tx.add(this.marginPool.deepbookPoolAllowed(coinKey, deepbookPoolId));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return bcs.bool().parse(new Uint8Array(bytes));
	}

	/**
	 * @description Get the total supply amount in the margin pool
	 * @param {string} coinKey The key to identify the margin pool
	 * @param {number} decimals Number of decimal places to show (default: 6)
	 * @returns {Promise<string>} The total supply amount as a string
	 */
	async getMarginPoolTotalSupply(coinKey: string, decimals: number = 6): Promise<string> {
		const tx = new Transaction();
		tx.add(this.marginPool.totalSupply(coinKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const rawAmount = BigInt(bcs.U64.parse(new Uint8Array(bytes)));
		const coin = this.#config.getCoin(coinKey);
		return this.#formatTokenAmount(rawAmount, coin.scalar, decimals);
	}

	/**
	 * @description Get the total supply shares in the margin pool
	 * @param {string} coinKey The key to identify the margin pool
	 * @param {number} decimals Number of decimal places to show (default: 6)
	 * @returns {Promise<string>} The total supply shares as a string
	 */
	async getMarginPoolSupplyShares(coinKey: string, decimals: number = 6): Promise<string> {
		const tx = new Transaction();
		tx.add(this.marginPool.supplyShares(coinKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const rawShares = BigInt(bcs.U64.parse(new Uint8Array(bytes)));
		const coin = this.#config.getCoin(coinKey);
		return this.#formatTokenAmount(rawShares, coin.scalar, decimals);
	}

	/**
	 * @description Get the total borrow amount in the margin pool
	 * @param {string} coinKey The key to identify the margin pool
	 * @param {number} decimals Number of decimal places to show (default: 6)
	 * @returns {Promise<string>} The total borrow amount as a string
	 */
	async getMarginPoolTotalBorrow(coinKey: string, decimals: number = 6): Promise<string> {
		const tx = new Transaction();
		tx.add(this.marginPool.totalBorrow(coinKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const rawAmount = BigInt(bcs.U64.parse(new Uint8Array(bytes)));
		const coin = this.#config.getCoin(coinKey);
		return this.#formatTokenAmount(rawAmount, coin.scalar, decimals);
	}

	/**
	 * @description Get the total borrow shares in the margin pool
	 * @param {string} coinKey The key to identify the margin pool
	 * @param {number} decimals Number of decimal places to show (default: 6)
	 * @returns {Promise<string>} The total borrow shares as a string
	 */
	async getMarginPoolBorrowShares(coinKey: string, decimals: number = 6): Promise<string> {
		const tx = new Transaction();
		tx.add(this.marginPool.borrowShares(coinKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const rawShares = BigInt(bcs.U64.parse(new Uint8Array(bytes)));
		const coin = this.#config.getCoin(coinKey);
		return this.#formatTokenAmount(rawShares, coin.scalar, decimals);
	}

	/**
	 * @description Get the last update timestamp of the margin pool
	 * @param {string} coinKey The key to identify the margin pool
	 * @returns {Promise<number>} The last update timestamp in milliseconds
	 */
	async getMarginPoolLastUpdateTimestamp(coinKey: string): Promise<number> {
		const tx = new Transaction();
		tx.add(this.marginPool.lastUpdateTimestamp(coinKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return Number(bcs.U64.parse(new Uint8Array(bytes)));
	}

	/**
	 * @description Get the supply cap of the margin pool
	 * @param {string} coinKey The key to identify the margin pool
	 * @param {number} decimals Number of decimal places to show (default: 6)
	 * @returns {Promise<string>} The supply cap as a string
	 */
	async getMarginPoolSupplyCap(coinKey: string, decimals: number = 6): Promise<string> {
		const tx = new Transaction();
		tx.add(this.marginPool.supplyCap(coinKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const rawAmount = BigInt(bcs.U64.parse(new Uint8Array(bytes)));
		const coin = this.#config.getCoin(coinKey);
		return this.#formatTokenAmount(rawAmount, coin.scalar, decimals);
	}

	/**
	 * @description Get the max utilization rate of the margin pool
	 * @param {string} coinKey The key to identify the margin pool
	 * @returns {Promise<number>} The max utilization rate (as a decimal, e.g., 0.95 for 95%)
	 */
	async getMarginPoolMaxUtilizationRate(coinKey: string): Promise<number> {
		const tx = new Transaction();
		tx.add(this.marginPool.maxUtilizationRate(coinKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const rawRate = Number(bcs.U64.parse(new Uint8Array(bytes)));
		return rawRate / FLOAT_SCALAR;
	}

	/**
	 * @description Get the protocol spread of the margin pool
	 * @param {string} coinKey The key to identify the margin pool
	 * @returns {Promise<number>} The protocol spread (as a decimal)
	 */
	async getMarginPoolProtocolSpread(coinKey: string): Promise<number> {
		const tx = new Transaction();
		tx.add(this.marginPool.protocolSpread(coinKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const rawSpread = Number(bcs.U64.parse(new Uint8Array(bytes)));
		return rawSpread / FLOAT_SCALAR;
	}

	/**
	 * @description Get the minimum borrow amount for the margin pool
	 * @param {string} coinKey The key to identify the margin pool
	 * @param {number} decimals Number of decimal places to show (default: 6)
	 * @returns {Promise<string>} The minimum borrow amount as a string
	 */
	async getMarginPoolMinBorrow(coinKey: string, decimals: number = 6): Promise<string> {
		const tx = new Transaction();
		tx.add(this.marginPool.minBorrow(coinKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const rawAmount = BigInt(bcs.U64.parse(new Uint8Array(bytes)));
		const coin = this.#config.getCoin(coinKey);
		return this.#formatTokenAmount(rawAmount, coin.scalar, decimals);
	}

	/**
	 * @description Get the current interest rate of the margin pool
	 * @param {string} coinKey The key to identify the margin pool
	 * @returns {Promise<number>} The current interest rate (as a decimal)
	 */
	async getMarginPoolInterestRate(coinKey: string): Promise<number> {
		const tx = new Transaction();
		tx.add(this.marginPool.interestRate(coinKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const rawRate = Number(bcs.U64.parse(new Uint8Array(bytes)));
		return rawRate / FLOAT_SCALAR;
	}

	/**
	 * @description Get user supply shares for a supplier cap
	 * @param {string} coinKey The key to identify the margin pool
	 * @param {string} supplierCapId The ID of the supplier cap
	 * @param {number} decimals Number of decimal places to show (default: 6)
	 * @returns {Promise<string>} The user's supply shares as a string
	 */
	async getUserSupplyShares(
		coinKey: string,
		supplierCapId: string,
		decimals: number = 6,
	): Promise<string> {
		const tx = new Transaction();
		tx.add(this.marginPool.userSupplyShares(coinKey, supplierCapId));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const rawShares = BigInt(bcs.U64.parse(new Uint8Array(bytes)));
		const coin = this.#config.getCoin(coinKey);
		return this.#formatTokenAmount(rawShares, coin.scalar, decimals);
	}

	/**
	 * @description Get user supply amount for a supplier cap
	 * @param {string} coinKey The key to identify the margin pool
	 * @param {string} supplierCapId The ID of the supplier cap
	 * @param {number} decimals Number of decimal places to show (default: 6)
	 * @returns {Promise<string>} The user's supply amount as a string
	 */
	async getUserSupplyAmount(
		coinKey: string,
		supplierCapId: string,
		decimals: number = 6,
	): Promise<string> {
		const tx = new Transaction();
		tx.add(this.marginPool.userSupplyAmount(coinKey, supplierCapId));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const rawAmount = BigInt(bcs.U64.parse(new Uint8Array(bytes)));
		const coin = this.#config.getCoin(coinKey);
		return this.#formatTokenAmount(rawAmount, coin.scalar, decimals);
	}

	// === Margin Manager Read-Only Functions ===

	/**
	 * @description Get the owner address of a margin manager
	 * @param {string} marginManagerKey The key to identify the margin manager
	 * @returns {Promise<string>} The owner address
	 */
	async getMarginManagerOwner(marginManagerKey: string): Promise<string> {
		const manager = this.#config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.marginManager.ownerByPoolKey(manager.poolKey, manager.address));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return normalizeSuiAddress(bcs.Address.parse(new Uint8Array(bytes)));
	}

	/**
	 * @description Get the DeepBook pool ID associated with a margin manager
	 * @param {string} marginManagerKey The key to identify the margin manager
	 * @returns {Promise<string>} The DeepBook pool ID
	 */
	async getMarginManagerDeepbookPool(marginManagerKey: string): Promise<string> {
		const manager = this.#config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.marginManager.deepbookPool(manager.poolKey, manager.address));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return normalizeSuiAddress(bcs.Address.parse(new Uint8Array(bytes)));
	}

	/**
	 * @description Get the margin pool ID (if any) associated with a margin manager
	 * @param {string} marginManagerKey The key to identify the margin manager
	 * @returns {Promise<string | null>} The margin pool ID or null if no active loan
	 */
	async getMarginManagerMarginPoolId(marginManagerKey: string): Promise<string | null> {
		const manager = this.#config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.marginManager.marginPoolId(manager.poolKey, manager.address));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const option = bcs.option(bcs.Address).parse(new Uint8Array(bytes));
		return option ? normalizeSuiAddress(option) : null;
	}

	/**
	 * @description Get borrowed shares for both base and quote assets
	 * @param {string} marginManagerKey The key to identify the margin manager
	 * @returns {Promise<{baseShares: string, quoteShares: string}>} The borrowed shares
	 */
	async getMarginManagerBorrowedShares(
		marginManagerKey: string,
	): Promise<{ baseShares: string; quoteShares: string }> {
		const manager = this.#config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.marginManager.borrowedShares(manager.poolKey, manager.address));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const baseBytes = res.results![0].returnValues![0][0];
		const quoteBytes = res.results![0].returnValues![1][0];
		const baseShares = bcs.U64.parse(new Uint8Array(baseBytes)).toString();
		const quoteShares = bcs.U64.parse(new Uint8Array(quoteBytes)).toString();

		return { baseShares, quoteShares };
	}

	/**
	 * @description Get borrowed base shares
	 * @param {string} marginManagerKey The key to identify the margin manager
	 * @returns {Promise<string>} The borrowed base shares
	 */
	async getMarginManagerBorrowedBaseShares(marginManagerKey: string): Promise<string> {
		const manager = this.#config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.marginManager.borrowedBaseShares(manager.poolKey, manager.address));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return bcs.U64.parse(new Uint8Array(bytes)).toString();
	}

	/**
	 * @description Get borrowed quote shares
	 * @param {string} marginManagerKey The key to identify the margin manager
	 * @returns {Promise<string>} The borrowed quote shares
	 */
	async getMarginManagerBorrowedQuoteShares(marginManagerKey: string): Promise<string> {
		const manager = this.#config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.marginManager.borrowedQuoteShares(manager.poolKey, manager.address));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return bcs.U64.parse(new Uint8Array(bytes)).toString();
	}

	/**
	 * @description Check if margin manager has base asset debt
	 * @param {string} marginManagerKey The key to identify the margin manager
	 * @returns {Promise<boolean>} True if has base debt, false otherwise
	 */
	async getMarginManagerHasBaseDebt(marginManagerKey: string): Promise<boolean> {
		const manager = this.#config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.marginManager.hasBaseDebt(manager.poolKey, manager.address));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return bcs.bool().parse(new Uint8Array(bytes));
	}

	/**
	 * @description Get the balance manager ID for a margin manager
	 * @param {string} marginManagerKey The key to identify the margin manager
	 * @returns {Promise<string>} The balance manager ID
	 */
	async getMarginManagerBalanceManagerId(marginManagerKey: string): Promise<string> {
		const manager = this.#config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.marginManager.balanceManager(manager.poolKey, manager.address));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return normalizeSuiAddress(bcs.Address.parse(new Uint8Array(bytes)));
	}

	/**
	 * @description Calculate assets (base and quote) for a margin manager
	 * @param {string} marginManagerKey The key to identify the margin manager
	 * @param {number} decimals Number of decimal places to show (default: 6)
	 * @returns {Promise<{baseAsset: string, quoteAsset: string}>} The base and quote assets
	 */
	async getMarginManagerAssets(
		marginManagerKey: string,
		decimals: number = 6,
	): Promise<{ baseAsset: string; quoteAsset: string }> {
		const manager = this.#config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.marginManager.calculateAssets(manager.poolKey, manager.address));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const baseBytes = res.results![0].returnValues![0][0];
		const quoteBytes = res.results![0].returnValues![1][0];
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		const baseAsset = this.#formatTokenAmount(
			BigInt(bcs.U64.parse(new Uint8Array(baseBytes))),
			baseCoin.scalar,
			decimals,
		);
		const quoteAsset = this.#formatTokenAmount(
			BigInt(bcs.U64.parse(new Uint8Array(quoteBytes))),
			quoteCoin.scalar,
			decimals,
		);

		return { baseAsset, quoteAsset };
	}

	/**
	 * @description Calculate debts (base and quote) for a margin manager
	 * NOTE: This function automatically determines whether to use base or quote margin pool
	 * based on hasBaseDebt. You don't need to specify the debt coin type.
	 * @param {string} marginManagerKey The key to identify the margin manager
	 * @param {number} decimals Number of decimal places to show (default: 6)
	 * @returns {Promise<{baseDebt: string, quoteDebt: string}>} The base and quote debts
	 */
	async getMarginManagerDebts(
		marginManagerKey: string,
		decimals: number = 6,
	): Promise<{ baseDebt: string; quoteDebt: string }> {
		// First check if the margin manager has base debt
		const hasBaseDebt = await this.getMarginManagerHasBaseDebt(marginManagerKey);

		// Get the manager and pool configuration
		const manager = this.#config.getMarginManager(marginManagerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const debtCoinKey = hasBaseDebt ? pool.baseCoin : pool.quoteCoin;

		// Now call calculateDebts with the correct debt coin
		const tx = new Transaction();
		tx.add(this.marginManager.calculateDebts(manager.poolKey, debtCoinKey, manager.address));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		// Check if the transaction failed
		if (!res.results || !res.results[0] || !res.results[0].returnValues) {
			throw new Error(
				`Failed to get margin manager debts: ${res.effects?.status?.error || 'Unknown error'}`,
			);
		}

		// The Move function returns a tuple (u64, u64), so returnValues has 2 elements
		const baseBytes = res.results[0].returnValues[0][0];
		const quoteBytes = res.results[0].returnValues[1][0];
		const debtCoin = this.#config.getCoin(debtCoinKey);

		const baseDebt = this.#formatTokenAmount(
			BigInt(bcs.U64.parse(new Uint8Array(baseBytes))),
			debtCoin.scalar,
			decimals,
		);
		const quoteDebt = this.#formatTokenAmount(
			BigInt(bcs.U64.parse(new Uint8Array(quoteBytes))),
			debtCoin.scalar,
			decimals,
		);

		return { baseDebt, quoteDebt };
	}

	/**
	 * @description Get comprehensive state information for a margin manager
	 * @param {string} marginManagerKey The key to identify the margin manager
	 * @param {number} decimals Number of decimal places to show (default: 6)
	 * @returns {Promise<{
	 *   managerId: string,
	 *   deepbookPoolId: string,
	 *   riskRatio: number,
	 *   baseAsset: string,
	 *   quoteAsset: string,
	 *   baseDebt: string,
	 *   quoteDebt: string,
	 *   basePythPrice: string,
	 *   basePythDecimals: number,
	 *   quotePythPrice: string,
	 *   quotePythDecimals: number
	 * }>} Comprehensive margin manager state
	 */
	async getMarginManagerState(
		marginManagerKey: string,
		decimals: number = 6,
	): Promise<{
		managerId: string;
		deepbookPoolId: string;
		riskRatio: number;
		baseAsset: string;
		quoteAsset: string;
		baseDebt: string;
		quoteDebt: string;
		basePythPrice: string;
		basePythDecimals: number;
		quotePythPrice: string;
		quotePythDecimals: number;
		currentPrice: bigint;
		lowestTriggerAbovePrice: bigint;
		highestTriggerBelowPrice: bigint;
	}> {
		const manager = this.#config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.marginManager.managerState(manager.poolKey, manager.address));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		// Check if the transaction failed
		if (!res.results || !res.results[0] || !res.results[0].returnValues) {
			throw new Error(
				`Failed to get margin manager state: ${res.effects?.status?.error || 'Unknown error'}`,
			);
		}

		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		// Parse all 11 return values
		const managerId = normalizeSuiAddress(
			bcs.Address.parse(new Uint8Array(res.results[0].returnValues[0][0])),
		);
		const deepbookPoolId = normalizeSuiAddress(
			bcs.Address.parse(new Uint8Array(res.results[0].returnValues[1][0])),
		);
		const riskRatio =
			Number(bcs.U64.parse(new Uint8Array(res.results[0].returnValues[2][0]))) / FLOAT_SCALAR;
		const baseAsset = this.#formatTokenAmount(
			BigInt(bcs.U64.parse(new Uint8Array(res.results[0].returnValues[3][0]))),
			baseCoin.scalar,
			decimals,
		);
		const quoteAsset = this.#formatTokenAmount(
			BigInt(bcs.U64.parse(new Uint8Array(res.results[0].returnValues[4][0]))),
			quoteCoin.scalar,
			decimals,
		);
		const baseDebt = this.#formatTokenAmount(
			BigInt(bcs.U64.parse(new Uint8Array(res.results[0].returnValues[5][0]))),
			baseCoin.scalar,
			decimals,
		);
		const quoteDebt = this.#formatTokenAmount(
			BigInt(bcs.U64.parse(new Uint8Array(res.results[0].returnValues[6][0]))),
			quoteCoin.scalar,
			decimals,
		);
		const basePythPrice = bcs.U64.parse(new Uint8Array(res.results[0].returnValues[7][0]));
		const basePythDecimals = Number(
			bcs.u8().parse(new Uint8Array(res.results[0].returnValues[8][0])),
		);
		const quotePythPrice = bcs.U64.parse(new Uint8Array(res.results[0].returnValues[9][0]));
		const quotePythDecimals = Number(
			bcs.u8().parse(new Uint8Array(res.results[0].returnValues[10][0])),
		);
		const currentPrice = BigInt(bcs.U64.parse(new Uint8Array(res.results[0].returnValues[11][0])));
		const lowestTriggerAbovePrice = BigInt(
			bcs.U64.parse(new Uint8Array(res.results[0].returnValues[12][0])),
		);
		const highestTriggerBelowPrice = BigInt(
			bcs.U64.parse(new Uint8Array(res.results[0].returnValues[13][0])),
		);

		return {
			managerId,
			deepbookPoolId,
			riskRatio,
			baseAsset,
			quoteAsset,
			baseDebt,
			quoteDebt,
			basePythPrice: basePythPrice.toString(),
			basePythDecimals,
			quotePythPrice: quotePythPrice.toString(),
			quotePythDecimals,
			currentPrice,
			lowestTriggerAbovePrice,
			highestTriggerBelowPrice,
		};
	}

	/**
	 * @description Get the base asset balance of a margin manager
	 * @param {string} marginManagerKey The key to identify the margin manager
	 * @param {number} decimals Number of decimal places to show (default: 6)
	 * @returns {Promise<string>} The base asset balance
	 */
	async getMarginManagerBaseBalance(
		marginManagerKey: string,
		decimals: number = 9,
	): Promise<string> {
		const manager = this.#config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.marginManager.baseBalance(manager.poolKey, manager.address));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		// Check if the transaction failed
		if (!res.results || !res.results[0] || !res.results[0].returnValues) {
			throw new Error(
				`Failed to get margin manager base balance: ${res.effects?.status?.error || 'Unknown error'}`,
			);
		}

		const bytes = res.results[0].returnValues[0][0];
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);

		return this.#formatTokenAmount(
			BigInt(bcs.U64.parse(new Uint8Array(bytes))),
			baseCoin.scalar,
			decimals,
		);
	}

	/**
	 * @description Get the quote asset balance of a margin manager
	 * @param {string} marginManagerKey The key to identify the margin manager
	 * @param {number} decimals Number of decimal places to show (default: 6)
	 * @returns {Promise<string>} The quote asset balance
	 */
	async getMarginManagerQuoteBalance(
		marginManagerKey: string,
		decimals: number = 9,
	): Promise<string> {
		const manager = this.#config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.marginManager.quoteBalance(manager.poolKey, manager.address));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		// Check if the transaction failed
		if (!res.results || !res.results[0] || !res.results[0].returnValues) {
			throw new Error(
				`Failed to get margin manager quote balance: ${res.effects?.status?.error || 'Unknown error'}`,
			);
		}

		const bytes = res.results[0].returnValues[0][0];
		const pool = this.#config.getPool(manager.poolKey);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		return this.#formatTokenAmount(
			BigInt(bcs.U64.parse(new Uint8Array(bytes))),
			quoteCoin.scalar,
			decimals,
		);
	}

	/**
	 * @description Get the DEEP token balance of a margin manager
	 * @param {string} marginManagerKey The key to identify the margin manager
	 * @param {number} decimals Number of decimal places to show (default: 6)
	 * @returns {Promise<string>} The DEEP token balance
	 */
	async getMarginManagerDeepBalance(
		marginManagerKey: string,
		decimals: number = 6,
	): Promise<string> {
		const manager = this.#config.getMarginManager(marginManagerKey);
		const tx = new Transaction();
		tx.add(this.marginManager.deepBalance(manager.poolKey, manager.address));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		// Check if the transaction failed
		if (!res.results || !res.results[0] || !res.results[0].returnValues) {
			throw new Error(
				`Failed to get margin manager DEEP balance: ${res.effects?.status?.error || 'Unknown error'}`,
			);
		}

		const bytes = res.results[0].returnValues[0][0];
		const deepCoin = this.#config.getCoin('DEEP');

		return this.#formatTokenAmount(
			BigInt(bcs.U64.parse(new Uint8Array(bytes))),
			deepCoin.scalar,
			decimals,
		);
	}

	// === Margin Registry Functions ===

	/**
	 * @description Check if a deepbook pool is enabled for margin trading
	 * @param {string} poolKey The key to identify the pool
	 * @returns {Promise<boolean>} True if the pool is enabled for margin trading
	 */
	async isPoolEnabledForMargin(poolKey: string): Promise<boolean> {
		const tx = new Transaction();
		tx.add(this.marginRegistry.poolEnabled(poolKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return bcs.Bool.parse(new Uint8Array(bytes));
	}

	/**
	 * @description Get the margin manager IDs for a given owner address
	 * @param {string} owner The owner address
	 * @returns {Promise<string[]>} Array of margin manager IDs
	 */
	async getMarginManagerIdsForOwner(owner: string): Promise<string[]> {
		const tx = new Transaction();
		tx.add(this.marginRegistry.getMarginManagerIds(owner));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const vecSet = VecSet(bcs.Address).parse(new Uint8Array(bytes));
		return vecSet.contents.map((id) => normalizeSuiAddress(id));
	}

	/**
	 * @description Get the base margin pool ID for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns {Promise<string>} The base margin pool ID
	 */
	async getBaseMarginPoolId(poolKey: string): Promise<string> {
		const tx = new Transaction();
		tx.add(this.marginRegistry.baseMarginPoolId(poolKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const id = bcs.Address.parse(new Uint8Array(bytes));
		return '0x' + id;
	}

	/**
	 * @description Get the quote margin pool ID for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns {Promise<string>} The quote margin pool ID
	 */
	async getQuoteMarginPoolId(poolKey: string): Promise<string> {
		const tx = new Transaction();
		tx.add(this.marginRegistry.quoteMarginPoolId(poolKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const id = bcs.Address.parse(new Uint8Array(bytes));
		return '0x' + id;
	}

	/**
	 * @description Get the minimum withdraw risk ratio for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns {Promise<number>} The minimum withdraw risk ratio as a decimal (e.g., 1.5 for 150%)
	 */
	async getMinWithdrawRiskRatio(poolKey: string): Promise<number> {
		const tx = new Transaction();
		tx.add(this.marginRegistry.minWithdrawRiskRatio(poolKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const ratio = Number(bcs.U64.parse(new Uint8Array(bytes)));
		return ratio / FLOAT_SCALAR;
	}

	/**
	 * @description Get the minimum borrow risk ratio for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns {Promise<number>} The minimum borrow risk ratio as a decimal (e.g., 1.25 for 125%)
	 */
	async getMinBorrowRiskRatio(poolKey: string): Promise<number> {
		const tx = new Transaction();
		tx.add(this.marginRegistry.minBorrowRiskRatio(poolKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const ratio = Number(bcs.U64.parse(new Uint8Array(bytes)));
		return ratio / FLOAT_SCALAR;
	}

	/**
	 * @description Get the liquidation risk ratio for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns {Promise<number>} The liquidation risk ratio as a decimal (e.g., 1.125 for 112.5%)
	 */
	async getLiquidationRiskRatio(poolKey: string): Promise<number> {
		const tx = new Transaction();
		tx.add(this.marginRegistry.liquidationRiskRatio(poolKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const ratio = Number(bcs.U64.parse(new Uint8Array(bytes)));
		return ratio / FLOAT_SCALAR;
	}

	/**
	 * @description Get the target liquidation risk ratio for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns {Promise<number>} The target liquidation risk ratio as a decimal (e.g., 1.25 for 125%)
	 */
	async getTargetLiquidationRiskRatio(poolKey: string): Promise<number> {
		const tx = new Transaction();
		tx.add(this.marginRegistry.targetLiquidationRiskRatio(poolKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const ratio = Number(bcs.U64.parse(new Uint8Array(bytes)));
		return ratio / FLOAT_SCALAR;
	}

	/**
	 * @description Get the user liquidation reward for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns {Promise<number>} The user liquidation reward as a decimal (e.g., 0.05 for 5%)
	 */
	async getUserLiquidationReward(poolKey: string): Promise<number> {
		const tx = new Transaction();
		tx.add(this.marginRegistry.userLiquidationReward(poolKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const reward = Number(bcs.U64.parse(new Uint8Array(bytes)));
		return reward / FLOAT_SCALAR;
	}

	/**
	 * @description Get the pool liquidation reward for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns {Promise<number>} The pool liquidation reward as a decimal (e.g., 0.05 for 5%)
	 */
	async getPoolLiquidationReward(poolKey: string): Promise<number> {
		const tx = new Transaction();
		tx.add(this.marginRegistry.poolLiquidationReward(poolKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const reward = Number(bcs.U64.parse(new Uint8Array(bytes)));
		return reward / FLOAT_SCALAR;
	}

	/**
	 * @description Get all allowed maintainer cap IDs
	 * @returns {Promise<string[]>} Array of allowed maintainer cap IDs
	 */
	async getAllowedMaintainers(): Promise<string[]> {
		const tx = new Transaction();
		tx.add(this.marginRegistry.allowedMaintainers());

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const vecSet = VecSet(bcs.Address).parse(new Uint8Array(bytes));
		return vecSet.contents.map((id) => normalizeSuiAddress(id));
	}

	/**
	 * @description Get all allowed pause cap IDs
	 * @returns {Promise<string[]>} Array of allowed pause cap IDs
	 */
	async getAllowedPauseCaps(): Promise<string[]> {
		const tx = new Transaction();
		tx.add(this.marginRegistry.allowedPauseCaps());

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const vecSet = VecSet(bcs.Address).parse(new Uint8Array(bytes));
		return vecSet.contents.map((id) => normalizeSuiAddress(id));
	}

	/**
	 * @description Check if a pool is a stable pool
	 * @param {string} poolKey Key of the pool
	 * @returns {Promise<boolean>} Whether the pool is a stable pool
	 */
	async stablePool(poolKey: string): Promise<boolean> {
		const tx = new Transaction();
		tx.add(this.deepBook.stablePool(poolKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return bcs.bool().parse(new Uint8Array(bytes));
	}

	/**
	 * @description Check if a pool is registered
	 * @param {string} poolKey Key of the pool
	 * @returns {Promise<boolean>} Whether the pool is registered
	 */
	async registeredPool(poolKey: string): Promise<boolean> {
		const tx = new Transaction();
		tx.add(this.deepBook.registeredPool(poolKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return bcs.bool().parse(new Uint8Array(bytes));
	}

	/**
	 * @description Get the quote quantity out using input token as fee
	 * @param {string} poolKey Key of the pool
	 * @param {number} baseQuantity Base quantity
	 * @returns {Promise<{baseQuantity: number, baseOut: number, quoteOut: number, deepRequired: number}>}
	 */
	async getQuoteQuantityOutInputFee(poolKey: string, baseQuantity: number) {
		const tx = new Transaction();
		const pool = this.#config.getPool(poolKey);
		const baseScalar = this.#config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.deepBook.getQuoteQuantityOutInputFee(poolKey, baseQuantity));
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
	 * @description Get the base quantity out using input token as fee
	 * @param {string} poolKey Key of the pool
	 * @param {number} quoteQuantity Quote quantity
	 * @returns {Promise<{quoteQuantity: number, baseOut: number, quoteOut: number, deepRequired: number}>}
	 */
	async getBaseQuantityOutInputFee(poolKey: string, quoteQuantity: number) {
		const tx = new Transaction();
		const pool = this.#config.getPool(poolKey);
		const baseScalar = this.#config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.deepBook.getBaseQuantityOutInputFee(poolKey, quoteQuantity));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const baseOut = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![0][0])));
		const quoteOut = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![1][0])));
		const deepRequired = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![2][0])));

		return {
			quoteQuantity,
			baseOut: Number((baseOut / baseScalar).toFixed(9)),
			quoteOut: Number((quoteOut / quoteScalar).toFixed(9)),
			deepRequired: Number((deepRequired / DEEP_SCALAR).toFixed(9)),
		};
	}

	/**
	 * @description Get the quantity out using input token as fee
	 * @param {string} poolKey Key of the pool
	 * @param {number} baseQuantity Base quantity
	 * @param {number} quoteQuantity Quote quantity
	 * @returns {Promise<{baseQuantity: number, quoteQuantity: number, baseOut: number, quoteOut: number, deepRequired: number}>}
	 */
	async getQuantityOutInputFee(poolKey: string, baseQuantity: number, quoteQuantity: number) {
		const tx = new Transaction();
		const pool = this.#config.getPool(poolKey);
		const baseScalar = this.#config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.deepBook.getQuantityOutInputFee(poolKey, baseQuantity, quoteQuantity));
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
	 * @description Get the base quantity needed to receive target quote quantity
	 * @param {string} poolKey Key of the pool
	 * @param {number} targetQuoteQuantity Target quote quantity
	 * @param {boolean} payWithDeep Whether to pay fees with DEEP
	 * @returns {Promise<{baseIn: number, quoteOut: number, deepRequired: number}>}
	 */
	async getBaseQuantityIn(poolKey: string, targetQuoteQuantity: number, payWithDeep: boolean) {
		const tx = new Transaction();
		const pool = this.#config.getPool(poolKey);
		const baseScalar = this.#config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.deepBook.getBaseQuantityIn(poolKey, targetQuoteQuantity, payWithDeep));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const baseIn = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![0][0])));
		const quoteOut = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![1][0])));
		const deepRequired = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![2][0])));

		return {
			baseIn: Number((baseIn / baseScalar).toFixed(9)),
			quoteOut: Number((quoteOut / quoteScalar).toFixed(9)),
			deepRequired: Number((deepRequired / DEEP_SCALAR).toFixed(9)),
		};
	}

	/**
	 * @description Get the quote quantity needed to receive target base quantity
	 * @param {string} poolKey Key of the pool
	 * @param {number} targetBaseQuantity Target base quantity
	 * @param {boolean} payWithDeep Whether to pay fees with DEEP
	 * @returns {Promise<{baseOut: number, quoteIn: number, deepRequired: number}>}
	 */
	async getQuoteQuantityIn(poolKey: string, targetBaseQuantity: number, payWithDeep: boolean) {
		const tx = new Transaction();
		const pool = this.#config.getPool(poolKey);
		const baseScalar = this.#config.getCoin(pool.baseCoin).scalar;
		const quoteScalar = this.#config.getCoin(pool.quoteCoin).scalar;

		tx.add(this.deepBook.getQuoteQuantityIn(poolKey, targetBaseQuantity, payWithDeep));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const baseOut = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![0][0])));
		const quoteIn = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![1][0])));
		const deepRequired = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![2][0])));

		return {
			baseOut: Number((baseOut / baseScalar).toFixed(9)),
			quoteIn: Number((quoteIn / quoteScalar).toFixed(9)),
			deepRequired: Number((deepRequired / DEEP_SCALAR).toFixed(9)),
		};
	}

	/**
	 * @description Get account order details for a balance manager
	 * @param {string} poolKey Key of the pool
	 * @param {string} managerKey Key of the balance manager
	 * @returns {Promise<Array>} Array of order details
	 */
	async getAccountOrderDetails(poolKey: string, managerKey: string) {
		const tx = new Transaction();
		tx.add(this.deepBook.getAccountOrderDetails(poolKey, managerKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		try {
			const orderInformation = res.results![0].returnValues![0][0];
			return bcs.vector(Order).parse(new Uint8Array(orderInformation));
		} catch {
			return [];
		}
	}

	/**
	 * @description Get the DEEP required for an order
	 * @param {string} poolKey Key of the pool
	 * @param {number} baseQuantity Base quantity
	 * @param {number} price Price
	 * @returns {Promise<{deepRequiredTaker: number, deepRequiredMaker: number}>}
	 */
	async getOrderDeepRequired(poolKey: string, baseQuantity: number, price: number) {
		const tx = new Transaction();
		tx.add(this.deepBook.getOrderDeepRequired(poolKey, baseQuantity, price));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const deepRequiredTaker = Number(
			bcs.U64.parse(new Uint8Array(res.results![0].returnValues![0][0])),
		);
		const deepRequiredMaker = Number(
			bcs.U64.parse(new Uint8Array(res.results![0].returnValues![1][0])),
		);

		return {
			deepRequiredTaker: Number((deepRequiredTaker / DEEP_SCALAR).toFixed(9)),
			deepRequiredMaker: Number((deepRequiredMaker / DEEP_SCALAR).toFixed(9)),
		};
	}

	/**
	 * @description Check if account exists for a balance manager
	 * @param {string} poolKey Key of the pool
	 * @param {string} managerKey Key of the balance manager
	 * @returns {Promise<boolean>} Whether account exists
	 */
	async accountExists(poolKey: string, managerKey: string): Promise<boolean> {
		const tx = new Transaction();
		tx.add(this.deepBook.accountExists(poolKey, managerKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return bcs.bool().parse(new Uint8Array(bytes));
	}

	/**
	 * @description Get the next epoch trade parameters
	 * @param {string} poolKey Key of the pool
	 * @returns {Promise<{takerFee: number, makerFee: number, stakeRequired: number}>}
	 */
	async poolTradeParamsNext(poolKey: string) {
		const tx = new Transaction();
		tx.add(this.deepBook.poolTradeParamsNext(poolKey));

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
			takerFee: takerFee / FLOAT_SCALAR,
			makerFee: makerFee / FLOAT_SCALAR,
			stakeRequired: stakeRequired / DEEP_SCALAR,
		};
	}

	/**
	 * @description Get the quorum for a pool
	 * @param {string} poolKey Key of the pool
	 * @returns {Promise<number>} The quorum amount in DEEP
	 */
	async quorum(poolKey: string): Promise<number> {
		const tx = new Transaction();
		tx.add(this.deepBook.quorum(poolKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const quorum = Number(bcs.U64.parse(new Uint8Array(bytes)));
		return quorum / DEEP_SCALAR;
	}

	/**
	 * @description Get the pool ID
	 * @param {string} poolKey Key of the pool
	 * @returns {Promise<string>} The pool ID
	 */
	async poolId(poolKey: string): Promise<string> {
		const tx = new Transaction();
		tx.add(this.deepBook.poolId(poolKey));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return normalizeSuiAddress(bcs.Address.parse(new Uint8Array(bytes)));
	}

	/**
	 * @description Check if a limit order can be placed
	 * @param {CanPlaceLimitOrderParams} params Parameters for checking limit order placement
	 * @returns {Promise<boolean>} Whether order can be placed
	 */
	async canPlaceLimitOrder(params: CanPlaceLimitOrderParams): Promise<boolean> {
		const tx = new Transaction();
		tx.add(this.deepBook.canPlaceLimitOrder(params));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return bcs.bool().parse(new Uint8Array(bytes));
	}

	/**
	 * @description Check if a market order can be placed
	 * @param {CanPlaceMarketOrderParams} params Parameters for checking market order placement
	 * @returns {Promise<boolean>} Whether order can be placed
	 */
	async canPlaceMarketOrder(params: CanPlaceMarketOrderParams): Promise<boolean> {
		const tx = new Transaction();
		tx.add(this.deepBook.canPlaceMarketOrder(params));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return bcs.bool().parse(new Uint8Array(bytes));
	}

	/**
	 * @description Check if market order params are valid
	 * @param {string} poolKey Key of the pool
	 * @param {number} quantity Quantity
	 * @returns {Promise<boolean>} Whether params are valid
	 */
	async checkMarketOrderParams(poolKey: string, quantity: number): Promise<boolean> {
		const tx = new Transaction();
		tx.add(this.deepBook.checkMarketOrderParams(poolKey, quantity));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return bcs.bool().parse(new Uint8Array(bytes));
	}

	/**
	 * @description Check if limit order params are valid
	 * @param {string} poolKey Key of the pool
	 * @param {number} price Price
	 * @param {number} quantity Quantity
	 * @param {number} expireTimestamp Expiration timestamp
	 * @returns {Promise<boolean>} Whether params are valid
	 */
	async checkLimitOrderParams(
		poolKey: string,
		price: number,
		quantity: number,
		expireTimestamp: number,
	): Promise<boolean> {
		const tx = new Transaction();
		tx.add(this.deepBook.checkLimitOrderParams(poolKey, price, quantity, expireTimestamp));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		return bcs.bool().parse(new Uint8Array(bytes));
	}

	/**
	 * @description Helper function to format token amounts without floating point errors
	 * @param {bigint} rawAmount The raw amount as bigint
	 * @param {number} scalar The token scalar (e.g., 1000000000 for 9 decimals)
	 * @param {number} decimals Number of decimal places to show
	 * @returns {string} Formatted amount as string
	 */
	#formatTokenAmount(rawAmount: bigint, scalar: number, decimals: number): string {
		const scalarBigInt = BigInt(scalar);
		const integerPart = rawAmount / scalarBigInt;
		const fractionalPart = rawAmount % scalarBigInt;

		// If no fractional part, return just the integer
		if (fractionalPart === 0n) {
			return integerPart.toString();
		}

		// Convert fractional part to string with leading zeros
		const scalarDigits = scalar.toString().length - 1;
		const fractionalStr = fractionalPart.toString().padStart(scalarDigits, '0');

		// Truncate to desired decimal places
		const truncated = fractionalStr.slice(0, decimals);

		// Remove trailing zeros for cleaner output
		const trimmed = truncated.replace(/0+$/, '');

		// If nothing left after trimming, return just integer
		if (!trimmed) {
			return integerPart.toString();
		}

		return `${integerPart}.${trimmed}`;
	}
}
