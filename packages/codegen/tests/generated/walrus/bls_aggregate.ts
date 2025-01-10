import { bcs } from "@mysten/sui/bcs";
import { type Transaction } from "@mysten/sui/transactions";
import { normalizeMoveArguments, type RawTransactionArgument } from "../utils/index.ts";
import * as group_ops from "./deps/0000000000000000000000000000000000000000000000000000000000000002/group_ops";
export function BlsCommitteeMember() {
    return bcs.struct("BlsCommitteeMember", ({
        public_key: group_ops.Element(),
        weight: bcs.u16(),
        node_id: bcs.Address
    }));
}
export function BlsCommittee() {
    return bcs.struct("BlsCommittee", ({
        members: bcs.vector(BlsCommitteeMember()),
        n_shards: bcs.u16(),
        epoch: bcs.u32()
    }));
}
export function init(packageAddress: string) {
    function new_bls_committee(options: {
        arguments: [
            RawTransactionArgument<number>,
            RawTransactionArgument<string[]>
        ];
    }) {
        const argumentsTypes = [
            "u32",
            "vector<0000000000000000000000000000000000000000000000000000000000000000::bls_aggregate::BlsCommitteeMember>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "bls_aggregate",
            function: "new_bls_committee",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function new_bls_committee_member(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000002::group_ops::Element<0000000000000000000000000000000000000000000000000000000000000002::bls12381::G1>",
            "u16",
            "0000000000000000000000000000000000000000000000000000000000000002::object::ID"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "bls_aggregate",
            function: "new_bls_committee_member",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function node_id(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::bls_aggregate::BlsCommitteeMember"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "bls_aggregate",
            function: "node_id",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function epoch(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::bls_aggregate::BlsCommittee"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "bls_aggregate",
            function: "epoch",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function n_shards(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::bls_aggregate::BlsCommittee"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "bls_aggregate",
            function: "n_shards",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function get_idx(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number | bigint>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::bls_aggregate::BlsCommittee",
            "u64"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "bls_aggregate",
            function: "get_idx",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function contains(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::bls_aggregate::BlsCommittee",
            "0000000000000000000000000000000000000000000000000000000000000002::object::ID"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "bls_aggregate",
            function: "contains",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function get_member_weight(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::bls_aggregate::BlsCommittee",
            "0000000000000000000000000000000000000000000000000000000000000002::object::ID"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "bls_aggregate",
            function: "get_member_weight",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function find_index(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::bls_aggregate::BlsCommittee",
            "0000000000000000000000000000000000000000000000000000000000000002::object::ID"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "bls_aggregate",
            function: "find_index",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function to_vec_map(options: {
        arguments: [
            RawTransactionArgument<string>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::bls_aggregate::BlsCommittee"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "bls_aggregate",
            function: "to_vec_map",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function verify_quorum_in_epoch(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number[]>,
            RawTransactionArgument<number[]>,
            RawTransactionArgument<number[]>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::bls_aggregate::BlsCommittee",
            "vector<u8>",
            "vector<u16>",
            "vector<u8>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "bls_aggregate",
            function: "verify_quorum_in_epoch",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function verify_quorum(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::bls_aggregate::BlsCommittee",
            "u16"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "bls_aggregate",
            function: "verify_quorum",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    function verify_certificate(options: {
        arguments: [
            RawTransactionArgument<string>,
            RawTransactionArgument<number[]>,
            RawTransactionArgument<number[]>,
            RawTransactionArgument<number[]>
        ];
    }) {
        const argumentsTypes = [
            "0000000000000000000000000000000000000000000000000000000000000000::bls_aggregate::BlsCommittee",
            "vector<u8>",
            "vector<u16>",
            "vector<u8>"
        ];
        return (tx: Transaction) => tx.moveCall({
            package: packageAddress,
            module: "bls_aggregate",
            function: "verify_certificate",
            arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        });
    }
    return { new_bls_committee, new_bls_committee_member, node_id, epoch, n_shards, get_idx, contains, get_member_weight, find_index, to_vec_map, verify_quorum_in_epoch, verify_quorum, verify_certificate };
}