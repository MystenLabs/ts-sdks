// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { LitElement } from 'lit';
import { property, query } from 'lit/decorators.js';

export class BaseModal extends LitElement {
	#isOpen = false;
	#isOpening = false;

	#resolveIsConnectedPromise = () => {};
	#isConnectedPromise = this.#getIsConnectedPromise();

	#returnValue: string | undefined;
	#nextClickIsFromContent = false;

	static override shadowRootOptions = {
		...LitElement.shadowRootOptions,
		delegatesFocus: true,
	};

	/**
	 * Opens the dialog when set to `true` and closes it when set to `false`.
	 */
	@property({ type: Boolean })
	get open() {
		return this.#isOpen;
	}

	set open(open: boolean) {
		if (open === this.#isOpen) {
			return;
		}

		this.#isOpen = open;
		if (this.#isOpen) {
			this.setAttribute('open', '');
			this.show();
		} else {
			this.removeAttribute('open');
			this.close();
		}
	}

	@query('dialog')
	private readonly _dialog!: HTMLDialogElement;

	/**
	 * Opens the dialog and fires a cancelable `open` event. An `opened` event
	 * is fired after the dialog opens.
	 *
	 * @return A `Promise` that resolves after the `opened` event was fired.
	 */
	async show() {
		this.#isOpening = true;

		// Dialogs can be opened before being attached to the DOM, so we need to
		// wait until we're connected before calling `showModal()`.
		await this.#isConnectedPromise;
		await this.updateComplete;

		// Check if already opened or if `dialog.close()` was called while awaiting.
		if (this._dialog.open || !this.#isOpening) {
			this.#isOpening = false;
			return;
		}

		const wasDispatched = this.dispatchEvent(new Event('open', { cancelable: true }));
		if (!wasDispatched) {
			this.open = false;
			this.#isOpening = false;
			return;
		}

		this._dialog.showModal();
		this.open = true;

		this.dispatchEvent(new Event('opened'));
		this.#isOpening = false;
	}

	/**
	 * Closes the dialog and fires a cancelable `close` event. After a dialog's
	 * animation, a `closed` event is fired.
	 *
	 * @param returnValue A return value usually indicating which button was used
	 *     to close a dialog. If a dialog is canceled by clicking the backdrop or
	 *     pressing Escape, it will not change the return value after closing.
	 * @return A Promise that resolves after the `closed` event was fired.
	 */
	async close(returnValue = this.#returnValue) {
		this.#isOpening = false;

		if (!this.isConnected) {
			// Disconnected dialogs do not fire close events or animate.
			this.open = false;
			return;
		}

		await this.updateComplete;

		// Check if already closed or if `dialog.show()` was called while awaiting.
		if (!this._dialog.open || this.#isOpening) {
			this.open = false;
			return;
		}

		const prevReturnValue = this.#returnValue;
		this.#returnValue = returnValue;

		const wasDispatched = this.dispatchEvent(new Event('close', { cancelable: true }));
		if (!wasDispatched) {
			this.#returnValue = prevReturnValue;
			return;
		}

		this._dialog.close(this.#returnValue);
		this.open = false;
		this.dispatchEvent(new Event('closed'));
	}

	override connectedCallback() {
		super.connectedCallback();
		this.#resolveIsConnectedPromise();
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		this.#isConnectedPromise = this.#getIsConnectedPromise();
	}

	protected handleContentClick() {
		this.#nextClickIsFromContent = true;
	}

	protected handleDialogClick() {
		if (this.#nextClickIsFromContent) {
			// When someone clicks the dialog backdrop, the click event
			this.#nextClickIsFromContent = false;
			return;
		}

		const wasDispatched = this.dispatchEvent(new Event('cancel', { cancelable: true }));
		if (!wasDispatched) return;

		this.close();
	}

	#getIsConnectedPromise() {
		return new Promise<void>((resolve) => {
			this.#resolveIsConnectedPromise = resolve;
		});
	}
}
