// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Test module with struct/enum names that conflict with all SDK imports
module conflict_test::conflict {
    // Conflicts with @mysten/sui/transactions Transaction
    public struct Transaction has copy, drop, store {
        value: u64,
    }

    // Conflicts with @mysten/sui/bcs BcsType
    public struct BcsType has copy, drop, store {
        data: vector<u8>,
    }

    // Conflicts with utils MoveStruct
    public struct MoveStruct has copy, drop, store {
        field: u64,
    }

    // Conflicts with utils MoveTuple
    public struct MoveTuple has copy, drop, store {
        a: u64,
        b: u64,
    }

    // Conflicts with utils MoveEnum
    public enum MoveEnum has copy, drop, store {
        VariantA,
        VariantB { value: u64 },
    }

    // Conflicts with utils RawTransactionArgument
    public struct RawTransactionArgument has copy, drop, store {
        arg: u64,
    }


    // Generic struct to test BcsType conflict in generics
    public struct GenericStruct<T: copy + drop + store> has copy, drop, store {
        inner: T,
    }

    // Generic enum to test BcsType conflict in generics
    public enum GenericEnum<T: copy + drop + store> has copy, drop, store {
        Some { value: T },
        None,
    }

    // Functions that use all the conflicting types
    public fun create_transaction(value: u64): Transaction {
        Transaction { value }
    }

    public fun create_bcs_type(data: vector<u8>): BcsType {
        BcsType { data }
    }

    public fun create_move_struct(field: u64): MoveStruct {
        MoveStruct { field }
    }

    public fun create_move_tuple(a: u64, b: u64): MoveTuple {
        MoveTuple { a, b }
    }

    public fun get_transaction_value(tx: &Transaction): u64 {
        tx.value
    }

    public fun create_raw_tx_arg(arg: u64): RawTransactionArgument {
        RawTransactionArgument { arg }
    }

    // Generic function to test BcsType conflict in generics
    public fun wrap_in_generic<T: copy + drop + store>(item: T): GenericStruct<T> {
        GenericStruct { inner: item }
    }

    // Function named 'bcs' to conflict with @mysten/sui/bcs import
    public fun bcs(value: u64): u64 {
        value
    }

    // Function named normalize_move_arguments (snake_case -> camelCase)
    // This conflicts with the utils normalizeMoveArguments import
    public fun normalize_move_arguments(value: u64): u64 {
        value
    }
}
