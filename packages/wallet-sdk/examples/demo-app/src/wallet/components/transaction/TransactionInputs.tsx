// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { formatAddress } from '@mysten/sui/utils';
import { useState } from 'react';

const REGEX_NUMBER = /^\d+$/;

interface TransactionInputsProps {
	inputs: any[];
}

export function TransactionInputs({ inputs }: TransactionInputsProps) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
			{inputs.map((input, index) => (
				<ExpandableSection key={`input-${index}`} title={`Input ${index}`}>
					<TransactionInput input={input} />
				</ExpandableSection>
			))}
		</div>
	);
}

interface ExpandableSectionProps {
	title: string;
	children: React.ReactNode;
}

function ExpandableSection({ title, children }: ExpandableSectionProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<div style={{ border: '1px solid #e0e0e0', borderRadius: '6px', overflow: 'hidden' }}>
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				style={{
					width: '100%',
					padding: '12px',
					backgroundColor: '#f8f9fa',
					border: 'none',
					textAlign: 'left',
					fontSize: '13px',
					fontWeight: '500',
					cursor: 'pointer',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
				}}
			>
				{title}
				<span style={{ fontSize: '12px' }}>{isExpanded ? '−' : '+'}</span>
			</button>
			{isExpanded && (
				<div style={{ padding: '12px', backgroundColor: '#fff', fontSize: '12px' }}>{children}</div>
			)}
		</div>
	);
}

interface TransactionInputProps {
	input: any;
}

function TransactionInput({ input }: TransactionInputProps) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
			{Object.entries(input).map(([key, value]) => {
				let displayValue: React.ReactNode;

				if (key === 'mutable') {
					displayValue = String(value);
				} else if (key === 'objectId') {
					displayValue = <AddressLink address={String(value)} />;
				} else if (input.type === 'pure' && key === 'value') {
					// Handle different value types properly
					if (value && typeof value === 'object') {
						// If it's an object (like UnresolvedObject), stringify it properly
						displayValue = JSON.stringify(value, null, 2);
					} else {
						const stringValue = String(value);
						// Try to format as address if it looks like one
						if (stringValue.startsWith('0x') && stringValue.length >= 40) {
							displayValue = <AddressLink address={stringValue} />;
						} else {
							displayValue = stringValue;
						}
					}
				} else if (value && typeof value === 'object') {
					// Handle objects by stringifying them properly
					displayValue = (
						<pre
							style={{
								fontSize: '10px',
								margin: 0,
								backgroundColor: '#f8f9fa',
								padding: '4px',
								borderRadius: '2px',
								whiteSpace: 'pre-wrap',
								wordBreak: 'break-word',
							}}
						>
							{JSON.stringify(value, null, 2)}
						</pre>
					);
				} else if (REGEX_NUMBER.test(String(value))) {
					try {
						const bigNumber = BigInt(String(value));
						displayValue = bigNumber.toString();
					} catch {
						displayValue = String(value);
					}
				} else {
					displayValue = String(value);
				}

				return <LabelWithValue key={key} label={key} value={displayValue} />;
			})}
		</div>
	);
}

interface LabelWithValueProps {
	label: string;
	value: React.ReactNode;
}

function LabelWithValue({ label, value }: LabelWithValueProps) {
	// Check if the value is a complex object (contains a <pre> tag for JSON)
	const isComplexObject =
		typeof value === 'object' && value !== null && 'type' in value && value.type === 'pre';

	return (
		<div
			style={{
				display: 'flex',
				justifyContent: isComplexObject ? 'flex-start' : 'space-between',
				alignItems: 'flex-start',
				flexDirection: isComplexObject ? 'column' : 'row',
			}}
		>
			<span
				style={{
					fontWeight: '500',
					color: '#666',
					minWidth: '80px',
					marginBottom: isComplexObject ? '4px' : '0',
				}}
			>
				{label}:
			</span>
			<span
				style={{
					fontFamily: 'monospace',
					wordBreak: 'break-all',
					textAlign: isComplexObject ? 'left' : 'right',
					flex: 1,
					marginLeft: isComplexObject ? '0' : '8px',
				}}
			>
				{value}
			</span>
		</div>
	);
}

interface AddressLinkProps {
	address: string;
}

function AddressLink({ address }: AddressLinkProps) {
	return (
		<span
			style={{
				color: '#1976d2',
				textDecoration: 'underline',
				cursor: 'pointer',
			}}
			title={address}
		>
			{formatAddress(address)}
		</span>
	);
}
