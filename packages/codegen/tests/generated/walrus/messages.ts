import { bcs } from "@mysten/sui/bcs";
import { type Transaction } from "@mysten/sui/transactions";
import { normalizeMoveArguments, type RawTransactionArgument } from "../utils/index.ts";
export function ProofOfPossessionMessage() {
    return bcs.struct("ProofOfPossessionMessage", ({
        intent_type: bcs.u8(),
        intent_version: bcs.u8(),
        intent_app: bcs.u8(),
        epoch: bcs.u32(),
        sui_address: bcs.Address,
        bls_key: bcs.vector(bcs.u8())
    }));
}
export function CertifiedMessage() {
    return bcs.struct("CertifiedMessage", ({
        intent_type: bcs.u8(),
        intent_version: bcs.u8(),
        cert_epoch: bcs.u32(),
        stake_support: bcs.u16(),
        message: bcs.vector(bcs.u8())
    }));
}
export function CertifiedBlobMessage() {
    return bcs.struct("CertifiedBlobMessage", ({
        epoch: bcs.u32(),
        blob_id: bcs.u256()
    }));
}
export function CertifiedInvalidBlobId() {
    return bcs.struct("CertifiedInvalidBlobId", ({
        epoch: bcs.u32(),
        blob_id: bcs.u256()
    }));
}
export function init(packageAddress: string) {
    function new_proof_of_possession_msg(options: {
        arguments: [
            RawTransactionArgument<number>,
            RawTransactionArgument<string>,
            RawTransactionArgument<number[]>
        ];
    }) {
        const argumentsTypes = [
            "u32",
            "address",
            "vector<u8>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "messages",
            function: "new_proof_of_possession_msg",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function to_bcs(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::messages::ProofOfPossessionMessage"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "messages",
            function: "to_bcs",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function verify_proof_of_possession(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number[]>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::messages::ProofOfPossessionMessage",
            "vector<u8>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "messages",
            function: "verify_proof_of_possession",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function new_certified_message(options: {
        arguments: [
            RawTransactionArgument<number[]>,
            RawTransactionArgument<number>,
            RawTransactionArgument<number>
        ];
    }) {
        const argumentsTypes = [
            "vector<u8>",
            "u32",
            "u16"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "messages",
            function: "new_certified_message",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function certify_blob_message(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::messages::CertifiedMessage"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "messages",
            function: "certify_blob_message",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function certified_event_blob_message(options: {
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
            module: "messages",
            function: "certified_event_blob_message",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function invalid_blob_id_message(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::messages::CertifiedMessage"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "messages",
            function: "invalid_blob_id_message",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function intent_type(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::messages::CertifiedMessage"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "messages",
            function: "intent_type",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function intent_version(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::messages::CertifiedMessage"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "messages",
            function: "intent_version",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function cert_epoch(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::messages::CertifiedMessage"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "messages",
            function: "cert_epoch",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function stake_support(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::messages::CertifiedMessage"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "messages",
            function: "stake_support",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function message(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::messages::CertifiedMessage"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "messages",
            function: "message",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function into_message(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::messages::CertifiedMessage"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "messages",
            function: "into_message",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function certified_epoch(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::messages::CertifiedBlobMessage"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "messages",
            function: "certified_epoch",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function certified_blob_id(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::messages::CertifiedBlobMessage"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "messages",
            function: "certified_blob_id",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function certified_invalid_epoch(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::messages::CertifiedInvalidBlobId"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "messages",
            function: "certified_invalid_epoch",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function invalid_blob_id(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::messages::CertifiedInvalidBlobId"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "messages",
            function: "invalid_blob_id",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    return { new_proof_of_possession_msg, to_bcs, verify_proof_of_possession, new_certified_message, certify_blob_message, certified_event_blob_message, invalid_blob_id_message, intent_type, intent_version, cert_epoch, stake_support, message, into_message, certified_epoch, certified_blob_id, certified_invalid_epoch, invalid_blob_id };
}