// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect } from 'react';
import type { Transaction } from '@mysten/sui/transactions';
import type { ReadonlyWalletAccount } from '@mysten/wallet-standard';
import type { CoinFlows as CoinFlowsType } from '@mysten/wallet-sdk';
import { TransactionDetails } from './transaction/TransactionDetails.js';

interface SigningModalProps {
	isOpen: boolean;
	account: ReadonlyWalletAccount;
	requestType: 'personalMessage' | 'transaction' | 'signAndExecute';
	transaction: Transaction | null;
	onApprove: () => void;
	onReject: () => void;
	coinFlows?: CoinFlowsType;
	autoApprove?: {
		enabled: boolean;
		reason?: string;
		countdownSeconds?: number;
		policyInfo?: {
			remainingBudget: string;
			totalBudget: string;
			remainingTransactions: number;
			totalTransactions: number;
		};
	};
	onRemovePolicy?: () => void;
	onCancelCountdown?: () => void;
	policyRenewal?: {
		available: boolean;
		originalPolicy: any;
		reason: string;
	};
	onRenewPolicy?: () => void;
}

export function SigningModal({
	isOpen,
	account,
	requestType,
	transaction,
	onApprove,
	onReject,
	coinFlows,
	autoApprove,
	onRemovePolicy,
	onCancelCountdown,
	policyRenewal,
	onRenewPolicy,
}: SigningModalProps) {
	const [showRawData, setShowRawData] = useState(false);
	const [autoApprovalCancelled, setAutoApprovalCancelled] = useState(false);

	// Use countdown from parent (useApprovalFlow hook) instead of managing our own
	const countdown = autoApprove?.countdownSeconds;

	// Reset state when modal opens
	useEffect(() => {
		if (isOpen) {
			setAutoApprovalCancelled(false);
		}
	}, [isOpen]);

	if (!isOpen) return null;

	const getTitle = () => {
		switch (requestType) {
			case 'personalMessage':
				return 'Sign Message';
			case 'transaction':
				return 'Sign Transaction';
			case 'signAndExecute':
				return 'Sign & Execute Transaction';
			default:
				return 'Signature Request';
		}
	};

	const getDescription = () => {
		switch (requestType) {
			case 'personalMessage':
				return 'An application is requesting to sign a message with your account.';
			case 'transaction':
				return 'An application is requesting to sign a transaction. This will not submit it to the network.';
			case 'signAndExecute':
				return 'An application is requesting to sign and submit a transaction to the network.';
			default:
				return 'An application is requesting your signature.';
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
				zIndex: 10000,
				backdropFilter: 'blur(4px)',
			}}
		>
			<div
				style={{
					backgroundColor: '#fff',
					borderRadius: '12px',
					padding: '24px',
					maxWidth: '700px',
					width: '90%',
					maxHeight: '85vh',
					display: 'flex',
					flexDirection: 'column',
					boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
					overflow: 'hidden',
				}}
			>
				<h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '600', color: '#333' }}>
					{getTitle()}
				</h3>

				<p style={{ margin: '0 0 20px', fontSize: '14px', color: '#666' }}>{getDescription()}</p>

				<div
					style={{
						backgroundColor: '#f5f5f5',
						borderRadius: '8px',
						padding: '12px',
						marginBottom: '20px',
					}}
				>
					<div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Account</div>
					<div
						style={{
							fontSize: '13px',
							fontFamily: 'monospace',
							color: '#333',
							wordBreak: 'break-all',
						}}
					>
						{account.address}
					</div>
				</div>

				{/* Show policy rejection reason when auto-approval is disabled but a policy exists */}
				{!autoApprove?.enabled &&
					autoApprove?.reason &&
					(() => {
						// Check if this is a renewable policy failure
						const isRenewable =
							policyRenewal?.available ||
							autoApprove.reason?.includes('budget') ||
							autoApprove.reason?.includes('limit') ||
							autoApprove.reason?.includes('Transaction cost');

						if (isRenewable) {
							// Blue box for renewable issues with both options
							return (
								<div
									style={{
										backgroundColor: '#e3f2fd',
										border: '1px solid #64b5f6',
										borderRadius: '8px',
										padding: '12px',
										marginBottom: '20px',
									}}
								>
									<div
										style={{
											fontSize: '12px',
											color: '#0277bd',
											fontWeight: '600',
											marginBottom: '8px',
										}}
									>
										💰 Policy Budget Exhausted
									</div>
									<div style={{ fontSize: '13px', color: '#0277bd', marginBottom: '12px' }}>
										{autoApprove.reason}
									</div>
									<div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
										{onRenewPolicy && (
											<button
												onClick={onRenewPolicy}
												style={{
													padding: '6px 12px',
													backgroundColor: '#2196f3',
													border: 'none',
													borderRadius: '4px',
													fontSize: '12px',
													fontWeight: '500',
													cursor: 'pointer',
													color: 'white',
													transition: 'all 0.2s ease',
												}}
												onMouseEnter={(e) => {
													e.currentTarget.style.backgroundColor = '#1976d2';
												}}
												onMouseLeave={(e) => {
													e.currentTarget.style.backgroundColor = '#2196f3';
												}}
											>
												🔄 Renew Policy
											</button>
										)}
										{onRemovePolicy && (
											<button
												onClick={onRemovePolicy}
												style={{
													padding: '6px 12px',
													backgroundColor: '#f44336',
													border: 'none',
													borderRadius: '4px',
													fontSize: '12px',
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
												🗑️ Remove Policy
											</button>
										)}
									</div>
								</div>
							);
						} else {
							// Orange/red box for non-renewable issues
							return (
								<div
									style={{
										backgroundColor: '#fff3e0',
										border: '1px solid #ffb74d',
										borderRadius: '8px',
										padding: '12px',
										marginBottom: '20px',
									}}
								>
									<div
										style={{
											fontSize: '12px',
											color: '#e65100',
											fontWeight: '600',
											marginBottom: '8px',
										}}
									>
										⚠️ Policy Not Applied
									</div>
									<div style={{ fontSize: '13px', color: '#e65100', marginBottom: '8px' }}>
										{autoApprove.reason}
									</div>
									{onRemovePolicy && (
										<button
											onClick={onRemovePolicy}
											style={{
												padding: '6px 12px',
												backgroundColor: '#f44336',
												border: 'none',
												borderRadius: '4px',
												fontSize: '12px',
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
											🗑️ Remove Policy
										</button>
									)}
								</div>
							);
						}
					})()}

				{/* Transaction details section - only show for transaction types */}
				{requestType !== 'personalMessage' && transaction && (
					<div
						style={{
							backgroundColor: '#f5f5f5',
							borderRadius: '8px',
							padding: '12px',
							marginBottom: '20px',
							flex: 1,
							minHeight: 0,
							display: 'flex',
							flexDirection: 'column',
						}}
					>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: '12px',
								flexShrink: 0,
							}}
						>
							<div style={{ fontSize: '12px', color: '#666' }}>Transaction Details</div>
							<button
								onClick={() => setShowRawData(!showRawData)}
								style={{
									fontSize: '11px',
									color: '#1976d2',
									background: 'none',
									border: 'none',
									cursor: 'pointer',
									padding: '2px 6px',
									borderRadius: '4px',
								}}
							>
								{showRawData ? 'Hide' : 'Show'} Raw Data
							</button>
						</div>
						<div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
							{showRawData ? (
								<pre
									style={{
										fontSize: '11px',
										color: '#333',
										fontFamily: 'monospace',
										overflow: 'auto',
										margin: 0,
										backgroundColor: '#fff',
										padding: '8px',
										borderRadius: '4px',
										height: '100%',
										minHeight: '200px',
									}}
								>
									{JSON.stringify(transaction, null, 2)}
								</pre>
							) : (
								<TransactionDetails transaction={transaction} coinFlows={coinFlows} />
							)}
						</div>
					</div>
				)}

				{/* Action buttons area - either countdown or normal buttons */}
				{autoApprove?.enabled && countdown !== null && !autoApprovalCancelled ? (
					/* Auto-approval countdown section */
					<div
						style={{
							backgroundColor: '#e8f5e8',
							border: '1px solid #4caf50',
							borderRadius: '8px',
							padding: '16px',
							textAlign: 'center',
						}}
					>
						<div style={{ marginBottom: '12px' }}>
							<div
								style={{
									fontSize: '16px',
									fontWeight: '600',
									color: '#2e7d32',
									marginBottom: '4px',
								}}
							>
								🤖 Auto-Approving Transaction
							</div>
							<div style={{ fontSize: '14px', color: '#1b5e20' }}>
								{autoApprove.reason || 'Transaction approved by policy'}
							</div>
							{autoApprove.policyInfo && (
								<div style={{ fontSize: '12px', color: '#2e7d32', marginTop: '8px' }}>
									Remaining Budget: {autoApprove.policyInfo.remainingBudget} SUI (
									{autoApprove.policyInfo.remainingTransactions} transactions left)
								</div>
							)}
						</div>
						<div
							style={{
								fontSize: '24px',
								fontWeight: 'bold',
								color: '#1b5e20',
								marginBottom: '12px',
							}}
						>
							{countdown}
						</div>
						<button
							onClick={() => {
								setAutoApprovalCancelled(true);
								onCancelCountdown?.();
							}}
							style={{
								padding: '8px 16px',
								backgroundColor: '#ff5722',
								border: 'none',
								borderRadius: '6px',
								fontSize: '14px',
								fontWeight: '500',
								cursor: 'pointer',
								color: 'white',
								transition: 'all 0.2s ease',
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.backgroundColor = '#e64a19';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.backgroundColor = '#ff5722';
							}}
						>
							Cancel Auto-Approval
						</button>
					</div>
				) : (
					/* Normal action buttons */
					<div>
						{/* Show policy removal option if auto-approval was cancelled */}
						{autoApprove?.enabled && autoApprovalCancelled && onRemovePolicy && (
							<div
								style={{
									backgroundColor: '#fff3e0',
									border: '1px solid #ffb74d',
									borderRadius: '8px',
									padding: '12px',
									marginBottom: '12px',
									textAlign: 'center',
								}}
							>
								<div style={{ fontSize: '14px', color: '#e65100', marginBottom: '8px' }}>
									Auto-approval cancelled. You can also remove this policy entirely.
								</div>
								<button
									onClick={onRemovePolicy}
									style={{
										padding: '6px 12px',
										backgroundColor: '#f44336',
										border: 'none',
										borderRadius: '4px',
										fontSize: '12px',
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
									🗑️ Remove Policy
								</button>
							</div>
						)}

						<div
							style={{
								display: 'flex',
								gap: '12px',
								justifyContent: 'flex-end',
							}}
						>
							<button
								onClick={() => {
									console.log('🔴 SigningModal: Reject button clicked, calling onReject');
									onReject();
								}}
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
								Reject
							</button>
							<button
								onClick={onApprove}
								style={{
									padding: '10px 20px',
									backgroundColor: '#1976d2',
									border: 'none',
									borderRadius: '6px',
									fontSize: '14px',
									fontWeight: '500',
									cursor: 'pointer',
									color: 'white',
									transition: 'all 0.2s ease',
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = '#1565c0';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = '#1976d2';
								}}
							>
								{requestType === 'signAndExecute' ? 'Sign & Execute' : 'Sign'}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
