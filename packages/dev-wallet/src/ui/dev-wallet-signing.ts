// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { ClientWithCoreApi } from '@mysten/sui/client';
import type { AnalyzedCommand } from '@mysten/wallet-sdk';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { WalletRequest } from '../wallet/dev-wallet.js';
import { sharedStyles } from './styles.js';
import type { FallbackCommand, TransactionAnalysis } from './transaction-analyzer.js';
import { analyzeTransaction } from './transaction-analyzer.js';
import { formatAddress, formatCoinBalance, getCoinDecimals, getCoinSymbol } from './utils.js';

const REQUEST_TYPE_LABELS: Record<WalletRequest['type'], string> = {
	'sign-personal-message': 'Sign Message',
	'sign-transaction': 'Sign Transaction',
	'sign-and-execute-transaction': 'Sign & Execute Transaction',
};

@customElement('dev-wallet-signing')
export class DevWalletSigning extends LitElement {
	static override styles = [
		sharedStyles,
		css`
			:host {
				display: flex;
				flex-direction: column;
				overflow: hidden;
				min-height: 0;
			}

			.signing-content {
				flex: 1;
				overflow-y: auto;
				padding: 16px;
			}

			.signing-footer {
				padding: 12px 16px;
				border-top: 1px solid var(--dev-wallet-border);
			}

			.signing-header {
				display: flex;
				align-items: center;
				gap: 8px;
				margin-bottom: 12px;
			}

			.signing-badge {
				display: inline-block;
				width: 8px;
				height: 8px;
				border-radius: 50%;
				background: var(--dev-wallet-warning);
				animation: pulse 2s infinite;
			}

			@keyframes pulse {
				0%,
				100% {
					opacity: 1;
				}
				50% {
					opacity: 0.5;
				}
			}

			.signing-title {
				font-size: 14px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-foreground);
			}

			.request-type {
				font-size: 13px;
				color: var(--dev-wallet-primary);
				font-weight: var(--dev-wallet-font-weight-medium);
				margin-bottom: 8px;
			}

			.request-detail {
				display: flex;
				justify-content: space-between;
				padding: 6px 0;
				font-size: 12px;
				border-bottom: 1px solid var(--dev-wallet-border);
			}

			.request-detail:last-of-type {
				border-bottom: none;
			}

			.detail-label {
				color: var(--dev-wallet-muted-foreground);
			}

			.detail-value {
				color: var(--dev-wallet-foreground);
				font-family: monospace;
				max-width: 180px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.request-data {
				margin: 12px 0;
				padding: 8px;
				border-radius: var(--dev-wallet-radius-xs);
				background: var(--dev-wallet-background);
				font-family: monospace;
				font-size: 11px;
				color: var(--dev-wallet-muted-foreground);
				max-height: 80px;
				overflow-y: auto;
				word-break: break-all;
			}

			.section-label {
				font-size: 11px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-muted-foreground);
				text-transform: uppercase;
				letter-spacing: 0.5px;
				margin: 12px 0 6px;
			}

			.coin-flows {
				display: flex;
				flex-direction: column;
				gap: 4px;
				margin-bottom: 4px;
			}

			.coin-flow-item {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 8px;
				border-radius: var(--dev-wallet-radius-xs);
				background: var(--dev-wallet-background);
				font-size: 12px;
			}

			.coin-flow-type {
				color: var(--dev-wallet-muted-foreground);
			}

			.coin-flow-amount {
				font-family: monospace;
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-destructive);
			}

			.commands-list {
				display: flex;
				flex-direction: column;
				gap: 4px;
			}

			.command-item {
				padding: 8px;
				border-radius: var(--dev-wallet-radius-xs);
				background: var(--dev-wallet-background);
				font-size: 12px;
			}

			.command-kind {
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-primary);
				margin-bottom: 2px;
			}

			.command-detail {
				color: var(--dev-wallet-muted-foreground);
				font-family: monospace;
				font-size: 11px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.command-args {
				margin-top: 4px;
				padding-left: 8px;
				border-left: 2px solid var(--dev-wallet-border);
			}

			.command-arg {
				font-size: 11px;
				color: var(--dev-wallet-muted-foreground);
				font-family: monospace;
				padding: 1px 0;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.arg-access {
				font-size: 10px;
				padding: 1px 4px;
				border-radius: 3px;
				font-weight: var(--dev-wallet-font-weight-medium);
			}

			.arg-access-read {
				background: color-mix(in oklab, var(--dev-wallet-primary) 20%, transparent);
				color: var(--dev-wallet-primary);
			}

			.arg-access-mutate {
				background: color-mix(in oklab, var(--dev-wallet-warning) 20%, transparent);
				color: var(--dev-wallet-warning);
			}

			.arg-access-transfer {
				background: color-mix(in oklab, var(--dev-wallet-destructive) 20%, transparent);
				color: var(--dev-wallet-destructive);
			}

			.actions {
				display: flex;
				gap: 8px;
			}

			.btn {
				flex: 1;
				padding: 10px 16px;
				border-radius: var(--dev-wallet-radius-md);
				font-size: 13px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				transition: background-color 0.15s;
			}

			.btn-approve {
				background: var(--dev-wallet-positive);
				color: var(--dev-wallet-primary-foreground);
			}

			.btn-approve:hover {
				background: oklab(from var(--dev-wallet-positive) calc(l - 0.03) a b);
			}

			.btn-reject {
				background: var(--dev-wallet-destructive);
				color: var(--dev-wallet-primary-foreground);
			}

			.btn-reject:hover {
				background: oklab(from var(--dev-wallet-destructive) calc(l - 0.05) a b);
			}

			.no-request {
				text-align: center;
				padding: 20px;
				color: var(--dev-wallet-muted-foreground);
				font-size: 13px;
			}
		`,
	];

