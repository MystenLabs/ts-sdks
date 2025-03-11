# MVR SDK

The mvr SDK is a TypeScript SDK for the Move Registry (mvr) which helps you generate a static file for MVR resolution.
This can be used to cache all MVR names for performance & security reasons, and used in the `NamedPackagesPlugin` in your project.

## Usage

### Generate a static file for MVR resolution

You can generate your static file by running the following command:

```bash
pnpm dlx @mysten/mvr
```

Available options:

- `-d <directory>`: The directory to run the command in (defaults to `.`)
- `-f <output-file>`: The output's file name (defaults to `mvr.ts`)


### Use the static file in your project

Once you have your static file, you can use it in your project by importing it and passing it to the `NamedPackagesPlugin` in your project.

```ts
import { getMvrCache } from './mvr.ts';

// create a cache for your network.
const cache = getMvrCache('mainnet');

const plugin = new NamedPackagesPlugin({
  // ...,
  overrides: cache,
});
```
