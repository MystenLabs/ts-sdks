# Move Bytecode Template

Move Bytecode Template allows updating a pre-compiled bytecode, so that a standard template could be
customized and used to publish new modules on Sui directly in the browser. Hence, removing the need
for a backend to compile new modules.

This crate builds a WASM binary for the `move-language/move-binary-format` allowing bytecode
serialization and deserialization in various environments. The main target for this package is
"web".

## Applications

This package is a perfect fit for the following applications:

- Publishing new Coins
- Publishing TransferPolicies
- Initializing any base type with a custom sub-type

## Example of a Template Module

The following code is a close-copy of the `Coin` example from the
[Coins and Tokens](https://docs.sui.io/guides/developer/coin).

```move
module 0x0::template {
    use std::option;
    use sui::coin;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    /// The OTW for the Coin
    struct TEMPLATE has drop {}

    const DECIMALS: u8 = 6;
    const SYMBOL: vector<u8> = b"TMPL";
    const NAME: vector<u8> = b"Template Coin";
    const DESCRIPTION: vector<u8> = b"Template Coin Description";

    /// Init the Coin
    fun init(witness: TEMPLATE, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness, DECIMALS, SYMBOL, NAME, DESCRIPTION, option::none(), ctx
        );

        transfer::public_transfer(treasury, tx_context::sender(ctx));
        transfer::public_transfer(metadata, tx_context::sender(ctx));
    }
}
```

To update the identifiers, you can use the `update_identifiers` function.

```ts
import { fromHex, update_identifiers } from '@mysten/move-bytecode-template';

let bytecode = /* ... */;
let updated = update_identifiers(bytecode, {
    "TEMPLATE": "MY_MODULE",
    "template": "my_module"
});

console.assert(updated != bytecode, 'identifiers were not updated!');
```

To update constants in the bytecode, you can use the `update_constants` function. For each constant
you need to supply new value as BCS bytes, existing value as BCS, and the type of the constant (as a
string: `U8`, `U16` ... `U256`, `Address`, `Vector(U8)` and so on).

```ts
import { bcs } from '@mysten/bcs';
import * as template from '@mysten/move-bytecode-template';

// please, manually scan the existing values, this operation is very sensitive
console.log(template.get_constants(bytecode));

let updated;

// Update DECIMALS
updated = update_constants(
	bytecode,
	bcs.u8().serialize(3).toBytes(), // new value
	bcs.u8().serialize(6).toBytes(), // current value
	'U8', // type of the constant
);

// Update SYMBOL
updated = update_constants(
	updated,
	bcs.string().serialize('MYC').toBytes(), // new value
	bcs.string().serialize('TMPL').toBytes(), // current value
	'Vector(U8)', // type of the constant
);

// Update NAME
updated = update_constants(
	updated,
	bcs.string().serialize('My Coin').toBytes(), // new value
	bcs.string().serialize('Template Coin').toBytes(), // current value
	'Vector(U8)', // type of the constant
);
```

After updating the bytecode, refer to the
[Asset Tokenization](https://docs.sui.io/guides/developer/nft/asset-tokenization#closer-view-of-the-template-module)
guide to deploy the contract.

## Usage in Web applications

In some bundler and web applications you will need to set up and initialize the wasm bindings. The
exact requirements depend on how your application is being built.

The `@mysten/move-bytecode-template` has 2 relevant exports you might need to get things working
correctly.

- `init` is an exported function that initializes the wasm module in browser environments (a no-op
  function is exported when running in node so you can use this anywhere)
- `/web/walrus_wasm_bg.wasm` is an export of the wasm module itself, which may be needed in some
  bundlers to know where to import the wasm module from

### Initializing in webpack and nodejs

In webpack and nodejs you should be able to initialize the wasm module without specifying the
location of the wasm module:

```ts
import init, * as template from '@mysten/move-bytecode-template';

await init();

const json = template.deserialize(fromHex('a11ceb0b06....'));
const bytes = template.serialize(json);
```

## Vite

In vite (and some other bundlers) you may need to disable certain optimizations so the wasm module
can be loaded correctly. You can add something like this to your vite config:

```ts
export default defineConfig({
	optimizeDeps: {
		exclude: ['@mysten/walrus-wasm'],
	},
});
```

## Initializing wasm with a url

If initialization fails without the url, you may need to specify a url where the wasm module can be
loaded. Some bundlers support a `?url` suffix for imports that will return a url where the resource
can be loaded from:

```ts
import init, * as template from '@mysten/move-bytecode-template';
import url from '@mysten/move-bytecode-template/web/move_bytecode_template_bg.wasm?url';

await init({ module_or_path: url });
```

## Build locally

To build the binary, you need to have Rust installed and then the `wasm-pack`. The installation
script [can be found here](https://rustwasm.github.io/wasm-pack/).

```
pnpm build:wasm
```

## Running tests

After building tests can be run with

```
pnpm test
```
