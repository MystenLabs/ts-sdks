// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), react()],
});
