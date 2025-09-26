// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { formatAddress } from '@mysten/sui/utils';
import { useState } from 'react';
import { LabelWithValue } from '../../../../app/components/ui/LabelWithValue.js';

const REGEX_NUMBER = /^\d+$/;

interface TransactionInputsProps {
	inputs: any[];
}

export function TransactionInputs({ inputs }: TransactionInputsProps) {
	if (inputs.length === 0) {
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
						d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
					/>
				</svg>
				<p className="mt-2 text-sm">No inputs for this transaction</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{inputs.map((input, index) => (
				<ExpandableSection key={`input-${index}`} title={`Input ${index + 1}`} inputData={input}>
					<TransactionInput input={input} />
				</ExpandableSection>
			))}
		</div>
	);
}

interface ExpandableSectionProps {
	title: string;
	children: React.ReactNode;
	inputData?: any;
}

function ExpandableSection({ title, children, inputData }: ExpandableSectionProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	// Get a preview of the input type
	const inputType = inputData?.type || 'Unknown';
	const inputPreview = inputData?.objectId
		? `Object: ${inputData.objectId.slice(0, 8)}...`
		: inputData?.value
			? `Value: ${String(inputData.value).slice(0, 20)}...`
			: inputType;

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
							<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
								{inputType}
							</span>
						</div>
						{!isExpanded && (
							<div className="mt-1 text-xs text-gray-500 truncate">{inputPreview}</div>
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

interface TransactionInputProps {
	input: any;
}

function TransactionInput({ input }: TransactionInputProps) {
	return (
		<div className="space-y-2 mt-2">
			{Object.entries(input).map(([key, value]) => {
				let displayValue: React.ReactNode;

				if (key === 'mutable') {
					displayValue = (
						<span
							className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
								value ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
							}`}
						>
							{value ? 'Mutable' : 'Immutable'}
						</span>
					);
				} else if (key === 'objectId') {
					displayValue = <AddressLink address={String(value)} />;
				} else if (input.type === 'pure' && key === 'value') {
					// Handle different value types properly
					if (value && typeof value === 'object') {
						// If it's an object (like UnresolvedObject), stringify it properly
						displayValue = (
							<pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
								{JSON.stringify(value, null, 2)}
							</pre>
						);
					} else {
						const stringValue = String(value);
						// Try to format as address if it looks like one
						if (stringValue.startsWith('0x') && stringValue.length >= 40) {
							displayValue = <AddressLink address={stringValue} />;
						} else {
							displayValue = (
								<span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
									{stringValue}
								</span>
							);
						}
					}
				} else if (value && typeof value === 'object') {
					// Handle objects by stringifying them properly
					displayValue = (
						<pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
							{JSON.stringify(value, null, 2)}
						</pre>
					);
				} else if (REGEX_NUMBER.test(String(value))) {
					try {
						const bigNumber = BigInt(String(value));
						displayValue = (
							<span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
								{bigNumber.toString()}
							</span>
						);
					} catch {
						displayValue = (
							<span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
								{String(value)}
							</span>
						);
					}
				} else {
					displayValue = (
						<span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{String(value)}</span>
					);
				}

				return <LabelWithValue key={key} label={key} value={displayValue} />;
			})}
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
