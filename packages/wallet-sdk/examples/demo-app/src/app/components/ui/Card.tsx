// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

interface CardProps {
	children: React.ReactNode;
	className?: string;
	variant?: 'default' | 'elevated' | 'bordered' | 'highlighted';
}

const variants = {
	default: 'bg-white border border-gray-200 rounded-lg',
	elevated: 'bg-white rounded-lg shadow-lg',
	bordered: 'bg-white border border-gray-300 rounded-lg',
	highlighted: 'bg-green-50 border border-green-200 rounded-lg',
};

export function Card({ children, className = '', variant = 'default' }: CardProps) {
	const cardClasses = `${variants[variant]} ${className}`.trim();

	return <div className={cardClasses}>{children}</div>;
}

export function CardHeader({
	children,
	className = '',
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return <div className={`p-4 border-b border-gray-200 ${className}`.trim()}>{children}</div>;
}

export function CardContent({
	children,
	className = '',
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return <div className={`p-4 ${className}`.trim()}>{children}</div>;
}