	@property({ attribute: false })
	request: WalletRequest | null = null;

	@property({ attribute: false })
	client: ClientWithCoreApi | null = null;

	@state()
	private _analysis: TransactionAnalysis | null = null;

	@state()
	private _fallbackCommands: FallbackCommand[] | null = null;

	@state()
	private _analyzing = false;

	#analysisGeneration = 0;

	override willUpdate(changedProperties: Map<string, unknown>) {
		if (changedProperties.has('request')) {
			this._analysis = null;
			this._fallbackCommands = null;
			this._analyzing = false;
			if (this.request && this.request.type !== 'sign-personal-message') {
				this.#analyzeTransaction();
			}
		}
	}

	async #analyzeTransaction() {
		if (!this.request || typeof this.request.data !== 'string') return;

		this._analyzing = true;
		const generation = ++this.#analysisGeneration;

		const result = await analyzeTransaction(this.request.data, this.client);
		if (generation !== this.#analysisGeneration) return;

		if (result.kind === 'rich') {
			this._analysis = result.analysis;
		} else if (result.kind === 'fallback') {
			this._fallbackCommands = result.commands;
		}

		this._analyzing = false;
	}

	override render() {
		if (!this.request) {
			return html`<div class="no-request">No pending requests</div>`;
		}

		const typeLabel = REQUEST_TYPE_LABELS[this.request.type];

		return html`
			<div class="signing-content">
				<div class="signing-header">
					<span class="signing-badge"></span>
					<span class="signing-title">Approval Required</span>
				</div>

				<div class="request-type">${typeLabel}</div>

				<div class="request-detail">
					<span class="detail-label">Account</span>
					<span class="detail-value">${formatAddress(this.request.account.address)}</span>
				</div>
				${this.request.type !== 'sign-personal-message'
					? html`<div class="request-detail">
							<span class="detail-label">Chain</span>
							<span class="detail-value">${this.request.chain}</span>
						</div>`
					: nothing}

				${this.#renderTransactionPreview()}
			</div>
			<div class="signing-footer">
				<div class="actions">
					<button class="btn btn-reject" @click=${this.#reject}>Reject</button>
					<button class="btn btn-approve" @click=${this.#approve}>Approve</button>
				</div>
			</div>
		`;
	}

	#renderTransactionPreview() {
		// Still loading
		if (this._analyzing) {
			return html`<div class="section-label">Analyzing transaction...</div>`;
		}

		// Rich analysis from wallet-sdk
		if (this._analysis) {
			return html`
				${this.#renderCoinFlows()} ${this.#renderAnalyzedCommands(this._analysis.commands)}
			`;
		}

		// Fallback commands
		if (this._fallbackCommands) {
			return html`
				<div class="section-label">Commands</div>
				<div class="commands-list">
					${this._fallbackCommands.map(
						(cmd) => html`
							<div class="command-item">
								<div class="command-kind">${cmd.$kind}</div>
								${cmd.detail ? html`<div class="command-detail">${cmd.detail}</div>` : nothing}
							</div>
						`,
					)}
				</div>
			`;
		}

