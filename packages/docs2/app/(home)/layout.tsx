// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { HomeLayout } from 'fumadocs-ui/layouts/home';

import { baseOptions } from '@/app/layout.config';

export default function Layout({ children }: { children: React.ReactNode }) {
	return <HomeLayout {...baseOptions}>{children}</HomeLayout>;
}
