// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

interface ConfirmDialogProps {
	isOpen: boolean;
	title: string;
	message: string;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export function ConfirmDialog({
	isOpen,
	title,
	message,
	confirmLabel = 'Confirm',
	cancelLabel = 'Cancel',
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	if (!isOpen) return null;

	return (
		<div
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: 'rgba(0, 0, 0, 0.5)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 10001, // Higher than signing modal
				backdropFilter: 'blur(4px)',
			}}
		>
			<div
				style={{
					backgroundColor: '#fff',
					borderRadius: '12px',
					padding: '24px',
					maxWidth: '400px',
					width: '90%',
					boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
				}}
			>
				<h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: '600', color: '#333' }}>
					{title}
				</h3>

				<p style={{ margin: '0 0 24px', fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
					{message}
				</p>

				<div
					style={{
						display: 'flex',
						gap: '12px',
						justifyContent: 'flex-end',
					}}
				>
					<button
						onClick={onCancel}
						style={{
							padding: '10px 20px',
							backgroundColor: '#f5f5f5',
							border: '1px solid #ddd',
							borderRadius: '6px',
							fontSize: '14px',
							fontWeight: '500',
							cursor: 'pointer',
							color: '#333',
							transition: 'all 0.2s ease',
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.backgroundColor = '#e0e0e0';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor = '#f5f5f5';
						}}
					>
						{cancelLabel}
					</button>
					<button
						onClick={onConfirm}
						style={{
							padding: '10px 20px',
							backgroundColor: '#f44336',
							border: 'none',
							borderRadius: '6px',
							fontSize: '14px',
							fontWeight: '500',
							cursor: 'pointer',
							color: 'white',
							transition: 'all 0.2s ease',
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.backgroundColor = '#d32f2f';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor = '#f44336';
						}}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
