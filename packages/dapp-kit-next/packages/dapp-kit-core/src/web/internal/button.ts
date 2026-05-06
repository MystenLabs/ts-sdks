// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { html, LitElement } from 'lit';
import type { CSSResultGroup, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styles } from './button.styles.js';

export class Button extends LitElement {
	static override shadowRootOptions: ShadowRootInit = {
		...LitElement.shadowRootOptions,
		delegatesFocus: true,
	};

	static override styles: CSSResultGroup = styles;

	@property({ type: String })
	variant: 'primary' | 'secondary' = 'primary';

	@property({ type: String })
	href: string = '';

	@property({ type: Boolean, reflect: true })
	disabled: boolean = false;

	override render(): TemplateResult {
		return this.href
			? html`
					<a
						part="trigger"
						href=${this.href}
						?disabled=${this.disabled}
						target="_blank"
						rel="noreferrer"
						class=${classMap({ button: true, [this.variant]: true })}
					>
						<slot part="button-content"></slot>
					</a>
				`
			: html`
					<button
						part="trigger"
						type="button"
						?disabled=${this.disabled}
						class=${classMap({ button: true, [this.variant]: true })}
					>
						<slot part="button-content"></slot>
					</button>
				`;
	}
}
