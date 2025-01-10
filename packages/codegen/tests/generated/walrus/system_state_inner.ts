import { bcs } from "@mysten/sui/bcs";
import { type Transaction } from "@mysten/sui/transactions";
import { normalizeMoveArguments, type RawTransactionArgument } from "../utils/index.ts";
import * as object from "./deps/0000000000000000000000000000000000000000000000000000000000000002/object";
import * as bls_aggregate from "./deps/0000000000000000000000000000000000000000000000000000000000000000/bls_aggregate";
import * as storage_accounting from "./deps/0000000000000000000000000000000000000000000000000000000000000000/storage_accounting";
import * as event_blob from "./deps/0000000000000000000000000000000000000000000000000000000000000000/event_blob";
import * as epoch_parameters from "./deps/0000000000000000000000000000000000000000000000000000000000000000/epoch_parameters";
import * as coin from "./deps/0000000000000000000000000000000000000000000000000000000000000002/coin";
import * as storage_resource from "./deps/0000000000000000000000000000000000000000000000000000000000000000/storage_resource";
import * as blob from "./deps/0000000000000000000000000000000000000000000000000000000000000000/blob";
import * as storage_node from "./deps/0000000000000000000000000000000000000000000000000000000000000000/storage_node";
export function SystemStateInnerV1() {
    return bcs.struct("SystemStateInnerV1", ({
        id: object.UID(),
        committee: bls_aggregate.BlsCommittee(),
        total_capacity_size: bcs.u64(),
        used_capacity_size: bcs.u64(),
        storage_price_per_unit_size: bcs.u64(),
        write_price_per_unit_size: bcs.u64(),
        future_accounting: storage_accounting.FutureAccountingRingBuffer(),
        event_blob_certification_state: event_blob.EventBlobCertificationState()
    }));
}
export function init(packageAddress: string) {
    function create_empty(options: {
        arguments: [
            RawTransactionArgument<number>
        ];
    }) {
        const argumentsTypes = [
            "u32"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "create_empty",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function advance_epoch(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::system_state_inner::SystemStateInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::bls_aggregate::BlsCommittee",
            "0000000000000000000000000000000000000000000000000000000000000000::epoch_parameters::EpochParams"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "advance_epoch",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function reserve_space(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::system_state_inner::SystemStateInnerV1",
            "u64",
            "u32",
            "0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0000000000000000000000000000000000000000000000000000000000000000::wal::WAL>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "reserve_space",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function reserve_space_without_payment(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::system_state_inner::SystemStateInnerV1",
            "u64",
            "u32"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "reserve_space_without_payment",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function invalidate_blob_id(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number[]>,
            RawTransactionArgument<number[]>,
            RawTransactionArgument<number[]>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::system_state_inner::SystemStateInnerV1",
            "vector<u8>",
            "vector<u16>",
            "vector<u8>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "invalidate_blob_id",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function register_blob(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number>,
            RawTransactionArgument<boolean>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::system_state_inner::SystemStateInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_resource::Storage",
            "u256",
            "u256",
            "u64",
            "u8",
            "bool",
            "0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0000000000000000000000000000000000000000000000000000000000000000::wal::WAL>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "register_blob",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function certify_blob(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<number[]>,
            RawTransactionArgument<number[]>,
            RawTransactionArgument<number[]>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::system_state_inner::SystemStateInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::blob::Blob",
            "vector<u8>",
            "vector<u16>",
            "vector<u8>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "certify_blob",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function delete_blob(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::system_state_inner::SystemStateInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::blob::Blob"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "delete_blob",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function extend_blob_with_resource(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::system_state_inner::SystemStateInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::blob::Blob",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_resource::Storage"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "extend_blob_with_resource",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function extend_blob(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<number>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::system_state_inner::SystemStateInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::blob::Blob",
            "u32",
            "0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0000000000000000000000000000000000000000000000000000000000000000::wal::WAL>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "extend_blob",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function process_storage_payments(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number>,
            RawTransactionArgument<number>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::system_state_inner::SystemStateInnerV1",
            "u64",
            "u32",
            "u32",
            "0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0000000000000000000000000000000000000000000000000000000000000000::wal::WAL>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "process_storage_payments",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function certify_event_blob(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::system_state_inner::SystemStateInnerV1",
            "0000000000000000000000000000000000000000000000000000000000000000::storage_node::StorageNodeCap",
            "u256",
            "u256",
            "u64",
            "u8",
            "u64",
            "u32"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "certify_event_blob",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function epoch(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::system_state_inner::SystemStateInnerV1"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "epoch",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function total_capacity_size(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::system_state_inner::SystemStateInnerV1"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "total_capacity_size",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function used_capacity_size(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::system_state_inner::SystemStateInnerV1"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "used_capacity_size",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function committee(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::system_state_inner::SystemStateInnerV1"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "committee",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function n_shards(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::system_state_inner::SystemStateInnerV1"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "n_shards",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function write_price(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number | bigint>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::system_state_inner::SystemStateInnerV1",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "write_price",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function storage_units_from_size(options: {
        arguments: [
            RawTransactionArgument<number | bigint>
        ];
    }) {
        const argumentsTypes = [
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "system_state_inner",
            function: "storage_units_from_size",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    return { create_empty, advance_epoch, reserve_space, reserve_space_without_payment, invalidate_blob_id, register_blob, certify_blob, delete_blob, extend_blob_with_resource, extend_blob, process_storage_payments, certify_event_blob, epoch, total_capacity_size, used_capacity_size, committee, n_shards, write_price, storage_units_from_size };
}