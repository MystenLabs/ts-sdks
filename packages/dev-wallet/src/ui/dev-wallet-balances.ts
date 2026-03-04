// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { sectionHeaderStyles, sharedStyles, stateStyles } from './styles.js';
import { formatCoinBalance, getCoinDecimals, getCoinSymbol } from './utils.js';

interface CoinBalance {
	coinType: string;
	symbol: string;
	totalBalance: string;
	decimals: number;
}

@customElement('dev-wallet-balances')
export class DevWalletBalances extends LitElement {
	static override styles = [
		sharedStyles,
		sectionHeaderStyles,
		stateStyles,
		css`
			:host {
				display: block;
			}

			.balance-list {
				display: flex;
				flex-direction: column;
				gap: 4px;
			}

			.balance-item {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 10px 12px;
				border-radius: var(--dev-wallet-radius-sm);
				border: 1px solid var(--dev-wallet-border);
				background: var(--dev-wallet-secondary);
			}

			.balance-symbol {
				font-size: 14px;
				font-weight: var(--dev-wallet-font-weight-medium);
				color: var(--dev-wallet-foreground);
			}

			.balance-amount {
				font-size: 14px;
				color: var(--dev-wallet-foreground);
				font-family: var(--dev-wallet-font-mono);
			}
		`,
	];

	@property({ type: String })
	address = '';

	@property({ attribute: false })
	client: ClientWithCoreApi | null = null;

	@state()
	private _balances: CoinBalance[] = [];

	@state()
	private _loading = false;

	@state()
	private _error: string | null = null;

	#lastFetchedAddress = '';
	#lastFetchedClient: ClientWithCoreApi | null = null;
	#fetchGeneration = 0;

	/** Re-fetch balances for the current address/client. */
	refresh() {
		if (this.address && this.client) {
			this.#fetchBalances();
		}
	}

	override willUpdate(changedProperties: Map<string, unknown>) {
		if (
			(changedProperties.has('address') || changedProperties.has('client')) &&
			this.address &&
			this.client &&
			(this.address !== this.#lastFetchedAddress || this.client !== this.#lastFetchedClient)
		) {
			this.#fetchBalances();
		}
	}

	override render() {
		if (!this.address || !this.client) {
			return nothing;
		}

		return html`
			<h3 class="section-header">Balances</h3>
			${this._loading
				? html`<div class="loading" part="loading" aria-live="polite">Loading...</div>`
				: this._error
					? html`<div class="error-state" part="error-message" aria-live="polite">
							${this._error}
						</div>`
					: this._balances.length === 0
						? html`<div class="empty-state" part="empty-state">No balances</div>`
						: html`
								<div class="balance-list" part="balance-list">
									${this._balances.map(
										(balance) => html`
											<div class="balance-item">
												<span class="balance-symbol">${balance.symbol}</span>
												<span class="balance-amount"
													>${formatCoinBalance(balance.totalBalance, balance.decimals)}</span
												>
											</div>
										`,
									)}
								</div>
							`}
		`;
	}

	async #fetchBalances() {
		this.#lastFetchedAddress = this.address;
		this.#lastFetchedClient = this.client;
		const generation = ++this.#fetchGeneration;
		this._loading = true;
		this._error = null;

		try {
			const { balances } = await this.client!.core.listBalances({ owner: this.address });

			if (generation !== this.#fetchGeneration) return;
			this._balances = balances.map(
				(b): CoinBalance => ({
					coinType: b.coinType,
					symbol: getCoinSymbol(b.coinType),
					totalBalance: b.balance,
					decimals: getCoinDecimals(b.coinType),
				}),
			);
		} catch {
			if (generation !== this.#fetchGeneration) return;
			this._error = 'Failed to load balances';
			this._balances = [];
		} finally {
			if (generation === this.#fetchGeneration) {
				this._loading = false;
			}
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dev-wallet-balances': DevWalletBalances;
	}
}
