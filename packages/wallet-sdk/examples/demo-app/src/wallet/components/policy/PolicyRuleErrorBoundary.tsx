// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react';
import { Component } from 'react';
import { Modal, ModalFooter } from '../../../app/components/ui/Modal.js';
import { Button } from '../../../app/components/ui/Button.js';
import { Alert } from '../../../app/components/ui/Alert.js';

interface Props {
	children: ReactNode;
	onClose: () => void;
}

interface State {
	hasError: boolean;
	error?: string;
}

export class PolicyRuleErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error: error.message };
	}

	render() {
		if (this.state.hasError) {
			return (
				<Modal isOpen={true} onClose={this.props.onClose} title="Policy Error" size="md">
					<Alert type="error">
						⚠️ This auto-approval policy contains unsupported or invalid rules and cannot be safely
						processed.
					</Alert>
					<div className="bg-gray-100 border border-gray-300 rounded p-3 text-gray-600 text-xs font-mono whitespace-pre-wrap mt-4">
						Error: {this.state.error}
					</div>
					<ModalFooter>
						<Button variant="secondary" onClick={this.props.onClose}>
							Close
						</Button>
					</ModalFooter>
				</Modal>
			);
		}

		return this.props.children;
	}
}
