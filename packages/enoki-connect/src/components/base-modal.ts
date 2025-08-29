// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { LitElement, PropertyValues } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { promiseWithResolvers, type PromiseWithResolvers } from '@mysten/utils';

export class BaseModal extends LitElement {
	#isOpen = false;
	#isOpening = false;
	#isConnected = promiseWithResolvers<void>();
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
	@property()
	disabled: boolean = false;

	@query('dialog')
	private readonly _dialog!: HTMLDialogElement;

	@state()
	protected _closingResolvers?: PromiseWithResolvers<void>;

	#keyDownHandler = (e: KeyboardEvent) => {
		if (e.key === 'Escape' && this.open) {
			this.handleCancel(e);
		}
	};

	protected get _isClosing() {
		return !!this._closingResolvers;
	}

	override firstUpdated(changedProperties: PropertyValues) {
		super.firstUpdated(changedProperties);
		// NOTE: there is a bug in Chrome where even after canceling the dialog cancel event still closes the dialog. (The second time the user clicks escape)
		// Using this handler to mitigate this issue.
		this._dialog.addEventListener('keydown', this.#keyDownHandler, { capture: true });
	}

	/**
	 * Opens the dialog and fires a cancelable `open` event. An `opened` event
	 * is fired after the dialog opens.
	 *
	 * @return A `Promise` that resolves after the `opened` event was fired.
	 */
	async show() {
		this._closingResolvers?.resolve();
		this._closingResolvers = undefined;
		this.#isOpening = true;

		// Dialogs can be opened before being attached to the DOM, so we need to
		// wait until we're connected before calling `showModal()`.
		await this.#isConnected.promise;
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
	 */
	async close() {
		if (this._closingResolvers) {
			return;
		}

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

		const wasDispatched = this.dispatchEvent(new Event('close', { cancelable: true }));
		if (!wasDispatched) {
			return;
		}

		this._closingResolvers = promiseWithResolvers<void>();
		this.open = false;

		return this._closingResolvers.promise;
	}

	protected handleAnimationEnd(e: AnimationEvent) {
		if (
			e.animationName === 'fadeOut' &&
			!this.open &&
			this._dialog.open &&
			this._closingResolvers
		) {
			this._closingResolvers.resolve();
			this._closingResolvers = undefined;
			this._dialog.close();
			this.dispatchEvent(new Event('closed'));
		}
	}

	override connectedCallback() {
		super.connectedCallback();
		this.#isConnected.resolve();
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		this.#isConnected = Promise.withResolvers<void>();
		this._dialog.removeEventListener('keydown', this.#keyDownHandler, { capture: true });
	}

	protected handleContentClick() {
		this.#nextClickIsFromContent = true;
	}

	protected handleDialogClick() {
		if (this.#nextClickIsFromContent) {
			// This trick uses event bubbling to determine whether or not the click originated
			// from the dialog content or dialog backdrop psuedo-element. If you click the dialog
			// content, then `nextClickIsFromContent` will be set to true and we'll early exit.
			this.#nextClickIsFromContent = false;
			return;
		}

		this.handleCancel();
	}

	protected handleCancel(e?: Event) {
		if (this.disabled || this._closingResolvers) {
			e?.preventDefault();
			e?.stopPropagation();

			return;
		}

		const wasDispatched = this.dispatchEvent(new Event('cancel', { cancelable: true }));

		if (!wasDispatched) {
			e?.preventDefault();
			e?.stopPropagation();

			return;
		}

		this.close();
	}
}
