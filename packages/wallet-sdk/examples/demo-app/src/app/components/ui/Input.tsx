// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
	prefix?: string;
	suffix?: string;
	variant?: 'default' | 'compact';
}

const variants = {
	default:
		'w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
	compact:
		'w-full px-2.5 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
};

export function Input({
	label,
	error,
	prefix,
	suffix,
	variant = 'default',
	className = '',
	...props
}: InputProps) {
	const inputClasses =
		`${variants[variant]} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${className}`.trim();

	const inputElement = (
		<div className="relative flex items-center">
			{prefix && (
				<span className="absolute left-2 text-gray-500 font-medium text-sm z-10">{prefix}</span>
			)}
			<input
				className={`${inputClasses} ${prefix ? 'pl-6' : ''} ${suffix ? 'pr-12' : ''}`}
				{...props}
			/>
			{suffix && (
				<span className="absolute right-3 text-gray-500 text-xs font-medium pointer-events-none whitespace-nowrap">
					{suffix}
				</span>
			)}
		</div>
	);

	if (label) {
		return (
			<div className="flex flex-col gap-1.5">
				<label className="font-semibold text-gray-700 text-sm">{label}</label>
				{inputElement}
				{error && <span className="text-red-500 text-sm">{error}</span>}
			</div>
		);
	}

	return (
		<div>
			{inputElement}
			{error && <span className="text-red-500 text-sm mt-1 block">{error}</span>}
		</div>
	);
}
