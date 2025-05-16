// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as v from 'valibot';
import { SignJWT, decodeJwt, jwtVerify } from 'jose';

const AccountSchema = v.object({
	address: v.string(),
	publicKey: v.string(),
});

const JwtSessionSchema = v.object({
	exp: v.number(), // Expiration Time
	iat: v.number(), // Issued At
	iss: v.string(), // Issuer
	aud: v.string(), // Audience (the dapp origin)
	payload: v.object({
		accounts: v.array(AccountSchema),
	}),
});

type JwtSessionPayload = v.InferOutput<typeof JwtSessionSchema>;

export async function createJwtSession(
	payload: JwtSessionPayload['payload'],
	options: {
		secretKey: Parameters<SignJWT['sign']>[0];
		expirationTime: Parameters<SignJWT['setExpirationTime']>[0];
		issuer: Parameters<SignJWT['setIssuer']>[0];
		audience: Parameters<SignJWT['setAudience']>[0];
	},
) {
	const token = await new SignJWT({ payload })
		.setProtectedHeader({ alg: 'HS256' })
		.setExpirationTime(options.expirationTime)
		.setIssuedAt()
		.setIssuer(options.issuer)
		.setAudience(options.audience)
		.sign(options.secretKey);

	return token;
}

export function decodeJwtSession(jwt: string) {
	const decodedJwt = decodeJwt(jwt);

	return v.parse(JwtSessionSchema, decodedJwt);
}

export async function verifyJwtSession(jwt: string, secretKey: CryptoKey | Uint8Array) {
	const verified = await jwtVerify(jwt, secretKey, { algorithms: ['HS256'] });

	return v.parse(JwtSessionSchema, verified.payload);
}
