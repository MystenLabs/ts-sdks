// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { formatAddress } from '@mysten/sui/utils';
import { useState } from 'react';

interface TransactionCommandsProps {
	commands: any[];
}

export function TransactionCommands({ commands }: TransactionCommandsProps) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
			{commands.map((command, index) => {
				// Handle different command structures
				let type: string;
				let data: any;

				if (command && typeof command === 'object') {
					if (command.$kind) {
						// Sui Transaction format: { $kind: 'MoveCall', MoveCall: {...} }
						type = command.$kind;
						data = command[type] || command;
					} else {
						// Enoki format: { MoveCall: {...} }
						const entries = Object.entries(command);
						if (entries.length === 1) {
							[type, data] = entries[0] as [string, any];
						} else {
							// Fallback - treat the whole object as data and try to infer type
							type = 'Unknown';
							data = command;
						}
					}
				} else {
					type = 'Unknown';
					data = command;
				}

				if (type === 'Publish') {
					return null;
				}

				return (
					<ExpandableSection key={index} title={`${index}: ${type}`}>
						<TransactionCommand type={type} data={data} />
					</ExpandableSection>
				);
			})}
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

interface TransactionCommandProps {
	type: string;
	data: any;
}

function TransactionCommand({ type, data }: TransactionCommandProps) {
	if (type === 'MoveCall') {
		return <MoveCallCommand data={data} />;
	}

	if (Array.isArray(data)) {
		return <ArrayCommand data={data} />;
	}

	return <div>{JSON.stringify(data, null, 2)}</div>;
}

interface MoveCallCommandProps {
	data: {
		package?: string;
		module?: string;
		function?: string;
		arguments?: any[];
		typeArguments?: string[];
		type_arguments?: string[];
		MoveCall?: {
			package: string;
			module: string;
			function: string;
			arguments?: any[];
			typeArguments?: string[];
		};
	};
}

function MoveCallCommand({ data }: MoveCallCommandProps) {
	// Handle both direct data and wrapped data structures
	const moveCallData = data.MoveCall || data;
	const {
		module,
		package: movePackage,
		function: func,
		arguments: args,
		typeArguments: typeArgs,
	} = moveCallData;

	return (
		<div style={{ fontFamily: 'monospace' }}>
			<div>
				<strong>Package:</strong> <AddressLink address={movePackage || ''} />
			</div>
			<div>
				<strong>Module:</strong> {module}
			</div>
			<div>
				<strong>Function:</strong> {func}
			</div>
			{args && args.length > 0 && (
				<div>
					<strong>Arguments:</strong> [{flattenArguments(args)}]
				</div>
			)}
			{typeArgs && typeArgs.length > 0 && (
				<div>
					<strong>Type Arguments:</strong> [{typeArgs.join(', ')}]
				</div>
			)}
		</div>
	);
}

interface ArrayCommandProps {
	data: any[];
}

function ArrayCommand({ data }: ArrayCommandProps) {
	return <div style={{ fontFamily: 'monospace' }}>[{flattenArguments(data)}]</div>;
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

function flattenArguments(data: any[]): string {
	if (!data) {
		return '';
	}

	return data
		.map((value) => {
			if (value === 'GasCoin') {
				return value;
			}
			if (Array.isArray(value)) {
				return `[${flattenArguments(value)}]`;
			}
			if (value === null || value === undefined) {
				return 'null';
			}
			if (typeof value === 'object') {
				if ('Input' in value) {
					return `Input(${value.Input})`;
				}
				if ('Result' in value) {
					return `Result(${value.Result})`;
				}
				if ('NestedResult' in value) {
					return `NestedResult(${value.NestedResult[0]}, ${value.NestedResult[1]})`;
				}
				if ('$kind' in value && value.$kind === 'Input') {
					return `Input(${value.index})`;
				}
				if ('$kind' in value && value.$kind === 'Result') {
					return `Result(${value.index})`;
				}
				if ('$kind' in value && value.$kind === 'NestedResult') {
					return `NestedResult(${value.index}, ${value.resultIndex})`;
				}
			}
			if (typeof value === 'string') {
				return value;
			}
			if (typeof value === 'number' || typeof value === 'bigint') {
				return value.toString();
			}
			return JSON.stringify(value);
		})
		.join(', ');
}
