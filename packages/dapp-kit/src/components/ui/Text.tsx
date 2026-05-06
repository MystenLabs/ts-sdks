// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Slot } from '@radix-ui/react-slot';
import clsx from 'clsx';
import type { ForwardRefExoticComponent, PropsWithoutRef, RefAttributes } from 'react';
import { forwardRef } from 'react';

import { textVariants } from './Text.css.js';
import type { TextVariants } from './Text.css.js';

type TextAsChildProps = {
	asChild?: boolean;
	as?: never;
};

type TextDivProps = { as: 'div'; asChild?: never };

type TextProps = (TextAsChildProps | TextDivProps) &
	React.HTMLAttributes<HTMLDivElement> &
	TextVariants;

const Text: ForwardRefExoticComponent<PropsWithoutRef<TextProps> & RefAttributes<HTMLDivElement>> =
	forwardRef<HTMLDivElement, TextProps>(
		(
			{
				children,
				className,
				asChild = false,
				as: Tag = 'div',
				size,
				weight,
				color,
				mono,
				...textProps
			},
			forwardedRef,
		) => {
			return (
				<Slot
					{...textProps}
					ref={forwardedRef}
					className={clsx(textVariants({ size, weight, color, mono }), className)}
				>
					{asChild ? children : <Tag>{children}</Tag>}
				</Slot>
			);
		},
	);
Text.displayName = 'Text';

export { Text };
