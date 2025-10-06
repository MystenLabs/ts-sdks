// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'primary' | 'secondary' | 'danger';
	size?: 'sm' | 'md' | 'lg';
	children: React.ReactNode;
}

const variants = {
	primary: 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white border-none',
	secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300',
	danger: 'bg-red-500 hover:bg-red-600 text-white border-none',
};

const sizes = {
	sm: 'px-3 py-1.5 text-sm',
	md: 'px-5 py-2.5',
	lg: 'px-6 py-3 text-lg',
};

export function Button({
	variant = 'primary',
	size = 'md',
	className = '',
	children,
	disabled,
	...props
}: ButtonProps) {
	const variantClasses = variants[variant];
	const sizeClasses = sizes[size];
	const disabledClasses = disabled ? 'disabled:cursor-not-allowed' : 'cursor-pointer';

	const classes =
		`${variantClasses} ${sizeClasses} ${disabledClasses} rounded font-medium transition-colors duration-200 ${className}`.trim();

	return (
		<button className={classes} disabled={disabled} {...props}>
			{children}
		</button>
	);
}
