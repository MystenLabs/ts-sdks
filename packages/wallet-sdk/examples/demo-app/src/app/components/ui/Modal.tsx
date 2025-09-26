// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	children: React.ReactNode;
	size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
	showCloseButton?: boolean;
}

const sizeClasses = {
	sm: 'max-w-md',
	md: 'max-w-lg',
	lg: 'max-w-2xl',
	xl: 'max-w-4xl',
	'2xl': 'max-w-6xl',
};

export function Modal({
	isOpen,
	onClose,
	title,
	children,
	size = 'lg',
	showCloseButton = true,
}: ModalProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div className={`bg-white rounded-lg w-11/12 ${sizeClasses[size]} max-h-4/5 overflow-y-auto`}>
				{title && (
					<div className="flex justify-between items-center p-5 border-b border-gray-200">
						<h2 className="m-0 text-gray-700 text-lg font-semibold">{title}</h2>
						{showCloseButton && (
							<button
								className="bg-none border-none text-2xl cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
								onClick={onClose}
								aria-label="Close modal"
							>
								&times;
							</button>
						)}
					</div>
				)}
				<div className="p-5">{children}</div>
			</div>
		</div>
	);
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex gap-2.5 justify-end pt-5 mt-5 border-t border-gray-200">{children}</div>
	);
}
