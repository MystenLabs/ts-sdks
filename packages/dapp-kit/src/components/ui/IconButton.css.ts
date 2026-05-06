// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { style } from '@vanilla-extract/css';

import { themeVars } from '../../themes/themeContract.js';

export const container: string = style({
	borderRadius: 9999,
	padding: 8,
	color: themeVars.colors.iconButton,
	backgroundColor: themeVars.backgroundColors.iconButton,
	':hover': {
		backgroundColor: themeVars.backgroundColors.iconButtonHover,
	},
});
