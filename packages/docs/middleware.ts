// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
	const accept = request.headers.get('accept') ?? '';

	if (accept.includes('text/markdown')) {
		const url = request.nextUrl.clone();
		url.pathname = `/api/md${request.nextUrl.pathname}`;
		return NextResponse.rewrite(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/((?!api/|_next/|llms\\.txt|.*\\.(?:md|txt|ico|png|jpg|svg|css|js)$).*)'],
};
