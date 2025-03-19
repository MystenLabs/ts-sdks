// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/ban-types */

import type { Experimental_ClientTransportMethods } from './transport.js';

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

export class Experimental_SuiClient implements Experimental_ClientTransportMethods {
	#transports: Experimental_ClientTransportMethods[] = [];

	// TODO: This is probably a little too simple, and we might want to support delegating to other transports
	#transportMethod<T extends keyof Experimental_ClientTransportMethods>(method: T) {
		// TODO: We use a `function` here because methods are assigned as props and we want to bind `this` at execution, not at creation (because of extensions)
		// Do we want to attach these to the prototype instead?
		return function (
			this: Experimental_SuiClient,
			...args: Parameters<NonNullable<Experimental_ClientTransportMethods[T]>>
		): ReturnType<NonNullable<Experimental_ClientTransportMethods[T]>> {
			for (const transport of this.#transports) {
				if (transport[method]) {
					return (transport[method] as (...args: any[]) => any)(...args);
				}
			}
			throw new Error(`No transport method found for ${method}`);
		};
	}

	// TODO: DO we want different APIs for the client vs transport methods.
	// Specifically this will affect things like: Do we parse effects in the client or the transport?
	getBalance = this.#transportMethod('getBalance');
	getAllBalances = this.#transportMethod('getAllBalances');
	getTransaction = this.#transportMethod('getTransaction');
	executeTransaction = this.#transportMethod('executeTransaction');
	dryRunTransaction = this.#transportMethod('dryRunTransaction');
	getReferenceGasPrice = this.#transportMethod('getReferenceGasPrice');

	$registerTransport(transport: Experimental_ClientTransportMethods) {
		this.#transports.push(transport);
	}

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
