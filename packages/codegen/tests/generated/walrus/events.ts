import { bcs } from "@mysten/sui/bcs";
import { type Transaction } from "@mysten/sui/transactions";
import { normalizeMoveArguments, type RawTransactionArgument } from "../utils/index.ts";
export function BlobRegistered() {
    return bcs.struct("BlobRegistered", ({
        epoch: bcs.u32(),
        blob_id: bcs.u256(),
        size: bcs.u64(),
        encoding_type: bcs.u8(),
        end_epoch: bcs.u32(),
        deletable: bcs.bool(),
        object_id: bcs.Address
    }));
}
export function BlobCertified() {
    return bcs.struct("BlobCertified", ({
        epoch: bcs.u32(),
        blob_id: bcs.u256(),
        end_epoch: bcs.u32(),
        deletable: bcs.bool(),
        object_id: bcs.Address,
        is_extension: bcs.bool()
    }));
}
export function BlobDeleted() {
    return bcs.struct("BlobDeleted", ({
        epoch: bcs.u32(),
        blob_id: bcs.u256(),
        end_epoch: bcs.u32(),
        object_id: bcs.Address,
        was_certified: bcs.bool()
    }));
}
export function InvalidBlobID() {
    return bcs.struct("InvalidBlobID", ({
        epoch: bcs.u32(),
        blob_id: bcs.u256()
    }));
}
export function EpochChangeStart() {
    return bcs.struct("EpochChangeStart", ({
        epoch: bcs.u32()
    }));
}
export function EpochChangeDone() {
    return bcs.struct("EpochChangeDone", ({
        epoch: bcs.u32()
    }));
}
export function ShardsReceived() {
    return bcs.struct("ShardsReceived", ({
        epoch: bcs.u32(),
        shards: bcs.vector(bcs.u16())
    }));
}
export function EpochParametersSelected() {
    return bcs.struct("EpochParametersSelected", ({
        next_epoch: bcs.u32()
    }));
}
export function ShardRecoveryStart() {
    return bcs.struct("ShardRecoveryStart", ({
        epoch: bcs.u32(),
        shards: bcs.vector(bcs.u16())
    }));
}
export function init(packageAddress: string) {
    function emit_blob_registered(options: {
        arguments: [
            RawTransactionArgument<number>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number>,
            RawTransactionArgument<number>,
            RawTransactionArgument<boolean>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "u32",
            "u256",
            "u64",
            "u8",
            "u32",
            "bool",
            "0000000000000000000000000000000000000000000000000000000000000002::object::ID"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "events",
            function: "emit_blob_registered",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function emit_blob_certified(options: {
        arguments: [
            RawTransactionArgument<number>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number>,
            RawTransactionArgument<boolean>,
            RawTransactionArgument<string>,
            RawTransactionArgument<boolean>
        ];
    }) {
        const argumentsTypes = [
            "u32",
            "u256",
            "u32",
            "bool",
            "0000000000000000000000000000000000000000000000000000000000000002::object::ID",
            "bool"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "events",
            function: "emit_blob_certified",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function emit_invalid_blob_id(options: {
        arguments: [
            RawTransactionArgument<number>,
            RawTransactionArgument<number | bigint>
        ];
    }) {
        const argumentsTypes = [
            "u32",
            "u256"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "events",
            function: "emit_invalid_blob_id",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function emit_blob_deleted(options: {
        arguments: [
            RawTransactionArgument<number>,
            RawTransactionArgument<number | bigint>,
            RawTransactionArgument<number>,
            RawTransactionArgument<string>,
            RawTransactionArgument<boolean>
        ];
    }) {
        const argumentsTypes = [
            "u32",
            "u256",
            "u32",
            "0000000000000000000000000000000000000000000000000000000000000002::object::ID",
            "bool"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "events",
            function: "emit_blob_deleted",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function emit_epoch_change_start(options: {
        arguments: [
            RawTransactionArgument<number>
        ];
    }) {
        const argumentsTypes = [
            "u32"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "events",
            function: "emit_epoch_change_start",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function emit_epoch_change_done(options: {
        arguments: [
            RawTransactionArgument<number>
        ];
    }) {
        const argumentsTypes = [
            "u32"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "events",
            function: "emit_epoch_change_done",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function emit_shards_received(options: {
        arguments: [
            RawTransactionArgument<number>,
            RawTransactionArgument<number[]>
        ];
    }) {
        const argumentsTypes = [
            "u32",
            "vector<u16>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "events",
            function: "emit_shards_received",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function emit_epoch_parameters_selected(options: {
        arguments: [
            RawTransactionArgument<number>
        ];
    }) {
        const argumentsTypes = [
            "u32"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "events",
            function: "emit_epoch_parameters_selected",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function emit_shard_recovery_start(options: {
        arguments: [
            RawTransactionArgument<number>,
            RawTransactionArgument<number[]>
        ];
    }) {
        const argumentsTypes = [
            "u32",
            "vector<u16>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "events",
            function: "emit_shard_recovery_start",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    return { emit_blob_registered, emit_blob_certified, emit_invalid_blob_id, emit_blob_deleted, emit_epoch_change_start, emit_epoch_change_done, emit_shards_received, emit_epoch_parameters_selected, emit_shard_recovery_start };
}