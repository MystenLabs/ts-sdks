// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

interface DemoLayoutProps {
	children: React.ReactNode;
	maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const maxWidthClasses = {
	sm: 'max-w-2xl',
	md: 'max-w-4xl',
	lg: 'max-w-6xl',
	xl: 'max-w-7xl',
};

export function DemoLayout({ children, maxWidth = 'md' }: DemoLayoutProps) {
	return <div className={`${maxWidthClasses[maxWidth]} mx-auto space-y-6`}>{children}</div>;
}
