// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback, useEffect } from 'react';
import { AutoApprovalManager } from '@mysten/wallet-sdk';
import type {
	AutoApprovalSettings,
	AutoApprovalIssue,
	AutoApprovalResult,
} from '@mysten/wallet-sdk';

export interface AutoApprovalState {
	manager: AutoApprovalManager | null;
	hasPolicy: boolean;
	hasSettings: boolean;
	canAutoApprove: boolean;
	matchesPolicy: boolean;
	policyIssues: AutoApprovalIssue[];
	settingsIssues: AutoApprovalIssue[];
	analysisIssues: AutoApprovalIssue[];
}

interface AutoApprovalActions {
	onAutoApprove: () => void;
	updateSettings: (settings: AutoApprovalSettings) => void;
	reset: () => void;
}

export function useAutoApproval(
	analysis: AutoApprovalResult | null,
	origin: string,
	network: string,
): [AutoApprovalState, AutoApprovalActions] {
	const [state, setState] = useState<AutoApprovalState>({
		manager: null,
		hasPolicy: false,
		hasSettings: false,
		canAutoApprove: false,
		matchesPolicy: false,
		policyIssues: [],
		settingsIssues: [],
		analysisIssues: [],
	});

	useEffect(() => {
		async function createManager() {
			const policy = await getPolicy(origin, network);

			if (!policy) {
				setState({
					manager: null,
					canAutoApprove: false,
					hasPolicy: false,
					hasSettings: false,
					matchesPolicy: false,
					policyIssues: [],
					settingsIssues: [],
					analysisIssues: [],
				});
				return;
			}

			const manager = new AutoApprovalManager({
				state: loadManagerState(origin, network),
				policy,
			});

			setState({
				manager,
				hasPolicy: true,
				canAutoApprove: false,
				matchesPolicy: false,
				hasSettings: !!manager.getState().settings,
				policyIssues: [],
				settingsIssues: [],
				analysisIssues: [],
			});
			saveManagerState(manager, origin, network);
		}

		createManager().catch((error) => {
			console.error('Failed to create AutoApprovalManager:', error);
			setState({
				manager: null,
				canAutoApprove: false,
				hasPolicy: false,
				matchesPolicy: false,
				hasSettings: false,
				policyIssues: [],
				settingsIssues: [],
				analysisIssues: [],
			});
		});
	}, [network, origin]);

	const checkAutoApproval = useCallback(() => {
		if (!state.manager || !analysis) {
			return;
		}

		const check = state.manager.checkTransaction(analysis);
		const hasSettings = !!state.manager.getState().settings;

		setState((prev) => ({
			...prev,
			matchesPolicy: check.matchesPolicy,
			canAutoApprove: check.canAutoApprove,
			policyIssues: check.policyIssues,
			settingsIssues: check.settingsIssues,
			analysisIssues: check.analysisIssues,
			hasSettings,
		}));
	}, [state.manager, analysis]);

	useEffect(() => {
		checkAutoApproval();
	}, [checkAutoApproval]);

	const actions: AutoApprovalActions = {
		onAutoApprove: useCallback(() => {
			if (!state.manager || !analysis) {
				throw new Error('Manager or analysis not available for auto-approval');
			}

			state.manager.commitTransaction(analysis);
			saveManagerState(state.manager, origin, network);
		}, [state.manager, analysis, origin, network]),
		updateSettings: useCallback(
			async (settings: AutoApprovalSettings) => {
				if (!state.manager) {
					throw new Error('Manager not available');
				}

				await state.manager.updateSettings(settings);
				await saveManagerState(state.manager, origin, network);

				checkAutoApproval();
			},
			[state.manager, origin, network, checkAutoApproval],
		),
		reset: useCallback(() => {
			state.manager?.reset();
			saveManagerState(state.manager!, origin, network);
			checkAutoApproval();
		}, [state.manager, origin, network, checkAutoApproval]),
	};

	return [state, actions];
}

async function getPolicy(origin: string, network: string): Promise<string | null> {
	try {
		// Fetch policy from well-known endpoint
		const policyUrl = `${origin}/.well-known/sui/${network}/automatic-approval-policy.json`;
		const response = await fetch(policyUrl);
		if (!response.ok) {
			return null;
		}

		return response.text();
	} catch (error) {
		console.error('Failed to fetch or parse policy:', error);
		return null;
	}
}

function saveManagerState(manager: AutoApprovalManager, origin: string, network: string) {
	localStorage.setItem(`auto-approval-${origin}-${network}`, manager.export());
}

function loadManagerState(origin: string, network: string): string | null {
	return localStorage.getItem(`auto-approval-${origin}-${network}`);
}
