// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export class SealError extends Error {}

export class UserError extends SealError {}

// Errors returned by the Seal server
export class SealAPIError extends SealError {
	constructor(
		message: string,
		public requestId?: string,
		public status?: number,
	) {
		super(message);
	}

	static #generate(error: string, message: string, requestId: string, status?: number) {
		switch (error) {
			case 'InvalidPTB':
				return new InvalidPTBError(requestId, message);
			case 'InvalidPackage':
				return new InvalidPackageError(requestId);
			case 'NoAccess':
				return new NoAccessError(requestId);
			case 'InvalidSignature':
				return new InvalidUserSignatureError(requestId);
			case 'InvalidSessionSignature':
				return new InvalidSessionKeySignatureError(requestId);
			case 'InvalidCertificate':
				return new ExpiredSessionKeyError(requestId);
			case 'InvalidSDKVersion':
				return new InvalidSDKVersionError(requestId);
			case 'InvalidSDKType':
				return new InvalidSDKTypeError(requestId);
			case 'DeprecatedSDKVersion':
				return new DeprecatedSDKVersionError(requestId);
			case 'InvalidParameter':
				return new InvalidParameterError(requestId);
			case 'InvalidMVRName':
				return new InvalidMVRNameError(requestId);
			case 'InvalidServiceId':
				return new InvalidKeyServerObjectIdError(requestId);
			case 'UnsupportedPackageId':
				return new UnsupportedPackageIdError(requestId);
			case 'Failure':
				return new InternalError(requestId);
			default:
				return new GeneralError(message, requestId, status);
		}
	}

	static async assertResponse(response: Response, requestId: string) {
		if (response.ok) {
			return;
		}
		let errorInstance: SealAPIError;
		try {
			const text = await response.text();
			const error = JSON.parse(text)['error'];
			const message = JSON.parse(text)['message'];
			errorInstance = SealAPIError.#generate(error, message, requestId);
		} catch {
			// If we can't parse the response as JSON or if it doesn't have the expected format,
			// fall back to using the status text
			errorInstance = new GeneralError(response.statusText, requestId, response.status);
		}
		throw errorInstance;
	}
}

// Errors returned by the Seal server that indicate that the PTB is invalid

export class InvalidPTBError extends SealAPIError {
	constructor(requestId?: string, message?: string) {
		super('PTB does not conform to the expected format ' + message, requestId);
	}
}

export class InvalidPackageError extends SealAPIError {
	constructor(requestId?: string) {
		super('Package ID used in PTB is invalid', requestId);
	}
}

export class InvalidParameterError extends SealAPIError {
	constructor(requestId?: string) {
		super(
			'PTB contains an invalid parameter, possibly a newly created object that the FN has not yet seen',
			requestId,
		);
	}
}

// Errors returned by the Seal server that indicate that the user's signature is invalid

export class InvalidUserSignatureError extends SealAPIError {
	constructor(requestId?: string) {
		super('User signature on the session key is invalid', requestId);
	}
}

export class InvalidSessionKeySignatureError extends SealAPIError {
	constructor(requestId?: string) {
		super('Session key signature is invalid', requestId);
	}
}

export class InvalidMVRNameError extends SealAPIError {
	constructor(requestId?: string) {
		super('MVR name is invalid or not consistent with the first version of the package', requestId);
	}
}

/** Server error indicating that the requested key server object id is invalid */
export class InvalidKeyServerObjectIdError extends SealAPIError {
	constructor(requestId?: string) {
		super('Key server object ID is invalid', requestId);
	}
}

/** Server error indicating that the requested package id is not supported (i.e., key server is running in Permissioned mode) */
export class UnsupportedPackageIdError extends SealAPIError {
	constructor(requestId?: string) {
		super('Requested package is not supported', requestId);
	}
}

// Errors returned by the Seal server that indicate that the SDK version is invalid (implying that HTTP headers used by the SDK are being removed) or deprecated (implying that the SDK should be upgraded).

export class InvalidSDKVersionError extends SealAPIError {
	constructor(requestId?: string) {
		super('SDK version is invalid', requestId);
	}
}

export class InvalidSDKTypeError extends SealAPIError {
	constructor(requestId?: string) {
		super('SDK type is invalid', requestId);
	}
}

export class DeprecatedSDKVersionError extends SealAPIError {
	constructor(requestId?: string) {
		super('SDK version is deprecated', requestId);
	}
}

/** Server error indicating that the user does not have access to one or more of the requested keys */
export class NoAccessError extends SealAPIError {
	constructor(requestId?: string) {
		super('User does not have access to one or more of the requested keys', requestId);
	}
}

/** Server error indicating that the session key has expired */
export class ExpiredSessionKeyError extends SealAPIError {
	constructor(requestId?: string) {
		super('Session key has expired', requestId);
	}
}

/** Internal server error, caller should retry */
export class InternalError extends SealAPIError {
	constructor(requestId?: string) {
		super('Internal server error, caller should retry', requestId);
	}
}

/** General server errors that are not specific to the Seal API (e.g., 404 "Not Found") */
export class GeneralError extends SealAPIError {}

// Errors returned by the SDK
export class InvalidPersonalMessageSignatureError extends UserError {}
export class InvalidGetObjectError extends UserError {}
export class UnsupportedFeatureError extends UserError {}
export class UnsupportedNetworkError extends UserError {}
export class InvalidKeyServerError extends UserError {}
export class InvalidKeyServerVersionError extends UserError {}
export class InvalidCiphertextError extends UserError {}
export class InvalidThresholdError extends UserError {}
export class InconsistentKeyServersError extends UserError {}
export class DecryptionError extends UserError {}
export class InvalidClientOptionsError extends UserError {}
export class TooManyFailedFetchKeyRequestsError extends UserError {}

export function toMajorityError(errors: Error[]): Error {
	let maxCount = 0;
	let majorityError = errors[0];
	const counts = new Map<string, number>();
	for (const error of errors) {
		const errorName = error.constructor.name;
		const newCount = (counts.get(errorName) || 0) + 1;
		counts.set(errorName, newCount);

		if (newCount > maxCount) {
			maxCount = newCount;
			majorityError = error;
		}
	}

	return majorityError;
}
