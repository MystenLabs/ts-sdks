// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCopy } from '../hooks/useCopy.js';

interface CopyableTextProps {
	text: string;
	className?: string;
	truncate?: boolean;
	maxLength?: number;
}

export function CopyableText({
	text,
	className = '',
	truncate = false,
	maxLength = 50,
}: CopyableTextProps) {
	const { copy, copied } = useCopy();

	const displayText = truncate && text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

	return (
		<div className={`group relative ${className}`}>
			<div className="flex items-center gap-2">
				<span className="font-mono text-xs break-all flex-1">{displayText}</span>
				<button
					onClick={() => copy(text)}
					className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
					title="Copy to clipboard"
				>
					{copied ? (
						<svg
							className="w-3 h-3 text-green-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
					) : (
						<svg
							className="w-3 h-3 text-gray-600"
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
					)}
				</button>
			</div>
		</div>
	);
}
