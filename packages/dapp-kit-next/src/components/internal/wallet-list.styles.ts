// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit';
import { resetStyles } from './styles/shared.js';

export const styles = [
	resetStyles,
	css`
		ul {
			display: flex;
			flex-direction: column;
			gap: 16px;
		}
	`,
];
