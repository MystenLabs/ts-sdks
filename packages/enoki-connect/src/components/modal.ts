// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('enoki-connect-modal')
export class EnokiConnectModal extends LitElement {
	static styles = css`
		:host {
			font-family: Poppins, sans-serif;
			position: fixed;
			inset: 0;
			z-index: 99999;
			color: #222222;
		}
		.modal {
			border: none;
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			height: 100%;
			animation: fadeIn 0.2s ease-in-out forwards;
		}
		.backdrop {
			background-color: rgba(0, 0, 0, 0.5);
			position: absolute;
			inset: 0;
			z-index: 0;
		}
		.content {
			background-color: #e6e6e6;
			padding: 20px;
			border-radius: 12px;
			z-index: 1;
			max-width: 320px;
			display: flex;
			flex-direction: column;
			gap: 10px;
			box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
			position: relative;
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
			color: #222222;
			margin: 0;
		}
		.description {
			font-size: 14px;
			line-height: 1.5;
			color: #666666;
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
			background: rgba(142, 148, 142, 0.4);
			color: #111;
		}
		.btn.primary:hover,
		.btn.primary:focus,
		.btn.primary:active {
			background: rgba(142, 148, 142, 0.55);
		}
		.btn.secondary {
			background: transparent;
			color: #222;
		}
		.btn.secondary:hover,
		.btn.secondary:focus,
		.btn.secondary:active {
			background: #dddddd;
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
			background: transparent;
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
			background: #dddddd;
		}

		.modal.closing {
			animation: fadeOut 0.2s ease-in-out forwards;
		}

		@keyframes fadeIn {
			from {
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
				opacity: 0;
			}
		}
	`;

	@property()
	walletName: string = '';
	@property()
	dappName: string = '';
	@property()
	disabled: boolean = false;

	@state()
	private _closing = false;

	#handleCancel() {
		if (this._closing) {
			return;
		}
		this._closing = true;
	}

	#handleContinue() {
		this.dispatchEvent(new CustomEvent('approved'));
	}

	#handleAnimationEnd() {
		if (this._closing) {
			this.dispatchEvent(new CustomEvent('canceled'));
		}
	}

	override render() {
		return html`
			<div class="modal${this._closing ? ' closing' : ''}" role="dialog" aria-label="${this.walletName} Operation Request" @animationend=${this.#handleAnimationEnd}>
				<div class="backdrop"></div>
				<div class="content">
					<button class="close" @click=${this.#handleCancel} ?disabled=${this._closing || this.disabled}>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
					</button>
					<h1 class="title capitalize">${this.walletName} Operation Request</h1>
					<p class="description">
						<span class="capitalize bold">${this.dappName}</span> requested a wallet operation. Click continue to open <span class="wallet-name bold">${this.walletName}</span> (in a new tab) and review the request.
					</p>
					<div class="footer">
						<button class="btn secondary" @click=${this.#handleCancel} ?disabled=${this._closing || this.disabled}>Cancel</button>
						<button class="btn primary" @click=${this.#handleContinue} ?disabled=${this._closing || this.disabled}>Continue</button>
					</div>
				</div>
			</dialog>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'enoki-connect-modal': EnokiConnectModal;
	}
}
