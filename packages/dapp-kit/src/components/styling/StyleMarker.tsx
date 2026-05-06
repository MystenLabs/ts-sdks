// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Slot } from '@radix-ui/react-slot';
import type {
	ComponentPropsWithoutRef,
	ElementRef,
	ForwardRefExoticComponent,
	PropsWithoutRef,
	ReactNode,
	RefAttributes,
} from 'react';
import { forwardRef } from 'react';

import { styleDataAttribute } from '../../constants/styleDataAttribute.js';

import './StyleMarker.css.js';

type StyleMarker = {
	children: ReactNode;
};

export const StyleMarker: ForwardRefExoticComponent<
	PropsWithoutRef<ComponentPropsWithoutRef<typeof Slot>> & RefAttributes<ElementRef<typeof Slot>>
> = forwardRef<ElementRef<typeof Slot>, ComponentPropsWithoutRef<typeof Slot>>(
	({ children, ...props }, forwardedRef) => (
		<Slot ref={forwardedRef} {...props} {...styleDataAttribute}>
			{children}
		</Slot>
	),
);
StyleMarker.displayName = 'StyleMarker';
