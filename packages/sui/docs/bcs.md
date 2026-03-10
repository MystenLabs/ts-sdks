# BCS

> Binary Canonical Serialization for encoding Sui Move types

The `@mysten/sui/bcs` package extends `@mysten/bcs` with Sui specific scheme definitions.

To learn more about using BCS see the [BCS documentation](/bcs).

the `bcs` export of `@mysten/sui/bcs` contains all the same exports as `bcs` from `@mysten/bcs` plus
the following pre-defined schemes:

- `U8`
- `U16`
- `U32`
- `U64`
- `U128`
- `U256`
- `ULEB128`
- `Bool`
- `String`
- `Address`
- `Argument`
- `CallArg`
- `CompressedSignature`
- `GasData`
- `MultiSig`
- `MultiSigPkMap`
- `MultiSigPublicKey`
- `ObjectArg`
- `ObjectDigest`
- `ProgrammableMoveCall`
- `ProgrammableTransaction`
- `PublicKey`
- `SenderSignedData`
- `SharedObjectRef`
- `StructTag`
- `SuiObjectRef`
- `Transaction`
- `TransactionData`
- `TransactionDataV1`
- `TransactionExpiration`
- `TransactionKind`
- `TypeTag`
- `Object` - Complete object with data, owner, previousTransaction, and storageRebate
- `TransactionEffects` - Transaction execution effects (supports both V1 and V2)
- `TransactionEffectsV1` - Legacy transaction effects format
- `TransactionEffectsV2` - Current transaction effects format with detailed object changes

All the upper-cased values are `BcsType` instances, and can be used directly to parse and serialize
data.

```typescript
bcs.U8.serialize(1);
bcs.Address.serialize('0x1');
bcs.TypeTag.serialize({
	vector: {
		u8: true,
	},
});
```

## Working with Objects

To parse on-chain objects, fetch them with `include: { content: true }` and pass `object.content` to
a generated BCS type or a manual struct definition. The `content` field contains only the inner Move
struct bytes:

```typescript
const { object } = await client.core.getObject({
	objectId: '0x123...',
	include: { content: true },
});

const parsed = MyStruct.parse(object.content);
```

### `bcs.Object` — Full object envelope

The `bcs.Object` schema represents the complete on-chain object, including metadata (type, owner,
version, previous transaction, storage rebate) wrapping the inner struct bytes. This is what the
`objectBcs` include option returns. Most of this metadata is already available as fields on the
object response, so you typically only need `content`.

```typescript

// Parse a full object envelope (from objectBcs include option)
const envelope = bcs.Object.parse(object.objectBcs);
console.log('Owner:', envelope.owner);
console.log('Inner struct bytes:', envelope.data.Move.contents);

// Serialize a full object envelope
const serialized = bcs.Object.serialize({
	data: {
		Move: {
			type: { GasCoin: null },
			hasPublicTransfer: true,
			version: '1',
			contents: new Uint8Array([...]),
		},
	},
	owner: { AddressOwner: '0x...' },
	previousTransaction: '...',
	storageRebate: '1000',
});
```

> **Warning:** Do not pass `objectBcs` bytes to a Move struct parser — it contains wrapping metadata
> that will cause parsing to fail. Use `content` for parsing Move struct fields. See the
> [Core API docs](/sui/clients/core#objectbcs) for details.

## Working with Transaction Effects

The `bcs.TransactionEffects` schema can be used to parse transaction effects:

```typescript
// Parse transaction effects
const effects = bcs.TransactionEffects.parse(effectsBytes);

// Check execution status
if (effects.V2.status.$kind === 'Success') {
	console.log('Transaction succeeded');
} else {
	console.log('Transaction failed:', effects.V2.status.Failure.error);
}

// Access changed objects
for (const [objectId, change] of effects.V2.changedObjects) {
	console.log('Object:', objectId);
	console.log('Output state:', change.outputState.$kind);
}
```
