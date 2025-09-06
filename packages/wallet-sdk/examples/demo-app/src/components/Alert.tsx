// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

interface AlertProps {
	type: 'error' | 'success' | 'warning';
	message: string;
	onClose: () => void;
}

const alertStyles = {
	error: {
		background: '#ffebee',
		border: '#ffcdd2',
		color: '#d32f2f',
		icon: '⚠️',
	},
	success: {
		background: '#e8f5e9',
		border: '#a5d6a7',
		color: '#2e7d32',
		icon: '✅',
	},
	warning: {
		background: '#fff3e0',
		border: '#ffcc80',
		color: '#e65100',
		icon: '⚠️',
	},
};

export function Alert({ type, message, onClose }: AlertProps) {
	const style = alertStyles[type];

	return (
		<div
			style={{
				backgroundColor: style.background,
				border: `1px solid ${style.border}`,
				borderRadius: '6px',
				padding: '12px',
				marginBottom: '16px',
				display: 'flex',
				alignItems: 'center',
				gap: '8px',
			}}
		>
			<span style={{ fontSize: '16px' }}>{style.icon}</span>
			<div style={{ flex: 1, fontSize: '13px', color: style.color }}>{message}</div>
			<button
				onClick={onClose}
				style={{
					background: 'none',
					border: 'none',
					cursor: 'pointer',
					color: style.color,
					fontSize: '16px',
					padding: '4px',
				}}
				aria-label="Dismiss"
			>
				×
			</button>
		</div>
	);
}
