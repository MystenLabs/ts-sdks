---
'@mysten/sui': minor
---

Add `listTransactions` and `listEvents` core API methods for querying transactions and events with filters, pagination, and ordering. The methods behave identically across the gRPC, GraphQL, and JSON-RPC transports. The regenerated gRPC protos also add the new `SubscribeTransactions` and `SubscribeEvents` subscription APIs.

The `TransactionKind` BCS schema exported from `@mysten/sui/bcs` now fully parses system transactions: the previously-unparseable placeholder variants (`ChangeEpoch`, `Genesis`, `ConsensusCommitPrologue`) have typed payloads, and the missing system variants (`AuthenticatorStateUpdate`, `EndOfEpochTransaction`, `RandomnessStateUpdate`, `ConsensusCommitPrologueV2`–`V4`, and `ProgrammableSystemTransaction`) were added. JSON-RPC `getTransaction` also no longer reports the genesis transaction's placeholder signature, matching the other transports.
