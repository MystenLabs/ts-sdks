// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as v from 'valibot';
import type { JWTPayload } from 'jose';
import { SignJWT, decodeJwt, jwtVerify } from 'jose';

const AccountSchema = v.object({
	address: v.string(),
	publicKey: v.string(),
	nickname: v.optional(v.string()),
	icon: v.optional(v.string()),
	chains: v.optional(v.array(v.pipe(v.string(), v.regex<`${string}:${string}`>(/^.+:.+$/)))),
	features: v.optional(v.array(v.pipe(v.string(), v.regex<`${string}:${string}`>(/^.+:.+$/)))),
});

const JwtSessionSchema = v.looseObject({
	session: v.object({
		appName: v.string(),
		appOrigin: v.pipe(v.string(), v.url()),
		appUrl: v.pipe(v.string(), v.url()),
		accounts: v.array(AccountSchema),
	}),
});

type JwtSessionPayload = v.InferOutput<typeof JwtSessionSchema>;

export async function createJwtSession(
	session: JwtSessionPayload['session'],
	options: {
		secretKey: Parameters<SignJWT['sign']>[0];
		expirationTime: Parameters<SignJWT['setExpirationTime']>[0];
		issuer: Parameters<SignJWT['setIssuer']>[0];
	},
) {
	const token = await new SignJWT({ session })
		.setProtectedHeader({ alg: 'HS256' })
		.setExpirationTime(options.expirationTime)
		.setIssuedAt()
		.setIssuer(options.issuer)
		.sign(options.secretKey);

	return token;
}

export function decodeJwtSession(jwt: string): JwtSessionPayload & JWTPayload {
	const decodedJwt = decodeJwt(jwt);

	return v.parse(JwtSessionSchema, decodedJwt);
}

export async function verifyJwtSession(
	jwt: string,
	secretKey: Uint8Array,
): Promise<JwtSessionPayload & JWTPayload> {
	const verified = await jwtVerify(jwt, secretKey, { algorithms: ['HS256'] });

	return v.parse(JwtSessionSchema, verified.payload);
}
