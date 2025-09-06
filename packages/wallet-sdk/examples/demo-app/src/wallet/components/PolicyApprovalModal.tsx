// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import type { AutoApprovalPolicyData } from '@mysten/wallet-sdk';
import { formatPolicyForDisplay } from '../../utils/policyHelpers.js';

interface PolicyApprovalModalProps {
	isOpen: boolean;
	policy: AutoApprovalPolicyData;
	onApprove: () => void;
	onReject: () => void;
}

export function PolicyApprovalModal({
	isOpen,
	policy,
	onApprove,
	onReject,
}: PolicyApprovalModalProps) {
	const [isApproving, setIsApproving] = useState(false);

	if (!isOpen) return null;

	const formatInfo = formatPolicyForDisplay(policy.policy);

	const handleApprove = async () => {
		console.log('🟢 PolicyApprovalModal: handleApprove called');
		setIsApproving(true);
		try {
			onApprove();
		} finally {
			setIsApproving(false);
		}
	};

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
				zIndex: 1000,
			}}
		>
			<div
				style={{
					backgroundColor: 'white',
					borderRadius: '12px',
					padding: '32px',
					maxWidth: '500px',
					width: '90%',
					maxHeight: '80vh',
					overflow: 'auto',
					boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
				}}
			>
				{/* Header */}
				<div style={{ marginBottom: '24px' }}>
					<h2
						style={{
							margin: 0,
							fontSize: '20px',
							fontWeight: '600',
							color: '#333',
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
						}}
					>
						🔒 Auto-Approval Policy Request
					</h2>
					<p style={{ margin: '8px 0 0', color: '#666', fontSize: '14px' }}>
						This application is requesting permission to auto-approve transactions within these
						limits.
					</p>
				</div>

				{/* Policy Details */}
				<div
					style={{
						backgroundColor: '#f8f9fa',
						borderRadius: '8px',
						padding: '20px',
						marginBottom: '24px',
					}}
				>
					<h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600' }}>
						{policy.policy.name}
					</h3>
					<p style={{ margin: '0 0 16px', color: '#666', fontSize: '14px' }}>
						{policy.policy.description}
					</p>

					<div style={{ display: 'grid', gap: '12px' }}>
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span style={{ fontWeight: '500', color: '#333' }}>Budget:</span>
							<span style={{ color: '#666' }}>{formatInfo.maxSuiFormatted}</span>
						</div>
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span style={{ fontWeight: '500', color: '#333' }}>Max per transaction:</span>
							<span style={{ color: '#666' }}>{formatInfo.maxTransactionValueFormatted}</span>
						</div>
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span style={{ fontWeight: '500', color: '#333' }}>Max transactions:</span>
							<span style={{ color: '#666' }}>{policy.policy.budget.maxTransactions}</span>
						</div>
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span style={{ fontWeight: '500', color: '#333' }}>Valid for:</span>
							<span style={{ color: '#666' }}>{formatInfo.timeWindowFormatted}</span>
						</div>
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span style={{ fontWeight: '500', color: '#333' }}>Expires:</span>
							<span style={{ color: '#666', fontSize: '12px' }}>
								{formatInfo.expiresAtFormatted}
							</span>
						</div>
					</div>

					{/* Allowed Transaction Types */}
					<div style={{ marginTop: '16px' }}>
						<span
							style={{ fontWeight: '500', color: '#333', display: 'block', marginBottom: '8px' }}
						>
							Allowed transaction types:
						</span>
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
							{policy.policy.constraints.allowedTransactionTypes.map((type) => (
								<span
									key={type}
									style={{
										backgroundColor: '#e3f2fd',
										color: '#1976d2',
										padding: '4px 8px',
										borderRadius: '4px',
										fontSize: '12px',
										fontWeight: '500',
									}}
								>
									{type.replace('_', ' ')}
								</span>
							))}
						</div>
					</div>
				</div>

				{/* Origin Info */}
				<div
					style={{
						backgroundColor: '#fff3e0',
						border: '1px solid #ffcc02',
						borderRadius: '8px',
						padding: '12px',
						marginBottom: '24px',
					}}
				>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
						<span style={{ fontSize: '16px' }}>⚠️</span>
						<span style={{ fontWeight: '600', fontSize: '14px' }}>Requesting Application</span>
					</div>
					<p style={{ margin: 0, fontSize: '14px', color: '#666', fontFamily: 'monospace' }}>
						{policy.origin}
					</p>
				</div>

				{/* Actions */}
				<div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
					<button
						onClick={() => {
							console.log('🔴 PolicyApprovalModal: Reject button clicked, calling onReject');
							onReject();
						}}
						disabled={isApproving}
						style={{
							backgroundColor: '#f5f5f5',
							color: '#666',
							border: '1px solid #ddd',
							borderRadius: '8px',
							padding: '12px 24px',
							cursor: isApproving ? 'not-allowed' : 'pointer',
							fontSize: '14px',
							fontWeight: '500',
							opacity: isApproving ? 0.5 : 1,
						}}
					>
						Reject
					</button>
					<button
						onClick={handleApprove}
						disabled={isApproving}
						style={{
							backgroundColor: isApproving ? '#90caf9' : '#2196F3',
							color: 'white',
							border: 'none',
							borderRadius: '8px',
							padding: '12px 24px',
							cursor: isApproving ? 'not-allowed' : 'pointer',
							fontSize: '14px',
							fontWeight: '500',
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
						}}
					>
						{isApproving ? (
							<>
								<div
									style={{
										width: '16px',
										height: '16px',
										border: '2px solid rgba(255, 255, 255, 0.3)',
										borderTopColor: 'white',
										borderRadius: '50%',
										animation: 'spin 1s linear infinite',
									}}
								/>
								Approving...
							</>
						) : (
							'Approve Policy'
						)}
					</button>
				</div>
			</div>

			{/* Add spinner animation */}
			<style>
				{`
					@keyframes spin {
						to {
							transform: rotate(360deg);
						}
					}
				`}
			</style>
		</div>
	);
}
