// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { copyToClipboard } from './utils.js';

export class CopyController implements ReactiveController {
	host: ReactiveControllerHost;
	copied = false;
	copiedValue: string | null = null;
	#timeout: ReturnType<typeof setTimeout> | null = null;
	#duration: number;

	constructor(host: ReactiveControllerHost, duration = 1500) {
		this.#duration = duration;
		this.host = host;
		host.addController(this);
	}

	hostConnected(): void {}

	hostDisconnected(): void {
		if (this.#timeout) {
			clearTimeout(this.#timeout);
			this.#timeout = null;
		}
	}

	async copy(text: string): Promise<boolean> {
		const ok = await copyToClipboard(text);
		if (ok) {
			this.copied = true;
			this.copiedValue = text;
			if (this.#timeout) clearTimeout(this.#timeout);
			this.#timeout = setTimeout(() => {
				this.copied = false;
				this.copiedValue = null;
				this.host.requestUpdate();
			}, this.#duration);
			this.host.requestUpdate();
		}
		return ok;
	}

	isCopied(text: string): boolean {
		return this.copied && this.copiedValue === text;
	}
}
