// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

//
// CodeBlock — a wrapper around the Fumadocs code block that adds an
// "Open in agent" action next to the built-in copy button. Readers can send
// the snippet straight to an AI agent (Claude or ChatGPT) with the code
// pre-filled as the prompt.
//
// This replaces the default `pre` MDX component (registered in
// app/[[...slug]]/page.tsx), so it applies to every fenced code block in the
// docs automatically — no per-page markup required.
//

'use client';

import {
	CodeBlock as FumaCodeBlock,
	Pre,
	type CodeBlockProps,
} from 'fumadocs-ui/components/codeblock';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';

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
	// Note: Gemini's web app (gemini.google.com/app) does not support prefilling a
	// prompt via query string — the param is silently ignored and it opens empty.
	// Only agents with working prompt prefill are listed here.
];

function cx(...parts: (string | false | undefined)[]): string {
	return parts.filter(Boolean).join(' ');
}

// Pull the plain-text code out of the rendered code block. Mirrors the approach
// the Fumadocs copy button uses: clone the <pre>, drop copy-ignored nodes, and
// read textContent so we don't capture line numbers or button labels.
function readCode(container: HTMLElement | null): string {
	const pre = container?.getElementsByTagName('pre').item(0);
	if (!pre) return '';
	const clone = pre.cloneNode(true) as HTMLElement;
	clone.querySelectorAll('.nd-copy-ignore').forEach((node) => node.replaceWith('\n'));
	return clone.textContent ?? '';
}

const AGENT_PROMPT_PREFIX =
	'I found this code snippet in the Sui TypeScript SDK docs. Explain what it does and help me adapt it to my project:\n\n';

// Robot glyph, sized to match the Fumadocs copy button icon.
function BotIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M12 8V4H8" />
			<rect width="16" height="12" x="4" y="8" rx="2" />
			<path d="M2 14h2" />
			<path d="M20 14h2" />
			<path d="M15 13v2" />
			<path d="M9 13v2" />
		</svg>
	);
}

function OpenInAgentButton({ figureRef }: { figureRef: React.RefObject<HTMLElement | null> }) {
	const [open, setOpen] = useState(false);
	const wrapRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!open) return;
		const onClick = (e: MouseEvent) => {
			if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
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

	const hrefFor = (agent: Agent) => agent.url(AGENT_PROMPT_PREFIX + readCode(figureRef.current));

	return (
		<div ref={wrapRef} className="relative">
			<button
				type="button"
				aria-label="Open in agent"
				aria-expanded={open}
				className="inline-flex items-center justify-center rounded-md p-1 text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground [&_svg]:size-4"
				onClick={() => setOpen((v) => !v)}
			>
				<BotIcon />
			</button>
			{open && (
				<div className="absolute end-0 z-10 mt-1 min-w-36 rounded-lg border bg-fd-popover p-1 text-fd-popover-foreground shadow-lg">
					<div className="px-2 py-1 text-xs font-medium text-fd-muted-foreground">Open in</div>
					{AGENTS.map((agent) => (
						<a
							key={agent.id}
							href={hrefFor(agent)}
							target="_blank"
							rel="noopener noreferrer"
							className="block rounded-md px-2 py-1.5 text-sm hover:bg-fd-accent hover:text-fd-accent-foreground"
							onClick={() => setOpen(false)}
						>
							{agent.label}
						</a>
					))}
				</div>
			)}
		</div>
	);
}

function CustomCodeBlock(props: CodeBlockProps) {
	const figureRef = useRef<HTMLElement | null>(null);
	return (
		<FumaCodeBlock
			ref={figureRef}
			{...props}
			Actions={({ className, children }: { className?: string; children?: ReactNode }) => (
				<div className={cx('flex items-center gap-1', className)}>
					<OpenInAgentButton figureRef={figureRef} />
					{children}
				</div>
			)}
		/>
	);
}

// Drop-in replacement for the default `pre` MDX component.
export function CodeBlock(props: ComponentProps<'pre'>) {
	return (
		<CustomCodeBlock {...(props as CodeBlockProps)}>
			<Pre>{props.children}</Pre>
		</CustomCodeBlock>
	);
}

export default CodeBlock;
