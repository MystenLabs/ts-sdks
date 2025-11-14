// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useStore } from '@nanostores/react';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import type { EnokiFlowConfig } from './EnokiFlow.js';
import { EnokiFlow } from './EnokiFlow.js';

const EnokiFlowContext = createContext<EnokiFlow | null>(null);

/** @deprecated use `registerEnokiWallets` instead */
export type EnokiFlowProviderProps = EnokiFlowConfig & {
	children: ReactNode;
};

/** @deprecated use `registerEnokiWallets` instead */
export function EnokiFlowProvider({ children, ...config }: EnokiFlowProviderProps) {
	const [enokiFlow] = useState(() => new EnokiFlow(config));
	return <EnokiFlowContext.Provider value={enokiFlow}>{children}</EnokiFlowContext.Provider>;
}

/** @deprecated use `registerEnokiWallets` and dapp-kit wallet hooks instead */
export function useEnokiFlow() {
	const context = useContext(EnokiFlowContext);
	if (!context) {
		throw new Error('Missing `EnokiFlowContext` provider');
	}
	return context;
}

/** @deprecated use `registerEnokiWallets` and dapp-kit wallet hooks instead */
export function useZkLogin() {
	const flow = useEnokiFlow();
	return useStore(flow.$zkLoginState);
}

/** @deprecated use `registerEnokiWallets` and dapp-kit wallet hooks instead */
export function useZkLoginSession() {
	const flow = useEnokiFlow();
	return useStore(flow.$zkLoginSession).value;
}

/** @deprecated use `registerEnokiWallets` and dapp-kit wallet hooks instead */
export function useAuthCallback() {
	const flow = useEnokiFlow();
	const [state, setState] = useState<string | null>(null);
	const [handled, setHandled] = useState(false);
	const [hash, setHash] = useState<string | null>(null);

	useEffect(() => {
		const listener = () => setHash(window.location.hash.slice(1).trim());
		listener();

		window.addEventListener('hashchange', listener);
		return () => window.removeEventListener('hashchange', listener);
	}, []);

	useEffect(() => {
		if (!hash) return;

		// oxlint-disable @typescript-eslint/no-floating-promises
		(async () => {
			try {
				setState(await flow.handleAuthCallback(hash));

				window.location.hash = '';
			} finally {
				setHandled(true);
			}
		})();
	}, [hash, flow]);

	return { handled, state };
}
