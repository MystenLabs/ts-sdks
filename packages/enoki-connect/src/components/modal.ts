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
 * @cssprop --enoki-connect-modal-font-family - The font family of the modal.
 * @cssprop --enoki-connect-modal-backdrop-background - The background color of the backdrop.
 * @cssprop --enoki-connect-modal-background - The background color of the modal.
 * @cssprop --enoki-connect-modal-box-shadow - The shadow of the modal.
 * @cssprop --enoki-connect-modal-title-foreground - The color of the title.
 * @cssprop --enoki-connect-modal-description-foreground - The color of the description.
 * @cssprop --enoki-connect-modal-primary-background - The background color of the primary button.
 * @cssprop --enoki-connect-modal-primary-foreground - The color of the primary button.
 * @cssprop --enoki-connect-modal-primary-background-hover - The background color of the primary button on hover.
 * @cssprop --enoki-connect-modal-primary-foreground-hover - The color of the primary button on hover.
 * @cssprop --enoki-connect-modal-secondary-background - The background color of the secondary button.
 * @cssprop --enoki-connect-modal-secondary-foreground - The color of the secondary button.
 * @cssprop --enoki-connect-modal-secondary-background-hover - The background color of the secondary button on hover.
 * @cssprop --enoki-connect-modal-secondary-foreground-hover - The color of the secondary button on hover.
 * @cssprop --enoki-connect-modal-close-background - The background color of the close button.
 * @cssprop --enoki-connect-modal-close-foreground - The color of the close button.
 * @cssprop --enoki-connect-modal-close-background-hover - The background color of the close button on hover.
 * @cssprop --enoki-connect-modal-close-foreground-hover - The color of the close button on hover.
 */
@customElement('enoki-connect-modal')
export class EnokiConnectModal extends BaseModal {
	static styles = css`
		.modal {
			color: #222222;
			border: none;
			animation: fadeIn 250ms ease-in-out forwards;
			max-width: 320px;
			background-color: var(--enoki-connect-modal-background, #e6e6e6);
			border-radius: 12px;
			box-shadow: var(--enoki-connect-modal-box-shadow, 0 12px 32px rgba(0, 0, 0, 0.6));
			padding: 0;
			font-family: var(
				--enoki-connect-modal-font-family,
				ui-sans-serif,
				system-ui,
				-apple-system,
				'Segoe UI',
				Roboto,
				Helvetica,
				Arial,
				'Apple Color Emoji',
				'Segoe UI Emoji',
				'Noto Color Emoji',
				sans-serif
			);
		}
		.modal::backdrop {
			background-color: var(--enoki-connect-modal-backdrop-background, rgba(0, 0, 0, 0.5));
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
			color: var(--enoki-connect-modal-title-foreground, #222222);
			margin: 0;
		}
		.description {
			font-size: 14px;
			line-height: 1.5;
			color: var(--enoki-connect-modal-description-foreground, #666666);
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
			background: var(--enoki-connect-modal-primary-background, rgba(142, 148, 142, 0.4));
			color: var(--enoki-connect-modal-primary-foreground, #111);
		}
		.btn.primary:hover,
		.btn.primary:focus,
		.btn.primary:active {
			background: var(--enoki-connect-modal-primary-background-hover, rgba(142, 148, 142, 0.55));
			color: var(--enoki-connect-modal-primary-foreground-hover, #111);
		}
		.btn.secondary {
			background: var(--enoki-connect-modal-secondary-background, transparent);
			color: var(--enoki-connect-modal-secondary-foreground, #222222);
		}
		.btn.secondary:hover,
		.btn.secondary:focus,
		.btn.secondary:active {
			background: var(--enoki-connect-modal-secondary-background-hover, #dddddd);
			color: var(--enoki-connect-modal-secondary-foreground-hover, #222222);
		}
		button:disabled {
			opacity: 0.5;
			cursor: default;
		}
		.close {
			all: unset;
			position: absolute;
			top: 10px;
			right: 10px;
			background: var(--enoki-connect-modal-close-background, transparent);
			color: var(--enoki-connect-modal-close-foreground, #222222);
			border: none;
			cursor: pointer;
			width: 20px;
			height: 20px;
			border-radius: 6px;
			padding: 2px;
			transition: background 0.2s;
		}
		.close:hover,
		.close:focus,
		.close:active {
			background: var(--enoki-connect-modal-close-background-hover, #dddddd);
			color: var(--enoki-connect-modal-close-foreground-hover, #222222);
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