		const dataPreview = this.#getDataPreview();
		return dataPreview ? html`<div class="request-data">${dataPreview}</div>` : nothing;
	}

	#renderCoinFlows() {
		const flows = this._analysis?.coinFlows;
		if (!flows || flows.length === 0) return nothing;

		return html`
			<div class="section-label">Estimated Cost</div>
			<div class="coin-flows">
				${flows.map((flow) => {
					const decimals = getCoinDecimals(flow.coinType);
					const formatted = formatCoinBalance(flow.amount, decimals);
					// Outflows are shown as negative (cost), displayed in destructive color
					return html`
						<div class="coin-flow-item">
							<span class="coin-flow-type">${getCoinSymbol(flow.coinType)}</span>
							<span class="coin-flow-amount"> -${formatted} </span>
						</div>
					`;
				})}
			</div>
		`;
	}

	#renderAnalyzedCommands(commands: AnalyzedCommand[]) {
		return html`
			<div class="section-label">Commands</div>
			<div class="commands-list">${commands.map((cmd) => this.#renderAnalyzedCommand(cmd))}</div>
		`;
	}

	#renderAnalyzedCommand(cmd: AnalyzedCommand) {
		switch (cmd.$kind) {
			case 'MoveCall':
				return html`
					<div class="command-item">
						<div class="command-kind">MoveCall</div>
						<div class="command-detail">
							${cmd.function.packageId}::${cmd.function.moduleName}::${cmd.function.name}
						</div>
						${cmd.arguments.length > 0 ? this.#renderArgs(cmd.arguments) : nothing}
					</div>
				`;
			case 'TransferObjects':
				return html`
					<div class="command-item">
						<div class="command-kind">TransferObjects</div>
						<div class="command-detail">
							${cmd.objects.length} object${cmd.objects.length !== 1 ? 's' : ''}
							${cmd.address.$kind === 'Pure'
								? html` &rarr; ${formatAddress(this.#decodePureAddress(cmd.address))}`
								: nothing}
						</div>
					</div>
				`;
			case 'SplitCoins':
				return html`
					<div class="command-item">
						<div class="command-kind">SplitCoins</div>
						<div class="command-detail">
							${cmd.amounts.length} split${cmd.amounts.length !== 1 ? 's' : ''} from
							${cmd.coin.$kind === 'GasCoin' ? 'gas coin' : 'coin'}
						</div>
					</div>
				`;
			case 'MergeCoins':
				return html`
					<div class="command-item">
						<div class="command-kind">MergeCoins</div>
						<div class="command-detail">
							${cmd.sources.length} source${cmd.sources.length !== 1 ? 's' : ''}
						</div>
					</div>
				`;
			case 'Publish':
				return html`
					<div class="command-item">
						<div class="command-kind">Publish</div>
						<div class="command-detail">New package</div>
					</div>
				`;
			case 'Upgrade':
				return html`
					<div class="command-item">
						<div class="command-kind">Upgrade</div>
						<div class="command-detail">Package upgrade</div>
					</div>
				`;
			default:
				return html`
					<div class="command-item">
						<div class="command-kind">${cmd.$kind}</div>
					</div>
				`;
		}
	}

	#renderArgs(args: import('@mysten/wallet-sdk').AnalyzedCommandArgument[]) {
		return html`
			<div class="command-args">
				${args.map(
					(arg) => html`
						<div class="command-arg">
							<span class="arg-access arg-access-${arg.accessLevel}">${arg.accessLevel}</span>
							${this.#describeArg(arg)}
						</div>
					`,
				)}
			</div>
		`;
	}

	#describeArg(arg: import('@mysten/wallet-sdk').AnalyzedCommandArgument): string {
		switch (arg.$kind) {
			case 'GasCoin':
				return 'Gas Coin';
			case 'Result':
				return `Result [${arg.index[0]}, ${arg.index[1]}]`;
			case 'Pure':
				return `${arg.bytes.slice(0, 16)}${arg.bytes.length > 16 ? '...' : ''}`;
			case 'Object':
				return formatAddress(arg.object.objectId);
			case 'Unknown':
				return 'unknown';
		}
	}

	#decodePureAddress(arg: import('@mysten/wallet-sdk').AnalyzedCommandArgument): string {
		if (arg.$kind === 'Pure') {
			try {
				return bcs.Address.fromBase64(arg.bytes);
			} catch {
				// fall through
			}
		}
		return '?';
	}

	#getDataPreview(): string | null {
		if (!this.request) return null;

		if (this.request.type === 'sign-personal-message') {
			const data = this.request.data;
			if (data instanceof Uint8Array) {
				try {
					return new TextDecoder().decode(data);
				} catch {
					return `[${data.length} bytes]`;
				}
			}
		}

		if (typeof this.request.data === 'string') {
			return this.request.data.length > 200
				? this.request.data.slice(0, 200) + '...'
				: this.request.data;
		}

		return null;
	}

	#approve() {
		this.dispatchEvent(new CustomEvent('approve', { bubbles: true, composed: true }));
	}

	#reject() {
		this.dispatchEvent(new CustomEvent('reject', { bubbles: true, composed: true }));
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dev-wallet-signing': DevWalletSigning;
	}
}
