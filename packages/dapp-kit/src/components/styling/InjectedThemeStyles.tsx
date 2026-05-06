// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { assignInlineVars } from '@vanilla-extract/dynamic';
import type { ReactElement } from 'react';

import { styleDataAttributeSelector } from '../../constants/styleDataAttribute.js';
import { themeVars } from '../../themes/themeContract.js';
import type { DynamicTheme, Theme, ThemeVars } from '../../themes/themeContract.js';

type InjectedThemeStylesProps = {
	theme: Theme;
};

export function InjectedThemeStyles({ theme }: InjectedThemeStylesProps): ReactElement {
	const themeStyles = Array.isArray(theme)
		? getDynamicThemeStyles(theme)
		: getStaticThemeStyles(theme);

	return (
		<style
			precedence="default"
			href="mysten-dapp-kit-theme"
			dangerouslySetInnerHTML={{
				__html: themeStyles,
			}}
		/>
	);
}

function getDynamicThemeStyles(themes: DynamicTheme[]) {
	return themes
		.map(({ mediaQuery, selector, variables }) => {
			const themeStyles = getStaticThemeStyles(variables);
			const themeStylesWithSelectorPrefix = selector ? `${selector} ${themeStyles}` : themeStyles;

			return mediaQuery
				? `@media ${mediaQuery}{${themeStylesWithSelectorPrefix}}`
				: themeStylesWithSelectorPrefix;
		})
		.join(' ');
}

function getStaticThemeStyles(theme: ThemeVars) {
	return `${styleDataAttributeSelector} {${cssStringFromTheme(theme)}}`;
}

function cssStringFromTheme(theme: ThemeVars) {
	return Object.entries(assignInlineVars(themeVars, theme))
		.map(([key, value]) => `${key}:${value};`)
		.join('');
}
