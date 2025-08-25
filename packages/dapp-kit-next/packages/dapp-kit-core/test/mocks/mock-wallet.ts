// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
	IdentifierArray,
	ReadonlyWalletAccount,
	StandardEventsChangeProperties,
	StandardEventsOnMethod,
	Wallet,
	WalletWithRequiredFeatures,
	IdentifierRecord,
} from '@mysten/wallet-standard';
import { SUI_CHAINS } from '@mysten/wallet-standard';
import type { Mock } from 'vitest';
import { vi } from 'vitest';
import { createMockAccount } from './mock-account.js';

export type MockWalletOptions = {
	id?: string | null | undefined;
	name: string;
	accounts?: ReadonlyWalletAccount[];
	skippedFeatures?: IdentifierArray;
	addedFeatures?: IdentifierArray;
	chains?: IdentifierArray;
};

export class MockWallet implements Wallet {
	version = '1.0.0' as const;
	icon = `data:image/png;base64,` as const;

	mocks: {
		connect: Mock;
		disconnect: Mock;
		signTransaction: Mock;
		signTransactionBlock: Mock;
	};

	#walletName: string;
	#chains: IdentifierArray;
	#accounts: ReadonlyWalletAccount[];
	#skippedFeatures: IdentifierArray;
	#addedFeatures: IdentifierRecord<any>;
	#eventHandlers: {
		event: string;
		listener: (properties: StandardEventsChangeProperties) => void;
	}[];

	#on = vi.fn((...args: Parameters<StandardEventsOnMethod>) => {
		this.#eventHandlers.push({ event: args[0], listener: args[1] });
		return () => {
			this.#eventHandlers = [];
		};
	});

	readonly id?: string;

	constructor(options: MockWalletOptions) {
		const {
			id = crypto.randomUUID(),
			name,
			chains = SUI_CHAINS,
			accounts = [createMockAccount()],
			skippedFeatures = [],
			addedFeatures = {},
		} = options;

		if (id) {
			this.id = id;
		}

		this.#walletName = name;
		this.#accounts = accounts;
		this.#chains = chains;
		this.#skippedFeatures = skippedFeatures;
		this.#addedFeatures = addedFeatures;
		this.#eventHandlers = [];
		this.mocks = {
			connect: vi.fn().mockImplementation(() => ({ accounts: this.#accounts })),
			disconnect: vi.fn(),
			signTransaction: vi.fn(),
			signTransactionBlock: vi.fn(),
		};
	}

	get name() {
		return this.#walletName;
	}

	get accounts() {
		return this.#accounts;
	}

	get chains() {
		return this.#chains;
	}

	get features(): WalletWithRequiredFeatures['features'] {
		const fs = {
			'standard:connect': {
				version: '1.0.0',
				connect: this.mocks.connect,
			},
			'standard:disconnect': {
				version: '1.0.0',
				disconnect: this.mocks.disconnect,
			},
			'standard:events': {
				version: '1.0.0',
				on: this.#on,
			},
			'sui:signTransaction': {
				version: '2.0.0',
				signTransaction: this.mocks.signTransaction,
			},
			'sui:signTransactionBlock': {
				version: '1.0.0',
				signTransactionBlock: this.mocks.signTransactionBlock,
			},
			...this.#addedFeatures,
		};

		this.#skippedFeatures.forEach((skippedFeature) => {
			delete fs[skippedFeature as keyof typeof fs];
		});

		return fs as WalletWithRequiredFeatures['features'];
	}

	deleteFirstAccount() {
		this.#accounts.splice(0, 1);
		this.#eventHandlers.forEach(({ listener }) => {
			listener({ accounts: this.#accounts });
		});
	}
}

export function createMockWallets(...mockWalletOptions: MockWalletOptions[]): MockWallet[] {
	return mockWalletOptions.map((options) => new MockWallet(options));
}
