// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export class StorageNodeError extends Error {}

export class StorageNodeAPIError<
	TStatus extends number | undefined = number | undefined,
	TError extends object | undefined = object | undefined,
> extends StorageNodeError {
	/** HTTP status for the response that caused the error. */
	readonly status: TStatus;

	/** JSON body of the response that caused the error. */
	readonly error: TError;

	constructor(status: TStatus, error: TError, message: string | undefined) {
		super(StorageNodeAPIError.#makeMessage(status, error, message));
		this.status = status;
		this.error = error;
	}

	static #makeMessage(status: number | undefined, error: unknown, message: string | undefined) {
		function hasErrorMessage(error: any): error is { error: { message: string } } {
			return typeof error?.error?.message === 'string';
		}

		const inferredMessage = hasErrorMessage(error) ? error.error.message : message;
		const finalMessage = inferredMessage ? inferredMessage : JSON.stringify(error);

		if (status && finalMessage) {
			return `${status} ${finalMessage}`;
		} else if (finalMessage) {
			return finalMessage;
		} else if (status) {
			return `${status} status code (no body)`;
		}
		return '(no status code or body)';
	}

	static generate(
		status: number | undefined,
		errorResponse: object | undefined,
		message: string | undefined,
	): StorageNodeAPIError {
		if (!status) {
			return new ConnectionError({ message });
		}

		if (status === 400) {
			return BadRequestError.generate(status, errorResponse, message);
		}

		if (status === 401) {
			return new AuthenticationError(status, errorResponse, message);
		}

		if (status === 403) {
			return new PermissionDeniedError(status, errorResponse, message);
		}

		if (status === 404) {
			return new NotFoundError(status, errorResponse, message);
		}

		if (status === 409) {
			return new ConflictError(status, errorResponse, message);
		}

		if (status === 422) {
			return new UnprocessableEntityError(status, errorResponse, message);
		}

		if (status === 429) {
			return new RateLimitError(status, errorResponse, message);
		}

		if (status === 451) {
			return new LegallyUnavailableError(status, errorResponse, message);
		}

		if (status >= 500) {
			return new InternalServerError(status, errorResponse, message);
		}

		return new StorageNodeAPIError(status, errorResponse, message);
	}
}

export class UserAbortError extends StorageNodeAPIError<undefined, undefined> {
	constructor({ message }: { message?: string } = {}) {
		super(undefined, undefined, message || 'Request was aborted.');
	}
}

export class ConnectionError extends StorageNodeAPIError<undefined, undefined> {
	constructor({ message }: { message?: string | undefined }) {
		super(undefined, undefined, message || 'Connection error.');
	}
}

export class ConnectionTimeoutError extends StorageNodeAPIError<undefined, undefined> {
	constructor({ message }: { message?: string } = {}) {
		super(undefined, undefined, message ?? 'Request timed out.');
	}
}

export class BadRequestError extends StorageNodeAPIError<400> {
	static generate(
		status: 400,
		errorResponse: object | undefined,
		message: string | undefined,
	): StorageNodeAPIError {
		if (errorResponse && typeof errorResponse === 'object' && 'error' in errorResponse) {
			const error = errorResponse.error as {
				details?: [
					{
						reason?: string;
					},
				];
			};
			if (error.details?.[0]?.reason === 'NOT_REGISTERED') {
				return new BlobNotRegisteredError(errorResponse, message);
			}
		}

		return new BadRequestError(status, errorResponse, message);
	}
}

export class BlobNotRegisteredError extends StorageNodeAPIError<400> {
	constructor(error: object | undefined, message: string | undefined) {
		super(400, error, message);
	}
}

export class AuthenticationError extends StorageNodeAPIError<401> {}

export class PermissionDeniedError extends StorageNodeAPIError<403> {}

export class NotFoundError extends StorageNodeAPIError<404> {}

export class ConflictError extends StorageNodeAPIError<409> {}

export class UnprocessableEntityError extends StorageNodeAPIError<422> {}

export class RateLimitError extends StorageNodeAPIError<429> {}

export class LegallyUnavailableError extends StorageNodeAPIError<451> {}

export class InternalServerError extends StorageNodeAPIError<number> {}
