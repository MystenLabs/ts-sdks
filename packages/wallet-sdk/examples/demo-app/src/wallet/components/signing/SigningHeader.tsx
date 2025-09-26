// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

interface SigningHeaderProps {
	requestType: 'personalMessage' | 'transaction' | 'signAndExecute';
}

export function SigningHeader({ requestType }: SigningHeaderProps) {
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

	const getIcon = () => {
		switch (requestType) {
			case 'personalMessage':
				return (
					<svg
						className="h-6 w-6 text-indigo-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
						/>
					</svg>
				);
			case 'transaction':
				return (
					<svg
						className="h-6 w-6 text-indigo-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
				);
			case 'signAndExecute':
				return (
					<svg
						className="h-6 w-6 text-indigo-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M13 10V3L4 14h7v7l9-11h-7z"
						/>
					</svg>
				);
			default:
				return (
					<svg
						className="h-6 w-6 text-indigo-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
						/>
					</svg>
				);
		}
	};

	return (
		<div className="flex items-center space-x-3">
			<div className="flex-shrink-0">{getIcon()}</div>
			<div>
				<h2 className="text-xl font-semibold text-gray-900">{getTitle()}</h2>
			</div>
		</div>
	);
}
