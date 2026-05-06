// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Slot } from '@radix-ui/react-slot';
import clsx from 'clsx';
import type {
	ButtonHTMLAttributes,
	ForwardRefExoticComponent,
	PropsWithoutRef,
	RefAttributes,
} from 'react';
import { forwardRef } from 'react';

import { buttonVariants } from './Button.css.js';
import type { ButtonVariants } from './Button.css.js';

type ButtonProps = {
	asChild?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement> &
	ButtonVariants;

const Button: ForwardRefExoticComponent<
	PropsWithoutRef<ButtonProps> & RefAttributes<HTMLButtonElement>
> = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, forwardedRef) => {
		const Comp = asChild ? Slot : 'button';
		return (
			<Comp
				{...props}
				className={clsx(buttonVariants({ variant, size }), className)}
				ref={forwardedRef}
			/>
		);
	},
);
Button.displayName = 'Button';

export { Button };
