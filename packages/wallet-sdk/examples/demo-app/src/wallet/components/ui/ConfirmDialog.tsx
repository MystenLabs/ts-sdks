// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

interface ConfirmDialogProps {
	isOpen: boolean;
	title: string;
	message: string;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export function ConfirmDialog({
	isOpen,
	title,
	message,
	confirmLabel = 'Confirm',
	cancelLabel = 'Cancel',
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed flex">
			<div className="p-6">
				<h3 className="text-gray-700">{title}</h3>

				<p className="text-gray-500">{message}</p>

				<div className="flex gap-3">
					<button
						onClick={onCancel}
						className="px-4 py-2 border border-gray-300 cursor-pointer text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors duration-200 rounded"
					>
						{cancelLabel}
					</button>
					<button
						onClick={onConfirm}
						className="px-4 py-2 border-none cursor-pointer text-white bg-red-500 hover:bg-red-600 transition-colors duration-200 rounded"
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
