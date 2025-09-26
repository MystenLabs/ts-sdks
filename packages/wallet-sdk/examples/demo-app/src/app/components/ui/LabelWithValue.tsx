// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

interface LabelWithValueProps {
	label: string;
	value: React.ReactNode;
}

export function LabelWithValue({ label, value }: LabelWithValueProps) {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center gap-2">
			<span className="text-sm font-medium text-gray-700 capitalize min-w-0 sm:min-w-[80px]">
				{label.replace(/([A-Z])/g, ' $1').trim()}:
			</span>
			<div className="flex-1 min-w-0">{value}</div>
		</div>
	);
}
