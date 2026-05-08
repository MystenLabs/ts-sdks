# Deepbook TypeScript SDK

## Example secrets

Examples that sign transactions read `PRIVATE_KEY` from the process environment. Pass secrets from
your shell or a managed secret injector when running an example, and do not store long-lived private
keys in `.env` files.

```bash
PRIVATE_KEY=suiprivkey1... pnpm tsx examples/useDeepbookClient.ts
```
