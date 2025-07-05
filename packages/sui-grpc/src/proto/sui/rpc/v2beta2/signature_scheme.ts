// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
export enum SignatureScheme {
	/**
	 * @generated from protobuf enum value: ED25519 = 0;
	 */
	ED25519 = 0,
	/**
	 * @generated from protobuf enum value: SECP256K1 = 1;
	 */
	SECP256K1 = 1,
	/**
	 * @generated from protobuf enum value: SECP256R1 = 2;
	 */
	SECP256R1 = 2,
	/**
	 * @generated from protobuf enum value: MULTISIG = 3;
	 */
	MULTISIG = 3,
	/**
	 * @generated from protobuf enum value: BLS12381 = 4;
	 */
	BLS12381 = 4,
	/**
	 * @generated from protobuf enum value: ZKLOGIN = 5;
	 */
	ZKLOGIN = 5,
	/**
	 * @generated from protobuf enum value: PASSKEY = 6;
	 */
	PASSKEY = 6,
}
