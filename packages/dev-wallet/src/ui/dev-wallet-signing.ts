// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { ClientWithCoreApi } from '@mysten/sui/client';
import type { AnalyzedCommand } from '@mysten/wallet-sdk';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { PendingSigningRequest } from '../wallet/dev-wallet.js';
import { CopyController } from './copy-controller.js';
import { actionButtonStyles, sharedStyles } from './styles.js';
import type { TransactionAnalysis } from './transaction-analyzer.js';
import { analyzeTransaction } from './transaction-analyzer.js';
import { emitEvent, formatAddress, formatCoinBalance, getCoinSymbol } from './utils.js';

const REQUEST_TYPE_LABELS: Record<PendingSigningRequest['type'], string> = {
	'sign-personal-message': 'Sign Message',
	'sign-transaction': 'Sign Transaction',
	'sign-and-execute-transaction': 'Sign & Execute Transaction',
};

@customElement('dev-wallet-signing')
export class DevWalletSigning extends LitElement {
	static override styles = [
		sharedStyles,
		actionButtonStyles,
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
				font-family: var(--dev-wallet-font-mono);
				max-width: 220px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.detail-value.copyable-addr {
				cursor: pointer;
				border-radius: var(--dev-wallet-radius-2xs);
				padding: 1px 3px;
				transition: background 0.15s;
			}

			.detail-value.copyable-addr:hover {
				background: color-mix(in oklab, var(--dev-wallet-primary) 15%, transparent);
			}

			.detail-value.copied {
				color: var(--dev-wallet-positive);
			}

			.detail-secondary {
				color: var(--dev-wallet-muted-foreground);
				font-size: 0.85em;
			}

			.request-data {
				margin: 12px 0;
				padding: 8px;
				border-radius: var(--dev-wallet-radius-xs);
				background: var(--dev-wallet-background);
				font-family: var(--dev-wallet-font-mono);
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
				font-family: var(--dev-wallet-font-mono);
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
				font-family: var(--dev-wallet-font-mono);
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
				font-family: var(--dev-wallet-font-mono);
				padding: 1px 0;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.arg-access {
				font-size: 10px;
				padding: 1px 4px;
				border-radius: var(--dev-wallet-radius-2xs);
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

			.error-state {
				padding: 10px;
				border-radius: var(--dev-wallet-radius-xs);
				background: color-mix(in oklab, var(--dev-wallet-destructive) 10%, transparent);
				color: var(--dev-wallet-destructive);
				font-size: 12px;
				word-break: break-word;
			}

			.section-label-error {
				color: var(--dev-wallet-destructive);
			}

			.error-title {
				font-weight: var(--dev-wallet-font-weight-semibold);
				margin-bottom: 4px;
			}

			.error-body {
				margin-bottom: 6px;
			}

			.error-hint {
				font-size: 11px;
				opacity: 0.8;
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
	request: PendingSigningRequest | null = null;

	@property({ attribute: false })
	client: ClientWithCoreApi | null = null;

	@state()
	private _analysis: TransactionAnalysis | null = null;

	@state()
	private _analysisError: string | null = null;

	@state()
	private _analyzing = false;

	#copy = new CopyController(this);
	#analysisGeneration = 0;
	#coinDecimalsCache = new Map<string, number>();

	override willUpdate(changedProperties: Map<string, unknown>) {
		if (changedProperties.has('request')) {
			this._analysis = null;
			this._analysisError = null;
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
			// Fetch coin metadata for all coin types in flows
			if (this.client && result.analysis.coinFlows?.length) {
				const coinTypes = [...new Set(result.analysis.coinFlows.map((f) => f.coinType))];
				await Promise.all(
					coinTypes
						.filter((ct) => !this.#coinDecimalsCache.has(ct))
						.map(async (ct) => {
							try {
								const { coinMetadata } = await this.client!.core.getCoinMetadata({
									coinType: ct,
								});
								if (coinMetadata) {
									this.#coinDecimalsCache.set(ct, coinMetadata.decimals);
								}
							} catch {
								// leave uncached — will use 0 as fallback
							}
						}),
				);
				if (generation !== this.#analysisGeneration) return;
				this.requestUpdate();
			}
		} else {
			this._analysisError = result.message;
		}

		this._analyzing = false;
	}

	override render() {
		if (!this.request) {
			return html`<div class="no-request" part="empty-state">No pending requests</div>`;
		}

		const typeLabel = REQUEST_TYPE_LABELS[this.request.type];

		// For transactions: only allow approval after successful analysis
		// For personal messages: always allow (no analysis needed)
		const isTransaction = this.request.type !== 'sign-personal-message';
		const canApprove = isTransaction
			? this._analysis !== null && !this._analysisError && !this._analyzing
			: true;

		return html`
			<div class="signing-content">
				<div class="signing-header">
					<span class="signing-badge"></span>
					<span class="signing-title">Approval Required</span>
				</div>

				<div class="request-type" part="request-type">${typeLabel}</div>

				<div class="request-detail">
					<span class="detail-label">Account</span>
					<span
						class="detail-value copyable-addr ${this.#copy.isCopied(this.request.account.address)
							? 'copied'
							: ''}"
						title="Click to copy"
						role="button"
						tabindex="0"
						aria-label="Copy account address"
						@click=${() => this.#copy.copy(this.request!.account.address)}
						@keydown=${(e: KeyboardEvent) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								this.#copy.copy(this.request!.account.address);
							}
						}}
					>
						${this.#copy.isCopied(this.request.account.address)
							? 'Copied!'
							: this.request.account.label
								? html`${this.request.account.label}
										<span class="detail-secondary"
											>${formatAddress(this.request.account.address)}</span
										>`
								: formatAddress(this.request.account.address)}
					</span>
				</div>
				${isTransaction
					? html`<div class="request-detail">
							<span class="detail-label">Chain</span>
							<span class="detail-value">${this.request.chain}</span>
						</div>`
					: nothing}
				${this.#renderTransactionPreview()}
			</div>
			<div class="signing-footer" part="footer">
				<div class="actions">
					<button class="btn btn-reject" part="reject-button" @click=${this.#reject}>Reject</button>
					${canApprove
						? html`<button class="btn btn-approve" part="approve-button" @click=${this.#approve}>
								Approve
							</button>`
						: nothing}
				</div>
			</div>
		`;
	}

	#renderTransactionPreview() {
		if (this._analyzing) {
			return html`<div class="section-label">Analyzing transaction...</div>`;
		}

		if (this._analysisError) {
			return html`
				<div class="section-label section-label-error">Analysis Failed</div>
				<div class="error-state" part="error-message">
					<div class="error-title">Unable to analyze this transaction</div>
					<div class="error-body">${this._analysisError}</div>
					<div class="error-hint">
						The transaction cannot be approved without successful analysis. Check that the network
						is reachable and the transaction is well-formed.
					</div>
				</div>
			`;
		}

		if (this._analysis) {
			return html`
				${this.#renderCoinFlows()} ${this.#renderAnalyzedCommands(this._analysis.commands)}
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
					const decimals = this.#coinDecimalsCache.get(flow.coinType) ?? 0;
					const formatted = formatCoinBalance(flow.amount, decimals);
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
		emitEvent(this, 'approve');
	}

	#reject() {
		emitEvent(this, 'reject');
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dev-wallet-signing': DevWalletSigning;
	}
}
