// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

//
// AgentPrompt — a callout that surfaces a ready-made builder prompt at the top
// of a docs page. Readers can copy the prompt or open it directly in an AI
// agent (Claude, ChatGPT, or Gemini) with the prompt pre-filled.
//
// Usage in MDX (registered globally, no import needed):
//
//   <AgentPrompt
//     prompt="Set up this machine for Sui development: ..."
//   />

'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './styles.module.css';

interface Agent {
	id: string;
	label: string;
	url: (prompt: string) => string;
}

const AGENTS: Agent[] = [
	{
		id: 'claude',
		label: 'Claude',
		url: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}`,
	},
	{
		id: 'chatgpt',
		label: 'ChatGPT',
		url: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}`,
	},
	{
		id: 'gemini',
		label: 'Gemini',
		url: (p) => `https://gemini.google.com/app?q=${encodeURIComponent(p)}`,
	},
];

export default function AgentPrompt({ prompt }: { prompt: string }) {
	const [open, setOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const menuRef = useRef<HTMLDivElement | null>(null);
	const [pageName, setPageName] = useState('');

	useEffect(() => {
		setPageName(window.location.pathname.replace(/\//g, '+').replace(/^\+/, ''));
	}, []);

	useEffect(() => {
		if (!open) return;
		const onClick = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false);
		};
		document.addEventListener('mousedown', onClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onClick);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	const copyPrompt = () => {
		if (typeof navigator !== 'undefined' && navigator.clipboard) {
			navigator.clipboard.writeText(prompt);
		}
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className={styles.root}>
			<div className={styles.label}>Agent prompt</div>
			<p className={styles.text}>{prompt}</p>
			<div className={styles.actions}>
				<button type="button" className={styles.copyBtn} onClick={copyPrompt}>
					{copied ? '✓ Copied' : 'Copy prompt'}
				</button>
				<div className={styles.agentWrap} ref={menuRef}>
					<button
						type="button"
						className={styles.agentBtn}
						onClick={() => setOpen(!open)}
					>
						Open in agent <span className={styles.caret}>▾</span>
					</button>
					{open && (
						<div className={styles.dropdown}>
							{AGENTS.map((agent) => (
								<a
									key={agent.id}
									href={agent.url(prompt)}
									target="_blank"
									rel="noopener noreferrer"
									className={styles.item}
									onClick={() => setOpen(false)}
								>
									{agent.label}
								</a>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
