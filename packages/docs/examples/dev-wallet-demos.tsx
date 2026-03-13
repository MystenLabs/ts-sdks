// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

'use client';

import { DevWallet } from '@mysten/dev-wallet';
import { InMemorySignerAdapter } from '@mysten/dev-wallet/adapters';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Shared styles ───────────────────────────────────────────────────────────

const buttonStyle: React.CSSProperties = {
	padding: '8px 16px',
	borderRadius: 8,
	border: '1px solid #3a3a5e',
	background: '#1a1a2e',
	color: '#e0e0f0',
	fontSize: 13,
	fontWeight: 500,
	cursor: 'pointer',
};

const primaryButtonStyle: React.CSSProperties = {
	...buttonStyle,
	background: '#4f46e5',
	border: '1px solid #6366f1',
	color: '#fff',
};

const listStyle: React.CSSProperties = {
	listStyle: 'none',
	margin: 0,
	padding: 0,
	display: 'flex',
	flexDirection: 'column',
	gap: 8,
};

const cardStyle: React.CSSProperties = {
	padding: '10px 14px',
	borderRadius: 8,
	background: '#1a1a2e',
	border: '1px solid #2a2a3e',
	fontSize: 13,
	color: '#e0e0f0',
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'center',
};

const monoStyle: React.CSSProperties = {
	fontFamily: 'ui-monospace, SFMono-Regular, monospace',
	fontSize: 12,
	color: '#a0a0b8',
};

const resultBoxStyle: React.CSSProperties = {
	padding: '12px 16px',
	borderRadius: 8,
	background: '#111120',
	border: '1px solid #2a2a3e',
	fontFamily: 'ui-monospace, SFMono-Regular, monospace',
	fontSize: 12,
	color: '#a0a0b8',
	wordBreak: 'break-all' as const,
	whiteSpace: 'pre-wrap' as const,
};

const demoBoxStyle: React.CSSProperties = {
	padding: 20,
	background: '#0d0d14',
	borderRadius: 12,
	border: '1px solid #2a2a3e',
};

const infoStyle: React.CSSProperties = {
	padding: '16px 20px',
	fontSize: 13,
	color: '#a0a0b8',
	display: 'flex',
	alignItems: 'center',
	gap: 8,
	justifyContent: 'center',
};

// ─── InMemoryAdapterDemo ─────────────────────────────────────────────────────

interface AccountEntry {
	address: string;
	label: string;
}

