import type { StorybookConfig } from '@storybook/web-components-vite';

import { dirname } from 'path';
import { fileURLToPath } from 'url';

function getAbsolutePath(value: string): any {
	return dirname(fileURLToPath(import.meta.resolve(value + '/package.json')));
}

const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
	framework: {
		name: getAbsolutePath('@storybook/web-components-vite'),
		options: {},
	},
};
export default config;
