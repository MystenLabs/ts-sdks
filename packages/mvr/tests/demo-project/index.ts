// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';

const _demoFunction = () => {
	const transaction = new Transaction();

	transaction.moveCall({
		target: '@mvr/app/2::demo::test',
		typeArguments: [
			'@mvr/app::type::Type',
			`@mvr/app::type::Type2`,
			// eslint-disable-next-line prettier/prettier
			"@mvr/app::type::Type<@kiosk/core::kiosk::Kiosk, bool>",
			// eslint-disable-next-line prettier/prettier
            "app.sui/app::t::T"
		],
	});

	transaction.makeMoveVec({
		type: '@mvr/type::wow::Wow',
		elements: [],
	});
};
