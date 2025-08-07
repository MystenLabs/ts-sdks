// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Copied from https://github.com/auth0/jwt-decode/blob/3d372e9875ff673228a9f2d9df74e84690842a9c/lib/index.ts */

/**
The MIT License (MIT)

Copyright (c) 2015 Auth0, Inc. <support@auth0.com> (http://auth0.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

export interface JwtDecodeOptions {
	header?: boolean;
}

export interface JwtHeader {
	typ?: string;
	alg?: string;
	kid?: string;
}

export interface JwtPayload {
	iss?: string;
	sub?: string;
	aud?: string[] | string;
	exp?: number;
	nbf?: number;
	iat?: number;
	jti?: string;
}

export class InvalidTokenError extends Error {}

InvalidTokenError.prototype.name = 'InvalidTokenError';

function b64DecodeUnicode(str: string) {
	return decodeURIComponent(
		atob(str).replace(/(.)/g, (_m, p) => {
			let code = (p as string).charCodeAt(0).toString(16).toUpperCase();
			if (code.length < 2) {
				code = '0' + code;
			}
			return '%' + code;
		}),
	);
}

function base64UrlDecode(str: string) {
	let output = str.replace(/-/g, '+').replace(/_/g, '/');
	switch (output.length % 4) {
		case 0:
			break;
		case 2:
			output += '==';
			break;
		case 3:
			output += '=';
			break;
		default:
			throw new Error('base64 string is not of the correct length');
	}

	try {
		return b64DecodeUnicode(output);
	} catch (err) {
		return atob(output);
	}
}

export function jwtDecode<T = JwtHeader>(
	token: string,
	options: JwtDecodeOptions & { header: true },
): T;
export function jwtDecode<T = JwtPayload>(token: string, options?: JwtDecodeOptions): T;
export function jwtDecode<T = JwtHeader | JwtPayload>(
	token: string,
	options?: JwtDecodeOptions,
): T {
	if (typeof token !== 'string') {
		throw new InvalidTokenError('Invalid token specified: must be a string');
	}

	options ||= {};

	const pos = options.header === true ? 0 : 1;
	const part = token.split('.')[pos];

	if (typeof part !== 'string') {
		throw new InvalidTokenError(`Invalid token specified: missing part #${pos + 1}`);
	}

	let decoded: string;
	try {
		decoded = base64UrlDecode(part);
	} catch (e) {
		throw new InvalidTokenError(
			`Invalid token specified: invalid base64 for part #${pos + 1} (${(e as Error).message})`,
		);
	}

	try {
		return JSON.parse(decoded) as T;
	} catch (e) {
		throw new InvalidTokenError(
			`Invalid token specified: invalid json for part #${pos + 1} (${(e as Error).message})`,
		);
	}
}
