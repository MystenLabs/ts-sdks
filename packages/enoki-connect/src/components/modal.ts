// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseModal } from './base-modal.js';

/**
 * A modal component for displaying wallet operation request fallback UI.
 *
 * @element enoki-connect-modal
 *
 * @prop {string} walletName - The name of the wallet.
 * @prop {string} dappName - The name of the dapp.
 * @prop {boolean} disabled - Whether the modal is disabled.
 * @prop {boolean} open - Whether the modal is open.
 *
 */
@customElement('enoki-connect-modal')
export class EnokiConnectModal extends BaseModal {
	static styles = css`
		:host {
			--modal-font-family: var(
				--font-family,
				ui-sans-serif,
				system-ui,
				-apple-system,
				BlinkMacSystemFont,
				'Segoe UI',
				Roboto,
				'Helvetica Neue',
				Arial,
				'Noto Sans',
				sans-serif,
				'Apple Color Emoji',
				'Segoe UI Emoji',
				'Segoe UI Symbol',
				'Noto Color Emoji'
			);
			--modal-radius: var(--radius, 0.625rem);
			--modal-background: var(--popover, oklch(1 0 0));
			--modal-foreground: var(--popover-foreground, oklch(0.145 0 0));
			--modal-backdrop: oklch(from var(--modal-background) l c h / 0.4);
			--modal-box-shadow: 0 1px 10px oklch(from var(--modal-foreground) l c h / 0.01);
			--modal-primary: var(--primary, oklch(0.205 0 0));
			--modal-primary-foreground: var(--primary-foreground, oklch(0.985 0 0));
			--modal-primary-hover: color-mix(in oklch, var(--modal-primary) 85%, white);
			--modal-secondary: var(--secondary, oklch(0.97 0 0));
			--modal-secondary-foreground: var(--secondary-foreground, oklch(0.205 0 0));
			--modal-secondary-hover: color-mix(in oklch, var(--modal-secondary) 85%, white);
			--modal-muted-foreground: var(--muted-foreground, oklch(0.556 0 0));
			--modal-accent: var(--accent, oklch(0.97 0 0));
			--modal-accent-foreground: var(--accent-foreground, oklch(0.205 0 0));
		}
		.modal {
			color: var(--modal-foreground);
			border: none;
			animation: fadeIn 250ms ease-in-out forwards;
			max-width: 320px;
			background-color: var(--modal-background);
			border-radius: var(--modal-radius);
			box-shadow: var(--modal-box-shadow);
			padding: 0;
			font-family: var(--modal-font-family);
		}
		.modal::backdrop {
			background-color: var(--modal-backdrop);
		}
		.content {
			padding: 20px;
			display: flex;
			flex-direction: column;
			gap: 10px;
		}
		.capitalize {
			text-transform: capitalize;
		}
		.bold {
			font-weight: 800;
		}
		.title {
			font-size: 16px;
			font-weight: 600;
			line-height: 1.5;
			color: var(--modal-foreground);
			margin: 0;
		}
		.description {
			font-size: 14px;
			line-height: 1.5;
			color: var(--modal-muted-foreground);
			margin: 0;
		}
		.footer {
			display: flex;
			justify-content: flex-end;
			align-items: center;
			gap: 10px;
		}
		.btn {
			border: none;
			border-radius: 6px;
			padding: 8px 14px;
			cursor: pointer;
			transition: background 0.2s;
			font-size: 13px;
			font-weight: 600;
		}
		.btn.primary {
			background: var(--modal-primary);
			color: var(--modal-primary-foreground);
		}
		.btn.primary:hover,
		.btn.primary:focus,
		.btn.primary:active {
			background: var(--modal-primary-hover);
		}
		.btn.secondary {
			background: var(--modal-secondary);
			color: var(--modal-secondary-foreground);
		}
		.btn.secondary:hover,
		.btn.secondary:focus,
		.btn.secondary:active {
			background: var(--modal-secondary-hover);
		}
		button:disabled {
			opacity: 0.5;
			cursor: default;
		}
		.close {
			all: unset;
			position: absolute;
			top: 5px;
			right: 5px;
			background: transparent;
			color: var(--modal-muted-foreground);
			border: none;
			cursor: pointer;
			width: 18px;
			height: 18px;
			border-radius: var(--modal-radius);
			padding: 3px;
			transition: background 0.2s;
		}
		.close:hover,
		.close:focus,
		.close:active {
			background: var(--modal-accent);
			color: var(--modal-accent-foreground);
		}
		.modal.closing {
			animation: fadeOut 250ms ease-in-out forwards;
		}

		@keyframes fadeIn {
			from {
				transform: translateY(-20px) scale(0.8);
				opacity: 0;
			}
			to {
				opacity: 1;
			}
		}
		@keyframes fadeOut {
			from {
				opacity: 1;
			}
			to {
				transform: translateY(20px) scale(0.8);
				opacity: 0;
			}
		}
	`;

	@property()
	walletName: string = '';
	@property()
	dappName: string = '';

	#handleContinue() {
		this.dispatchEvent(new CustomEvent('approved'));
	}

	override render() {
		return html`<dialog
			@click=${this.handleDialogClick}
			@cancel=${this.handleCancel}
			class="modal${this._isClosing ? ' closing' : ''}"
			@animationend=${this.handleAnimationEnd}
		>
			<div class="content" @click=${this.handleContentClick}>
				<button
					class="close"
					@click=${this.handleCancel}
					?disabled=${this.disabled || this._isClosing}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-x"
					>
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				</button>
				<h1 class="title capitalize">${this.walletName} Operation Request</h1>
				<p class="description">
					<span class="capitalize bold">${this.dappName}</span> requested a wallet operation. Click
					continue to open <span class="wallet-name bold">${this.walletName}</span> (in a new tab)
					and review the request.
				</p>
				<div class="footer">
					<button
						class="btn secondary"
						@click=${this.handleCancel}
						?disabled=${this.disabled || this._isClosing}
					>
						Cancel
					</button>
					<button
						class="btn primary"
						@click=${this.#handleContinue}
						?disabled=${this.disabled || this._isClosing}
					>
						Continue
					</button>
				</div>
			</div>
		</dialog>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'enoki-connect-modal': EnokiConnectModal;
	}
}
