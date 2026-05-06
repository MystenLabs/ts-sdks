// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { createComponent } from '@lit/react';
import type { ReactWebComponent } from '@lit/react';
import { DAppKitConnectModal as ConnectModalElement } from '@mysten/dapp-kit-core/web';
import { useDAppKit } from '../hooks/useDAppKit.js';
import type { ComponentProps, JSX } from 'react';

export type ConnectModalProps = ComponentProps<typeof ConnectModalComponent>;

const ConnectModalComponent: ReactWebComponent<ConnectModalElement> = createComponent({
	react: React,
	tagName: 'mysten-dapp-kit-connect-modal',
	elementClass: ConnectModalElement,
});

export function ConnectModal({ instance, ...props }: ConnectModalProps): JSX.Element {
	const dAppKit = useDAppKit(instance);
	return <ConnectModalComponent {...props} instance={dAppKit} />;
}
