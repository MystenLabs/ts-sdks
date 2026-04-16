---
'@mysten/codegen': patch
---

Fix codegen to stop exposing non-`key` Move datatypes as raw object IDs.

- Non-`key` struct and enum arguments now render as `RawTransactionArgument<never>` instead of `RawTransactionArgument<string>`, so only `TransactionArgument` values from prior Move calls are accepted.
- A vector or option of a non-`key` datatype collapses the whole parameter to `RawTransactionArgument<never>`, matching what the runtime can actually serialize.
- Generated `argumentsTypes` entries now carry the canonical Move type tag for `key` datatypes (e.g. `'0x..::counter::Counter'`) instead of `null`, so the runtime can validate the shape.
- `normalizeMoveArguments` no longer coerces arbitrary strings into `tx.object(...)` when the parameter type is unknown (`argType === null`); a bare string is only accepted when the codegen knows the parameter is an object.
- `summaryFromDeserializedModule` now decodes ability bit flags from the deserialized module, so programmatic codegen preserves `Key`/`Store`/`Copy`/`Drop` abilities on structs, enums, and type parameters instead of dropping them to `[]`.
