// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BenchmarkSettings } from './BenchmarkSettings.js';

export interface BenchmarkResult {
	id: string;
	settings: BenchmarkSettings;
	iterations: number;
	status: 'running' | 'completed' | 'failed';
	avgEncodeTime: number;
	avgRegisterTime: number;
	avgUploadTime: number;
	avgCertifyTime: number;
	avgTotalTime: number;
	timestamp: number;
}

interface BenchmarkResultsProps {
	results: BenchmarkResult[];
	onRemoveResult: (id: string) => void;
	onClearResults: () => void;
}

export function BenchmarkResults({
	results,
	onRemoveResult,
	onClearResults,
}: BenchmarkResultsProps) {
	const formatDuration = (ms: number): string => {
		if (ms < 1000) return ms.toFixed(2) + ' ms';
		return (ms / 1000).toFixed(2) + ' s';
	};

	const parseSize = (sizeStr: string): number => {
		const str = sizeStr.toUpperCase();
		if (str.endsWith('KB')) {
			return parseFloat(str.slice(0, -2)) * 1024;
		} else if (str.endsWith('MB')) {
			return parseFloat(str.slice(0, -2)) * 1024 * 1024;
		} else if (str.endsWith('B')) {
			return parseFloat(str.slice(0, -1));
		}
		return parseFloat(str);
	};

	// Sort results by upload size (ascending)
	const sortedResults = [...results].sort((a, b) => {
		if (a.settings.useUploadRelay && !b.settings.useUploadRelay) {
			return -1;
		} else if (!a.settings.useUploadRelay && b.settings.useUploadRelay) {
			return 1;
		}
		const sizeA = parseSize(a.settings.size);
		const sizeB = parseSize(b.settings.size);

		return sizeA - sizeB;
	});

	if (results.length === 0) return null;

	return (
		<div>
			<h3>Benchmark Results</h3>
			<div style={{ overflowX: 'auto' }}>
				<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
					<thead>
						<tr style={{ backgroundColor: '#f0f0f0' }}>
							<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
								Iterations
							</th>
							<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
								Size
							</th>
							<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
								Method
							</th>
							<th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
								Status
							</th>
							<th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>
								Encode
							</th>
							<th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>
								Register
							</th>
							<th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>
								Upload
							</th>
							<th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>
								Certify
							</th>
							<th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>
								Total
							</th>
							<th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{sortedResults.map((result) => (
							<tr key={result.id} style={{ borderBottom: '1px solid #eee' }}>
								<td style={{ padding: '10px' }}>{result.iterations}</td>
								<td style={{ padding: '10px' }}>{result.settings.size}</td>
								<td style={{ padding: '10px' }}>
									{result.settings.useUploadRelay ? 'Relay' : 'Direct'}
								</td>
								<td style={{ padding: '10px' }}>
									<span
										style={{
											padding: '2px 6px',
											borderRadius: '3px',
											fontSize: '12px',
											backgroundColor:
												result.status === 'completed'
													? '#d4edda'
													: result.status === 'running'
														? '#fff3cd'
														: '#f8d7da',
											color:
												result.status === 'completed'
													? '#155724'
													: result.status === 'running'
														? '#856404'
														: '#721c24',
										}}
									>
										{result.status === 'completed'
											? 'Completed'
											: result.status === 'running'
												? 'Running'
												: 'Failed'}
									</span>
								</td>
								<td style={{ padding: '10px', textAlign: 'right' }}>
									{formatDuration(result.avgEncodeTime)}
								</td>
								<td style={{ padding: '10px', textAlign: 'right' }}>
									{formatDuration(result.avgRegisterTime)}
								</td>
								<td style={{ padding: '10px', textAlign: 'right' }}>
									{formatDuration(result.avgUploadTime)}
								</td>
								<td style={{ padding: '10px', textAlign: 'right' }}>
									{formatDuration(result.avgCertifyTime)}
								</td>
								<td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
									{formatDuration(result.avgTotalTime)}
								</td>
								<td style={{ padding: '10px', textAlign: 'center' }}>
									<button
										type="button"
										onClick={() => {
											if (confirm('Are you sure you want to remove this benchmark result?')) {
												onRemoveResult(result.id);
											}
										}}
										style={{
											padding: '4px 8px',
											backgroundColor: '#ff4444',
											color: 'white',
											border: 'none',
											borderRadius: '3px',
											cursor: 'pointer',
											fontSize: '12px',
										}}
										title="Remove this result"
									>
										×
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<button
				type="button"
				onClick={() => {
					if (confirm('Are you sure you want to clear all benchmark results?')) {
						onClearResults();
					}
				}}
				style={{
					marginTop: '20px',
					padding: '8px 16px',
					backgroundColor: '#f0f0f0',
					border: '1px solid #ddd',
					borderRadius: '4px',
					cursor: 'pointer',
				}}
			>
				Clear Results
			</button>
		</div>
	);
}
