// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

interface ErrorDisplayProps {
	error: string;
	onClear: () => void;
}

export function ErrorDisplay({ error, onClear }: ErrorDisplayProps) {
	if (!error) return null;

	return (
		<div
			style={{
				marginBottom: '20px',
				padding: '12px',
				backgroundColor: '#f8d7da',
				color: '#721c24',
				border: '1px solid #f5c6cb',
				borderRadius: '4px',
			}}
		>
			<strong>Error:</strong> {error}
			<button
				type="button"
				onClick={onClear}
				style={{
					float: 'right',
					background: 'none',
					border: 'none',
					fontSize: '16px',
					cursor: 'pointer',
					color: '#721c24',
				}}
			>
				×
			</button>
		</div>
	);
}
