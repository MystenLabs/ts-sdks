// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { AutoApprovalAnalysis } from '@mysten/wallet-sdk';
import { toBase64 } from '@mysten/bcs';
import { useState } from 'react';
import { CopyableText } from '../../../../components/CopyableText.js';
import type { AutoApprovalState } from '../../../hooks/useAutoApproval.js';

interface DebugTabProps {
	analysis: AutoApprovalAnalysis;
	autoApprovalState?: AutoApprovalState;
}

export function DebugTab({ analysis, autoApprovalState }: DebugTabProps) {
	const { results, issues } = analysis;
	const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['issues']));

	const toggleSection = (section: string) => {
		const newExpanded = new Set(expandedSections);
		if (newExpanded.has(section)) {
			newExpanded.delete(section);
		} else {
			newExpanded.add(section);
		}
		setExpandedSections(newExpanded);
	};

	return (
		<div className="space-y-4">
			{/* Analysis Issues */}
			{issues.length > 0 && (
				<div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
					<button
						onClick={() => toggleSection('issues')}
						className="w-full px-4 py-3 text-left hover:bg-red-100 transition-colors"
					>
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold text-red-900">
								Analysis Issues ({issues.length})
							</h3>
							<svg
								className={`w-4 h-4 text-red-600 transform transition-transform ${
									expandedSections.has('issues') ? 'rotate-90' : ''
								}`}
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</div>
					</button>
					{expandedSections.has('issues') && (
						<div className="px-4 pb-3">
							<ul className="space-y-1">
								{issues.map((issue, index) => (
									<li key={index} className="text-xs text-red-700">
										• {issue.message}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}

			{/* Transaction Digest & Bytes */}
			<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
				<h3 className="text-sm font-semibold text-gray-900 mb-3">Transaction Metadata</h3>
				<div className="space-y-3">
					<div>
						<div className="text-xs text-gray-600 mb-1">Digest:</div>
						<CopyableText text={results.digest} className="text-gray-800" />
					</div>
					<div>
						<div className="text-xs text-gray-600 mb-1">Bytes (Base64):</div>
						<CopyableText
							text={toBase64(results.bytes)}
							className="text-gray-800"
							truncate
							maxLength={60}
						/>
					</div>
					<div>
						<span className="text-xs text-gray-600">Size: </span>
						<span className="text-xs text-gray-800">{results.bytes.length} bytes</span>
					</div>
				</div>
			</div>

			{/* Dry Run Results */}
			{results.dryRun && (
				<div className="border border-gray-200 rounded-lg overflow-hidden">
					<button
						onClick={() => toggleSection('dryRun')}
						className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors bg-white"
					>
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold text-gray-900">Dry Run Results</h3>
							<svg
								className={`w-4 h-4 text-gray-600 transform transition-transform ${
									expandedSections.has('dryRun') ? 'rotate-90' : ''
								}`}
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</div>
					</button>
					{expandedSections.has('dryRun') && (
						<div className="px-4 pb-3 bg-gray-50">
							<div className="text-xs space-y-2">
								{results.dryRun.transaction && (
									<div>
										<div className="font-medium text-gray-700 mb-1">Effects</div>
										<div className="bg-white rounded p-2 border border-gray-200">
											<div>
												Status:{' '}
												{results.dryRun.transaction.effects?.status.success ? 'Success' : 'Failed'}
											</div>
											{results.dryRun.transaction.effects?.gasUsed && (
												<div>
													Gas Used: {results.dryRun.transaction.effects.gasUsed.computationCost}{' '}
													(compute) + {results.dryRun.transaction.effects.gasUsed.storageCost}{' '}
													(storage)
												</div>
											)}
											{results.dryRun.transaction.effects?.changedObjects && (
												<div>
													Changed Objects:{' '}
													{results.dryRun.transaction.effects.changedObjects.length}
												</div>
											)}
										</div>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			)}

			{/* Manager State */}
			{autoApprovalState?.manager && (
				<div className="border border-gray-200 rounded-lg overflow-hidden">
					<button
						onClick={() => toggleSection('managerState')}
						className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors bg-white"
					>
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold text-gray-900">Manager State</h3>
							<svg
								className={`w-4 h-4 text-gray-600 transform transition-transform ${
									expandedSections.has('managerState') ? 'rotate-90' : ''
								}`}
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</div>
					</button>
					{expandedSections.has('managerState') && (
						<div className="px-4 pb-3 bg-gray-50">
							<pre className="text-xs text-gray-700 overflow-auto max-h-96">
								{JSON.stringify(
									autoApprovalState.manager.getState(),
									(_key, value) => {
										if (value instanceof Uint8Array) {
											return toBase64(value);
										}
										if (value instanceof Map) {
											return Object.fromEntries(value);
										}
										return typeof value === 'bigint' ? value.toString() : value;
									},
									2,
								)}
							</pre>
						</div>
					)}
				</div>
			)}

			{/* Raw Transaction Data */}
			<div className="border border-gray-200 rounded-lg overflow-hidden">
				<button
					onClick={() => toggleSection('rawData')}
					className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors bg-white"
				>
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-semibold text-gray-900">Raw Transaction Data</h3>
						<svg
							className={`w-4 h-4 text-gray-600 transform transition-transform ${
								expandedSections.has('rawData') ? 'rotate-90' : ''
							}`}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
						</svg>
					</div>
				</button>
				{expandedSections.has('rawData') && (
					<div className="px-4 pb-3 bg-gray-50">
						<pre className="text-xs text-gray-700 overflow-auto max-h-96">
							{JSON.stringify(
								results.data,
								(_key, value) => {
									if (value instanceof Uint8Array) {
										return toBase64(value);
									}
									return typeof value === 'bigint' ? value.toString() : value;
								},
								2,
							)}
						</pre>
					</div>
				)}
			</div>

			{/* Full Analysis Data */}
			<div className="border border-gray-200 rounded-lg overflow-hidden">
				<button
					onClick={() => toggleSection('fullAnalysis')}
					className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors bg-white"
				>
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-semibold text-gray-900">Full Analysis Data</h3>
						<svg
							className={`w-4 h-4 text-gray-600 transform transition-transform ${
								expandedSections.has('fullAnalysis') ? 'rotate-90' : ''
							}`}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
						</svg>
					</div>
				</button>
				{expandedSections.has('fullAnalysis') && (
					<div className="px-4 pb-3 bg-gray-50">
						<pre className="text-xs text-gray-700 overflow-auto max-h-96">
							{JSON.stringify(
								analysis,
								(_key, value) => {
									if (value instanceof Uint8Array) {
										return toBase64(value);
									}
									if (value instanceof Map) {
										return Object.fromEntries(value);
									}
									return typeof value === 'bigint' ? value.toString() : value;
								},
								2,
							)}
						</pre>
					</div>
				)}
			</div>
		</div>
	);
}
