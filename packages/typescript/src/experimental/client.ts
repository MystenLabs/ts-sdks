// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/ban-types */

import { getFullnodeUrl, SuiClient } from '../client/index.js';

type SuiClientRegistration<T, Name extends string = string, Extension = unknown> =
	| {
			readonly name: Name;
			readonly register: (client: T) => Extension;
	  }
	| {
			experimental_asClientExtension: () => {
				readonly name: Name;
				readonly register: (client: T) => Extension;
			};
	  };

type Simplify<T> = {
	[K in keyof T]: T[K];
} & {};

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
	? I
	: never;

type ClientWithExtensions<T> = Experimental_SuiClient & T;

export class Experimental_SuiClient {
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

const client = new Experimental_SuiClient();

const withJsonRPC = client.$extend(new SuiClient({ url: getFullnodeUrl('mainnet') }));

class OtherClass {
	client: ClientWithExtensions<{ jsonRPC: SuiClient }>;
	// Takes an extended client
	constructor(client: ClientWithExtensions<{ jsonRPC: SuiClient }>) {
		this.client = client;
	}
}

const withMoreStuff = withJsonRPC.$extend(
	{
		name: 'test2' as const,
		register: (_client) => ({
			hello: () => 'world',
		}),
	},
	{
		name: 'test3' as const,
		register: (client) => new OtherClass(client),
	},
);