export function InMemoryAdapterDemo() {
	const [accounts, setAccounts] = useState<AccountEntry[]>([]);
	const adapterRef = useRef<InMemorySignerAdapter | null>(null);

	useEffect(() => {
		const adapter = new InMemorySignerAdapter();
		adapterRef.current = adapter;

		async function init() {
			await adapter.initialize();
			updateAccounts();
		}

		function updateAccounts() {
			setAccounts(adapter.getAccounts().map((a) => ({ address: a.address, label: a.label })));
		}

		const unsub = adapter.onAccountsChanged(() => updateAccounts());
		init();

		return () => {
			unsub();
			adapter.destroy();
		};
	}, []);

	const handleCreate = useCallback(async () => {
		const adapter = adapterRef.current;
		if (!adapter?.createAccount) return;
		const count = adapter.getAccounts().length;
		await adapter.createAccount({ label: `Account ${count + 1}` });
	}, []);

	const handleRemove = useCallback(async (address: string) => {
		const adapter = adapterRef.current;
		if (!adapter?.removeAccount) return;
		await adapter.removeAccount(address);
	}, []);

	return (
		<div style={demoBoxStyle}>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: 16,
				}}
			>
				<span style={{ fontSize: 14, fontWeight: 600, color: '#e0e0f0' }}>
					Accounts ({accounts.length})
				</span>
				<button onClick={handleCreate} style={primaryButtonStyle}>
					Create Account
				</button>
			</div>
			{accounts.length === 0 ? (
				<div style={{ ...infoStyle, padding: 32 }}>
					No accounts yet. Click &quot;Create Account&quot; to add one.
				</div>
			) : (
				<ul style={listStyle}>
					{accounts.map((acc) => (
						<li key={acc.address} style={cardStyle}>
							<div>
								<div style={{ fontWeight: 500 }}>{acc.label}</div>
								<div style={monoStyle}>
									{acc.address.slice(0, 10)}...{acc.address.slice(-8)}
								</div>
							</div>
							<button
								onClick={() => handleRemove(acc.address)}
								style={{ ...buttonStyle, fontSize: 12, padding: '4px 10px', color: '#f87171' }}
							>
								Remove
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

// ─── SigningFlowDemo ─────────────────────────────────────────────────────────

export function SigningFlowDemo() {
	const walletRef = useRef<DevWallet | null>(null);
	const adapterRef = useRef<InMemorySignerAdapter | null>(null);
	const [ready, setReady] = useState(false);
	const [status, setStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>('idle');
	const [result, setResult] = useState<string>('');
	const [pendingInfo, setPendingInfo] = useState<string>('');

	useEffect(() => {
		const adapter = new InMemorySignerAdapter();
		adapterRef.current = adapter;

		async function init() {
			await adapter.initialize();
			await adapter.createAccount({ label: 'Signing Demo' });
			const w = new DevWallet({
				adapters: [adapter],
				autoApprove: false,
				autoConnect: true,
			});
			walletRef.current = w;
			setReady(true);
		}

		init();

		return () => {
			walletRef.current?.destroy();
			adapter.destroy();
		};
	}, []);

	const requestSign = useCallback(async () => {
		const wallet = walletRef.current;
		if (!wallet) return;
		setStatus('pending');
		setResult('');
		setPendingInfo('');

		const account = wallet.accounts[0];
		if (!account) return;

		// Show pending request info
		const unsub = wallet.onRequestChange((req) => {
			if (req) {
				setPendingInfo(`Request ${req.id.slice(0, 8)}... | Type: ${req.type}`);
			}
		});

		try {
			const res = await wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('Hello from Dev Wallet docs!'),
				account,
			});
			setStatus('approved');
			setResult(`Signature: ${res.signature.slice(0, 48)}...`);
		} catch (err) {
			setStatus('rejected');
			setResult(err instanceof Error ? err.message : 'Unknown error');
		} finally {
			unsub();
		}
	}, []);

	const handleApprove = useCallback(async () => {
		try {
			await walletRef.current?.approveRequest();
		} catch {
			// No pending request
		}
	}, []);

	const handleReject = useCallback(() => {
		try {
			walletRef.current?.rejectRequest('User declined');
		} catch {
			// No pending request
		}
	}, []);

	return (
		<div style={demoBoxStyle}>
			<div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
				<button
					onClick={requestSign}
					disabled={!ready || status === 'pending'}
					style={{
						...primaryButtonStyle,
						opacity: !ready || status === 'pending' ? 0.5 : 1,
					}}
				>
					{status === 'pending' ? 'Pending...' : 'Sign a Message'}
				</button>
				{status === 'pending' && (
					<>
						<button
							onClick={handleApprove}
							style={{
								...buttonStyle,
								background: '#166534',
								border: '1px solid #22c55e',
								color: '#4ade80',
							}}
						>
							Approve
						</button>
						<button
							onClick={handleReject}
							style={{
								...buttonStyle,
								background: '#7f1d1d',
								border: '1px solid #f87171',
								color: '#fca5a5',
							}}
						>
							Reject
						</button>
					</>
				)}
			</div>
			{pendingInfo && status === 'pending' && (
				<div
					style={{
						...resultBoxStyle,
						marginBottom: 12,
						color: '#fbbf24',
						border: '1px solid #854d0e',
						background: '#1a1508',
					}}
				>
					Pending: {pendingInfo}
				</div>
			)}
			{status !== 'idle' && status !== 'pending' && (
				<div
					style={{
						display: 'flex',
						gap: 8,
						alignItems: 'center',
						marginBottom: result ? 12 : 0,
						fontSize: 13,
						fontWeight: 500,
						color: status === 'approved' ? '#22c55e' : '#f87171',
					}}
				>
					{status === 'approved' ? 'Approved' : 'Rejected'}
				</div>
			)}
			{result && <div style={resultBoxStyle}>{result}</div>}
		</div>
	);
}

// ─── AutoApprovalDemo ────────────────────────────────────────────────────────

export function AutoApprovalDemo() {
	const [autoMode, setAutoMode] = useState(false);
	const [signing, setSigning] = useState(false);
	const [lastResult, setLastResult] = useState<{
		mode: string;
		time: number;
		status: string;
	} | null>(null);

	const walletRef = useRef<DevWallet | null>(null);
	const adapterRef = useRef<InMemorySignerAdapter | null>(null);

	useEffect(() => {
		const adapter = new InMemorySignerAdapter();
		adapterRef.current = adapter;

		async function init() {
			await adapter.initialize();
			await adapter.createAccount({ label: 'Auto-Approval Demo' });
			recreateWallet(false);
		}

		init();

		return () => {
			walletRef.current?.destroy();
			adapter.destroy();
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	function recreateWallet(auto: boolean) {
		walletRef.current?.destroy();
		const adapter = adapterRef.current;
		if (!adapter) return;
		const w = new DevWallet({
			adapters: [adapter],
			autoApprove: auto,
			autoConnect: true,
		});
		walletRef.current = w;
	}

	const toggleMode = useCallback(() => {
		setAutoMode((prev) => {
			const next = !prev;
			recreateWallet(next);
			return next;
		});
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const handleSign = useCallback(async () => {
		const wallet = walletRef.current;
		if (!wallet || signing) return;
		setSigning(true);

		const account = wallet.accounts[0];
		if (!account) {
			await wallet.features['standard:connect'].connect();
		}

		const acc = wallet.accounts[0];
		if (!acc) {
			setSigning(false);
			return;
		}

		const start = performance.now();
		const mode = autoMode ? 'Auto' : 'Manual';

		// For manual mode, auto-approve after a short delay to show the timing difference
		let approveTimer: ReturnType<typeof setTimeout> | undefined;
		if (!autoMode) {
			approveTimer = setTimeout(async () => {
				try {
					await wallet.approveRequest();
				} catch {
					// Already approved or no pending
				}
			}, 800);
		}

		try {
			await wallet.features['sui:signPersonalMessage'].signPersonalMessage({
				message: new TextEncoder().encode('Timing test'),
				account: acc,
			});
			const elapsed = Math.round(performance.now() - start);
			setLastResult({ mode, time: elapsed, status: 'Signed' });
		} catch (err) {
			const elapsed = Math.round(performance.now() - start);
			setLastResult({
				mode,
				time: elapsed,
				status: err instanceof Error ? err.message : 'Error',
			});
		} finally {
			clearTimeout(approveTimer);
			setSigning(false);
		}
	}, [autoMode, signing]);

	return (
		<div style={demoBoxStyle}>
			<div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
				<button onClick={toggleMode} style={buttonStyle}>
					{autoMode ? 'Auto-Approval: ON' : 'Auto-Approval: OFF'}
				</button>
				<button
					onClick={handleSign}
					disabled={signing}
					style={{ ...primaryButtonStyle, opacity: signing ? 0.5 : 1 }}
				>
					{signing ? 'Signing...' : 'Sign Message'}
				</button>
			</div>
			<div
				style={{
					display: 'flex',
					gap: 8,
					padding: '10px 14px',
					borderRadius: 8,
					background: autoMode ? '#0a2010' : '#1a1a2e',
					border: `1px solid ${autoMode ? '#166534' : '#2a2a3e'}`,
					fontSize: 13,
					color: autoMode ? '#4ade80' : '#a0a0b8',
					marginBottom: 16,
				}}
			>
				{autoMode
					? 'Requests are signed immediately — no approval modal.'
					: 'Requests queue for approval — simulated 800ms approval delay.'}
			</div>
			{lastResult && (
				<div style={resultBoxStyle}>
					Mode: {lastResult.mode} | Time: {lastResult.time}ms | Status: {lastResult.status}
				</div>
			)}
		</div>
	);
}
