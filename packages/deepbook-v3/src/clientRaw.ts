// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';

import { BalanceManagerContract } from './transactions/balanceManager.js';
import { DeepBookContract } from './transactions/deepbook.js';
import { DeepBookAdminContract } from './transactions/deepbookAdmin.js';
import { FlashLoanContract } from './transactions/flashLoans.js';
import { GovernanceContract } from './transactions/governance.js';
import type { BalanceManager, Environment } from './types/index.js';
import { FLOAT_SCALAR } from './utils/config.js';

/**
 * DeepBookClient class for managing DeepBook operations.
 */
export class DeepBookClientRaw {
	client: SuiClient;
	#address: string;
	balanceManager: BalanceManagerContract;
	deepBook: DeepBookContract;
	deepBookAdmin: DeepBookAdminContract;
	flashLoans: FlashLoanContract;
	governance: GovernanceContract;

	/**
	 * @param {SuiClient} client SuiClient instance
	 * @param {string} address Address of the client
	 * @param {Environment} env Environment configuration
	 * @param {Object.<string, BalanceManager>} [balanceManagers] Optional initial BalanceManager map
	 * @param {string} [adminCap] Optional admin capability
	 */
	constructor({
		client,
		address,
		env,
		adminCap,
	}: {
		client: SuiClient;
		address: string;
		env: Environment;
		balanceManagers?: { [key: string]: BalanceManager };
		adminCap?: string;
	}) {
		this.client = client;
		this.#address = normalizeSuiAddress(address);
		this.balanceManager = new BalanceManagerContract(env);
		this.deepBook = new DeepBookContract(env, address);
		this.deepBookAdmin = new DeepBookAdminContract(env, adminCap);
		this.flashLoans = new FlashLoanContract(env);
		this.governance = new GovernanceContract(env);
	}

