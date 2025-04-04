// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/ban-types */

import type { Experimental_CoreClient } from './core.js';
import type {
	ClientWithExtensions,
	Experimental_SuiClientTypes,
	Simplify,
	SuiClientRegistration,
	UnionToIntersection,
} from './types.js';

export abstract class Experimental_SuiClient {
	network: Experimental_SuiClientTypes.Network;

	constructor({ network }: Experimental_SuiClientTypes.SuiClientOptions) {
		this.network = network;
	}

	abstract core: Experimental_CoreClient;

	$extend<const Registrations extends SuiClientRegistration<this>[]>(
		...registrations: Registrations
	) {
		return Object.create(
			this,
			Object.fromEntries(
				registrations.map((registration) => {
					if ('experimental_asClientExtension' in registration) {
						const { name, register } = registration.experimental_asClientExtension();
						return [name, { value: register(this) }];
					}
					return [registration.name, { value: registration.register(this) }];
				}),
			),
		) as ClientWithExtensions<
			Simplify<
				Omit<
					{
						[K in keyof this]: this[K];
					},
					keyof Experimental_SuiClient
				> &
					UnionToIntersection<
						{
							[K in keyof Registrations]: Registrations[K] extends SuiClientRegistration<
								this,
								infer Name extends string,
								infer Extension
							>
								? {
										[K2 in Name]: Extension;
									}
								: never;
						}[number]
					>
			>
		>;
	}
}
