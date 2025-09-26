// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

interface AlertProps {
	type: 'error' | 'success' | 'warning' | 'info';
	message?: string;
	children?: React.ReactNode;
	onClose?: () => void;
}

const alertVariants = {
	error: {
		container: 'bg-red-50 border-red-200 text-red-800',
		icon: '⚠️',
	},
	success: {
		container: 'bg-green-50 border-green-200 text-green-800',
		icon: '✅',
	},
	warning: {
		container: 'bg-orange-50 border-orange-200 text-orange-800',
		icon: '⚠️',
	},
	info: {
		container: 'bg-blue-50 border-blue-200 text-blue-800',
		icon: 'ℹ️',
	},
};

export function Alert({ type, message, children, onClose }: AlertProps) {
	const variant = alertVariants[type];

	return (
		<div className={`border rounded-md p-3 mb-4 flex items-center gap-2 ${variant.container}`}>
			<span className="text-base">{variant.icon}</span>
			<div className="flex-1 text-sm">
				{message && <div>{message}</div>}
				{children && <div>{children}</div>}
			</div>
			{onClose && (
				<button
					onClick={onClose}
					className="bg-transparent border-none cursor-pointer p-1 text-base hover:opacity-70 transition-opacity"
					aria-label="Dismiss"
				>
					×
				</button>
			)}
		</div>
	);
}