	/**
	 * @description Check the balance of a balance manager for a specific coin
	 * @param {string} managerAddress Address of the balance manager
	 * @param {string} coinType Type of the coin
	 * @returns {Promise<{ coinType: string, balance: number }>} An object with coin type and balance
	 */
	async checkManagerBalance(
		managerAddress: string,
		coinType: string,
	): Promise<{ coinType: string; balance: number }> {
		const tx = new Transaction();

		tx.add(this.balanceManager.checkManagerBalance(managerAddress, coinType));
		const res = await this.client.devInspectTransactionBlock({
			sender: this.#address,
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const parsed_balance = bcs.U64.parse(new Uint8Array(bytes));
		const balanceNumber = Number(parsed_balance);

		return {
			coinType: coinType,
			balance: Number(balanceNumber),
		};
	}

	/**
	 * @description Check if a pool is whitelisted
	 * @param {string} poolAddress Address of the pool
	 * @param {string} baseCoinType Type of the base coin
	 * @param {string} quoteCoinType Type of the quote coin
	 * @returns {Promise<boolean>} Boolean indicating if the pool is whitelisted
	 */
	async whitelisted(
		poolAddress: string,
		baseCoinType: string,
		quoteCoinType: string,
	): Promise<boolean> {
		const tx = new Transaction();

		tx.add(this.deepBook.whitelisted(poolAddress, baseCoinType, quoteCoinType));
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
	 * @param {string} poolAddress Address of the pool
	 * @param {number} baseQuantity Base quantity to convert
	 * @param {string} baseCoinType Type of the base coin
	 * @param {string} quoteCoinType Type of the quote coin
	 * @returns {Promise<{ baseQuantity: number, baseOut: number, quoteOut: number, deepRequired: number }>}
	 * An object with base quantity, base out, quote out, and deep required for the dry run
	 */
	async getQuoteQuantityOut(
		poolAddress: string,
		baseQuantity: number,
		baseCoinType: string,
		quoteCoinType: string,
	): Promise<{ baseQuantity: number; baseOut: number; quoteOut: number; deepRequired: number }> {
		const tx = new Transaction();

		tx.add(
			this.deepBook.getQuoteQuantityOut(poolAddress, baseQuantity, baseCoinType, quoteCoinType),
		);
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const baseOut = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![0][0])));
		const quoteOut = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![1][0])));
		const deepRequired = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![2][0])));

		return {
			baseQuantity,
			baseOut: baseOut,
			quoteOut: quoteOut,
			deepRequired: deepRequired,
		};
	}

	/**
	 * @description Get the base quantity out for a given quote quantity
	 * @param {string} poolAddress Address of the pool
	 * @param {number} quoteQuantity Quote quantity to convert
	 * @param {string} baseCoinType Type of the base coin
	 * @param {string} quoteCoinType Type of the quote coin
	 * @returns {Promise<{ quoteQuantity: number, baseOut: number, quoteOut: number, deepRequired: number }>}
	 * An object with quote quantity, base out, quote out, and deep required for the dry run
	 */
	async getBaseQuantityOut(
		poolAddress: string,
		quoteQuantity: number,
		baseCoinType: string,
		quoteCoinType: string,
	): Promise<{ quoteQuantity: number; baseOut: number; quoteOut: number; deepRequired: number }> {
		const tx = new Transaction();

		tx.add(
			this.deepBook.getBaseQuantityOut(poolAddress, quoteQuantity, baseCoinType, quoteCoinType),
		);
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const baseOut = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![0][0])));
		const quoteOut = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![1][0])));
		const deepRequired = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![2][0])));

		return {
			quoteQuantity: quoteQuantity,
			baseOut: baseOut,
			quoteOut: quoteOut,
			deepRequired: deepRequired,
		};
	}

	/**
	 * @description Get the output quantities for given base and quote quantities. Only one quantity can be non-zero
	 * @param {string} poolAddress Address of the pool
	 * @param {number} baseQuantity Base quantity to convert
	 * @param {number} quoteQuantity Quote quantity to convert
	 * @param {string} baseCoinType Type of the base coin
	 * @param {string} quoteCoinType Type of the quote coin
	 * @returns {Promise<{ baseQuantity: number, quoteQuantity: number, baseOut: number, quoteOut: number, deepRequired: number }>}
	 * An object with base quantity, quote quantity, base out, quote out, and deep required for the dry run
	 */
	async getQuantityOut(
		poolAddress: string,
		baseQuantity: number,
		quoteQuantity: number,
		baseCoinType: string,
		quoteCoinType: string,
	): Promise<{
		baseQuantity: number;
		quoteQuantity: number;
		baseOut: number;
		quoteOut: number;
		deepRequired: number;
	}> {
		const tx = new Transaction();

		tx.add(
			this.deepBook.getQuantityOut(
				poolAddress,
				baseQuantity,
				quoteQuantity,
				baseCoinType,
				quoteCoinType,
			),
		);
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
			baseOut: baseOut,
			quoteOut: quoteOut,
			deepRequired: deepRequired,
		};
	}

	/**
	 * @description Get open orders for a balance manager in a pool
	 * @param {string} poolAddress Address of the pool
	 * @param {string} managerAddress Address of the balance manager
	 * @param {string} baseCoinType Type of the base coin
	 * @param {string} quoteCoinType Type of the quote coin
	 * @returns {Promise<Array>} An array of open order IDs
	 */
	async accountOpenOrders(
		poolAddress: string,
		managerAddress: string,
		baseCoinType: string,
		quoteCoinType: string,
	): Promise<Array<any>> {
		const tx = new Transaction();

		tx.add(
			this.deepBook.accountOpenOrders(poolAddress, managerAddress, baseCoinType, quoteCoinType),
		);
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const order_ids = res.results![0].returnValues![0][0];
		const VecSet = bcs.struct('VecSet', {
			constants: bcs.vector(bcs.U128),
		});

		return VecSet.parse(new Uint8Array(order_ids)).constants;
	}

	/**
	 * @description Get the order information for a specific order in a pool
	 * @param {string} poolAddress Address of the pool
	 * @param {string} orderId Order ID
	 * @param {string} baseCoinType Type of the base coin
	 * @param {string} quoteCoinType Type of the quote coin
	 * @returns {Promise<Object>} A promise that resolves to an object containing the order information
	 */
	async getOrder(
		poolAddress: string,
		orderId: string,
		baseCoinType: string,
		quoteCoinType: string,
	): Promise<object> {
		const tx = new Transaction();

		tx.add(this.deepBook.getOrder(poolAddress, orderId, baseCoinType, quoteCoinType));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const ID = bcs.struct('ID', {
			bytes: bcs.Address,
		});
		const OrderDeepPrice = bcs.struct('OrderDeepPrice', {
			asset_is_base: bcs.bool(),
			deep_per_asset: bcs.u64(),
		});
		const Order = bcs.struct('Order', {
			balance_manager_id: ID,
			order_id: bcs.u128(),
			client_order_id: bcs.u64(),
			quantity: bcs.u64(),
			filled_quantity: bcs.u64(),
			fee_is_deep: bcs.bool(),
			order_deep_price: OrderDeepPrice,
			epoch: bcs.u64(),
			status: bcs.u8(),
			expire_timestamp: bcs.u64(),
		});

		const orderInformation = res.results![0].returnValues![0][0];
		return Order.parse(new Uint8Array(orderInformation));
	}

	/**
	 * @description Retrieves information for multiple specific orders in a pool.
	 * @param {string} poolAddress Address of the pool
	 * @param {string[]} orderIds List of order IDs to retrieve information for
	 * @param {string} baseCoinType Type of the base coin
	 * @param {string} quoteCoinType Type of the quote coin
	 * @returns {Promise<Object[] | null>} A promise that resolves to an array of order objects, each containing details such as
	 * balance manager ID, order ID, client order ID, quantity, filled quantity, fee information, order price, epoch, status,
	 * and expiration timestamp. Returns `null` if the retrieval fails.
	 */
	async getOrders(
		poolAddress: string,
		orderIds: string[],
		baseCoinType: string,
		quoteCoinType: string,
	): Promise<object[] | null> {
		const tx = new Transaction();

		tx.add(this.deepBook.getOrders(poolAddress, orderIds, baseCoinType, quoteCoinType));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const ID = bcs.struct('ID', {
			bytes: bcs.Address,
		});
		const OrderDeepPrice = bcs.struct('OrderDeepPrice', {
			asset_is_base: bcs.bool(),
			deep_per_asset: bcs.u64(),
		});
		const Order = bcs.struct('Order', {
			balance_manager_id: ID,
			order_id: bcs.u128(),
			client_order_id: bcs.u64(),
			quantity: bcs.u64(),
			filled_quantity: bcs.u64(),
			fee_is_deep: bcs.bool(),
			order_deep_price: OrderDeepPrice,
			epoch: bcs.u64(),
			status: bcs.u8(),
			expire_timestamp: bcs.u64(),
		});

		const orderInformation = res.results![0].returnValues![0][0];
		return bcs.vector(Order).parse(new Uint8Array(orderInformation));
	}

	/**
	 * @description Get level 2 order book specifying range of price
	 * @param {string} poolAddress Address of the pool
	 * @param {number} priceLow Lower bound of the price range
	 * @param {number} priceHigh Upper bound of the price range
	 * @param {boolean} isBid Whether to get bid or ask orders
	 * @param {string} baseCoinType Type of the base coin
	 * @param {string} quoteCoinType Type of the quote coin
	 * @returns {Promise<{ prices: Array<number>, quantities: Array<number> }>}
	 * An object with arrays of prices and quantities
	 */
	async getLevel2Range(
		poolAddress: string,
		priceLow: number,
		priceHigh: number,
		isBid: boolean,
		baseCoinType: string,
		quoteCoinType: string,
	): Promise<{ prices: Array<number>; quantities: Array<number> }> {
		const tx = new Transaction();

		tx.add(
			this.deepBook.getLevel2Range(
				poolAddress,
				priceLow,
				priceHigh,
				isBid,
				baseCoinType,
				quoteCoinType,
			),
		);
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const prices = res.results![0].returnValues![0][0];
		const parsed_prices = bcs.vector(bcs.u64()).parse(new Uint8Array(prices));
		const quantities = res.results![0].returnValues![1][0];
		const parsed_quantities = bcs.vector(bcs.u64()).parse(new Uint8Array(quantities));

		return {
			prices: parsed_prices.map((price) => Number(price)),
			quantities: parsed_quantities.map((quantity) => Number(quantity)),
		};
	}

	/**
	 * @description Get level 2 order book ticks from mid-price for a pool
	 * @param {string} poolAddress Address of the pool
	 * @param {number} ticks Number of ticks from mid-price
	 * @param {string} baseCoinType Type of the base coin
	 * @param {string} quoteCoinType Type of the quote coin
	 * @returns {Promise<{ bid_prices: Array<number>, bid_quantities: Array<number>, ask_prices: Array<number>, ask_quantities: Array<number> }>}
	 * An object with arrays of prices and quantities
	 */
	async getLevel2TicksFromMid(
		poolAddress: string,
		ticks: number,
		baseCoinType: string,
		quoteCoinType: string,
	): Promise<{
		bid_prices: Array<number>;
		bid_quantities: Array<number>;
		ask_prices: Array<number>;
		ask_quantities: Array<number>;
	}> {
		const tx = new Transaction();

		tx.add(this.deepBook.getLevel2TicksFromMid(poolAddress, ticks, baseCoinType, quoteCoinType));
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
			bid_prices: bid_parsed_prices.map((price) => Number(price)),
			bid_quantities: bid_parsed_quantities.map((quantity) => Number(quantity)),
			ask_prices: ask_parsed_prices.map((price) => Number(price)),
			ask_quantities: ask_parsed_quantities.map((quantity) => Number(quantity)),
		};
	}

	/**
	 * @description Get the vault balances for a pool
	 * @param {string} poolAddress Address of the pool
	 * @param {string} baseCoinType Type of the base coin
	 * @param {string} quoteCoinType Type of the quote coin
	 * @returns {Promise<{ base: number, quote: number, deep: number }>}
	 * An object with base, quote, and deep balances in the vault
	 */
	async vaultBalances(
		poolAddress: string,
		baseCoinType: string,
		quoteCoinType: string,
	): Promise<{ base: number; quote: number; deep: number }> {
		const tx = new Transaction();

		tx.add(this.deepBook.vaultBalances(poolAddress, baseCoinType, quoteCoinType));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const baseInVault = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![0][0])));
		const quoteInVault = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![1][0])));
		const deepInVault = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![2][0])));

		return {
			base: Number(baseInVault),
			quote: Number(quoteInVault),
			deep: Number(deepInVault),
		};
	}

	/**
	 * @description Get the pool ID by asset types
	 * @param {string} baseType Type of the base asset
	 * @param {string} quoteType Type of the quote asset
	 * @returns {Promise<string>} The address of the pool
	 */
	async getPoolIdByAssets(baseType: string, quoteType: string): Promise<string> {
		const tx = new Transaction();
		tx.add(this.deepBook.getPoolIdByAssets(baseType, quoteType));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const ID = bcs.struct('ID', {
			bytes: bcs.Address,
		});
		const address = ID.parse(new Uint8Array(res.results![0].returnValues![0][0]))['bytes'];

		return address;
	}

	/**
	 * @description Get the mid price for a pool
	 * @param {string} poolAddress Address of the pool
	 * @param {string} baseCoinType Type of the base coin
	 * @param {string} quoteCoinType Type of the quote coin
	 * @returns {Promise<number>} The mid price
	 */
	async midPrice(
		poolAddress: string,
		baseCoinType: string,
		quoteCoinType: string,
	): Promise<number> {
		const tx = new Transaction();
		tx.add(this.deepBook.midPrice(poolAddress, baseCoinType, quoteCoinType));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const bytes = res.results![0].returnValues![0][0];
		const parsed_mid_price = Number(bcs.U64.parse(new Uint8Array(bytes)));

		return Number(parsed_mid_price);
	}

	/**
	 * @description Get the trade parameters for a given pool, including taker fee, maker fee, and stake required.
	 * @param {string} poolAddress Address of the pool
	 * @param {string} baseCoinType Type of the base coin
	 * @param {string} quoteCoinType Type of the quote coin
	 * @returns {Promise<{ takerFee: number, makerFee: number, stakeRequired: number }>}
	 */
	async poolTradeParams(
		poolAddress: string,
		baseCoinType: string,
		quoteCoinType: string,
	): Promise<{ takerFee: number; makerFee: number; stakeRequired: number }> {
		const tx = new Transaction();

		tx.add(this.deepBook.poolTradeParams(poolAddress, baseCoinType, quoteCoinType));
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
			stakeRequired: Number(stakeRequired),
		};
	}

	/**
	 * @description Get the trade parameters for a given pool, including tick size, lot size, and min size.
	 * @param {string} poolAddress Address of the pool
	 * @param {string} baseCoinType Type of the base coin
	 * @param {string} quoteCoinType Type of the quote coin
	 * @returns {Promise<{ tickSize: number, lotSize: number, minSize: number }>}
	 */
	async poolBookParams(
		poolAddress: string,
		baseCoinType: string,
		quoteCoinType: string,
	): Promise<{ tickSize: number; lotSize: number; minSize: number }> {
		const tx = new Transaction();

		tx.add(this.deepBook.poolBookParams(poolAddress, baseCoinType, quoteCoinType));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const tickSize = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![0][0])));
		const lotSize = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![1][0])));
		const minSize = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![2][0])));

		return {
			tickSize: Number(tickSize),
			lotSize: Number(lotSize),
			minSize: Number(minSize),
		};
	}

	/**
	 * @description Get the account information for a given pool and balance manager
	 * @param {string} poolAddress Address of the pool
	 * @param {string} managerAddress Address of the BalanceManager
	 * @param {string} baseCoinType Type of the base coin
	 * @param {string} quoteCoinType Type of the quote coin
	 * @returns {Promise<Object>} A promise that resolves to an object containing the account information
	 */
	async account(
		poolAddress: string,
		managerAddress: string,
		baseCoinType: string,
		quoteCoinType: string,
	): Promise<object> {
		const tx = new Transaction();

		tx.add(this.deepBook.account(poolAddress, managerAddress, baseCoinType, quoteCoinType));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const ID = bcs.struct('ID', {
			bytes: bcs.Address,
		});

		const Balances = bcs.struct('Balances', {
			base: bcs.u64(),
			quote: bcs.u64(),
			deep: bcs.u64(),
		});

		const VecSet = bcs.struct('VecSet', {
			constants: bcs.vector(bcs.U128),
		});

		const Account = bcs.struct('Account', {
			epoch: bcs.u64(),
			open_orders: VecSet,
			taker_volume: bcs.u128(),
			maker_volume: bcs.u128(),
			active_stake: bcs.u64(),
			inactive_stake: bcs.u64(),
			created_proposal: bcs.bool(),
			voted_proposal: bcs.option(ID),
			unclaimed_rebates: Balances,
			settled_balances: Balances,
			owed_balances: Balances,
		});

		const accountInformation = res.results![0].returnValues![0][0];
		const accountInfo = Account.parse(new Uint8Array(accountInformation));

		return {
			epoch: accountInfo.epoch,
			open_orders: accountInfo.open_orders,
			taker_volume: Number(accountInfo.taker_volume),
			maker_volume: Number(accountInfo.maker_volume),
			active_stake: Number(accountInfo.active_stake),
			inactive_stake: Number(accountInfo.inactive_stake),
			created_proposal: accountInfo.created_proposal,
			voted_proposal: accountInfo.voted_proposal,
			unclaimed_rebates: {
				base: Number(accountInfo.unclaimed_rebates.base),
				quote: Number(accountInfo.unclaimed_rebates.quote),
				deep: Number(accountInfo.unclaimed_rebates.deep),
			},
			settled_balances: {
				base: Number(accountInfo.settled_balances.base),
				quote: Number(accountInfo.settled_balances.quote),
				deep: Number(accountInfo.settled_balances.deep),
			},
			owed_balances: {
				base: Number(accountInfo.owed_balances.base),
				quote: Number(accountInfo.owed_balances.quote),
				deep: Number(accountInfo.owed_balances.deep),
			},
		};
	}

	/**
	 * @description Get the locked balances for a pool and balance manager
	 * @param {string} poolAddress Address of the pool
	 * @param {string} managerAddress Address of the BalanceManager
	 * @param {string} baseCoinType Type of the base coin
	 * @param {string} quoteCoinType Type of the quote coin
	 * @returns {Promise<{ base: number, quote: number, deep: number }>}
	 * An object with base, quote, and deep locked for the balance manager in the pool
	 */
	async lockedBalance(
		poolAddress: string,
		managerAddress: string,
		baseCoinType: string,
		quoteCoinType: string,
	): Promise<{ base: number; quote: number; deep: number }> {
		const tx = new Transaction();

		tx.add(this.deepBook.lockedBalance(poolAddress, managerAddress, baseCoinType, quoteCoinType));
		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const baseLocked = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![0][0])));
		const quoteLocked = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![1][0])));
		const deepLocked = Number(bcs.U64.parse(new Uint8Array(res.results![0].returnValues![2][0])));

		return {
			base: Number(baseLocked),
			quote: Number(quoteLocked),
			deep: Number(deepLocked),
		};
	}

	/**
	 * @description Get the DEEP price conversion for a pool
	 * @param {string} poolAddress Address of the pool
	 * @param {string} baseCoinType Type of the base coin
	 * @param {string} quoteCoinType Type of the quote coin
	 * @returns {Promise<{ asset_is_base: bool, deep_per_quote: number }>} Deep price conversion
	 */
	async getPoolDeepPrice(
		poolAddress: string,
		baseCoinType: string,
		quoteCoinType: string,
	): Promise<{ asset_is_base: boolean; deep_per_asset: number }> {
		const tx = new Transaction();
		tx.add(this.deepBook.getPoolDeepPrice(poolAddress, baseCoinType, quoteCoinType));

		const res = await this.client.devInspectTransactionBlock({
			sender: normalizeSuiAddress(this.#address),
			transactionBlock: tx,
		});

		const OrderDeepPrice = bcs.struct('OrderDeepPrice', {
			asset_is_base: bcs.bool(),
			deep_per_asset: bcs.u64(),
		});

		const poolDeepPriceBytes = res.results![0].returnValues![0][0];
		const poolDeepPrice = OrderDeepPrice.parse(new Uint8Array(poolDeepPriceBytes));

		if (poolDeepPrice.asset_is_base) {
			return {
				asset_is_base: poolDeepPrice.asset_is_base,
				deep_per_asset: Number(poolDeepPrice.deep_per_asset),
			};
		} else {
			return {
				asset_is_base: poolDeepPrice.asset_is_base,
				deep_per_asset: Number(poolDeepPrice.deep_per_asset),
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
}
