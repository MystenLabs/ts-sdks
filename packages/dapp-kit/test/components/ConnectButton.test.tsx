// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConnectButton } from '../../src/components/ConnectButton';
import { createWalletProviderContextWrapper } from '../test-utils';

describe('ConnectButton', () => {
	test('renders iconBefore and iconAfter', () => {
		const wrapper = createWalletProviderContextWrapper();

		render(
			<ConnectButton 
				connectText="Connect Wallet"
				iconBefore={<span data-testid="icon-before">Icon Before</span>}
				iconAfter={<span data-testid="icon-after">Icon After</span>}
			/>,
			{ wrapper }
		);

		// Check button text
		expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();

		// Check iconBefore
		expect(screen.getByTestId('icon-before')).toBeInTheDocument();
		expect(screen.getByTestId('icon-before')).toHaveTextContent('Icon Before');

		// Check iconAfter
		expect(screen.getByTestId('icon-after')).toBeInTheDocument();
		expect(screen.getByTestId('icon-after')).toHaveTextContent('Icon After');
	});

	test('clicking the button opens the connect modal', async () => {
		const wrapper = createWalletProviderContextWrapper();

		render(
			<ConnectButton connectText="Connect Wallet" />,
			{ wrapper }
		);

		const connectButtonEl = screen.getByRole('button', { name: /connect wallet/i });
		expect(connectButtonEl).toBeInTheDocument();

		const user = userEvent.setup();
		await user.click(connectButtonEl);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});
});
