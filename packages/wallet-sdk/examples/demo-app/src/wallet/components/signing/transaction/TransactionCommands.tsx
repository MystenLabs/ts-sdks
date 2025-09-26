// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { formatAddress } from '@mysten/sui/utils';
import { useState } from 'react';
import { LabelWithValue } from '../../../../app/components/ui/LabelWithValue.js';

interface TransactionCommandsProps {
	commands: any[];
}

export function TransactionCommands({ commands }: TransactionCommandsProps) {
	if (commands.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500">
				<svg
					className="mx-auto h-12 w-12 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2"
						d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
					/>
				</svg>
				<p className="mt-2 text-sm">No commands for this transaction</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
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
					<ExpandableSection
						key={index}
						title={`Command ${index + 1}`}
						commandData={{ type, data }}
					>
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
	commandData?: { type: string; data: any };
}

function ExpandableSection({ title, children, commandData }: ExpandableSectionProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	// Get a preview of the command type
	const commandType = commandData?.type || 'Unknown';
	const commandPreview =
		commandData?.type === 'MoveCall'
			? `${commandData.data?.module}::${commandData.data?.function}`
			: commandType;

	return (
		<div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors"
			>
				<div className="flex items-center justify-between">
					<div className="flex-1">
						<div className="flex items-center space-x-3">
							<span className="text-sm font-medium text-gray-900">{title}</span>
							<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
								{commandType}
							</span>
						</div>
						{!isExpanded && (
							<div className="mt-1 text-xs text-gray-500 truncate">{commandPreview}</div>
						)}
					</div>
					<svg
						className={`${isExpanded ? 'rotate-90' : ''} h-5 w-5 text-gray-400 transform transition-transform duration-200`}
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
					</svg>
				</div>
			</button>
			{isExpanded && (
				<div className="px-4 pb-3 border-t border-gray-100 bg-gray-50">{children}</div>
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

	return (
		<div className="mt-2">
			<pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
				{JSON.stringify(data, null, 2)}
			</pre>
		</div>
	);
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
		<div className="space-y-3 mt-2">
			<LabelWithValue label="Package" value={<AddressLink address={movePackage || ''} />} />
			<LabelWithValue
				label="Module"
				value={<span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{module}</span>}
			/>
			<LabelWithValue
				label="Function"
				value={
					<span className="font-mono text-sm bg-blue-100 px-2 py-1 rounded text-blue-800">
						{func}
					</span>
				}
			/>
			{args && args.length > 0 && (
				<LabelWithValue
					label="Arguments"
					value={
						<pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
							[{flattenArguments(args)}]
						</pre>
					}
				/>
			)}
			{typeArgs && typeArgs.length > 0 && (
				<LabelWithValue
					label="Type Arguments"
					value={
						<div className="flex flex-wrap gap-1">
							{typeArgs.map((arg, index) => (
								<span
									key={index}
									className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800"
								>
									{arg}
								</span>
							))}
						</div>
					}
				/>
			)}
		</div>
	);
}

interface ArrayCommandProps {
	data: any[];
}

function ArrayCommand({ data }: ArrayCommandProps) {
	return (
		<div className="mt-2">
			<pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
				[{flattenArguments(data)}]
			</pre>
		</div>
	);
}

interface AddressLinkProps {
	address: string;
}

function AddressLink({ address }: AddressLinkProps) {
	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(address);
		} catch (err) {
			// Fallback for browsers that don't support clipboard API
		}
	};

	return (
		<button
			onClick={handleCopy}
			className="group inline-flex items-center space-x-2 text-sm font-mono bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded transition-colors cursor-pointer"
			title={`Click to copy: ${address}`}
		>
			<span>{formatAddress(address)}</span>
			<svg
				className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
				/>
			</svg>
		</button>
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
