# Documentation Style Guide

## Frontmatter

Every MDX file must have YAML frontmatter with `title` and `description`:

```mdx
---
title: Sui Programmable Transaction Basics
description: Construct programmable transaction blocks with the Transaction API
---
```

Rules:

- `title`: Descriptive, title-case. Appears in navigation and page header.
- `description`: Single sentence, under 120 characters, no trailing period. Used in LLM index.
- No other frontmatter fields are required (fumadocs handles the rest).

## Writing Style

### Audience

SDK developers building Sui applications in TypeScript. Assume familiarity with TypeScript and npm/pnpm but not with Sui-specific concepts.

### Tone

- Direct and concise — get to the point quickly
- Show code first, explain after
- Use "you" sparingly — prefer imperative instructions
- Avoid marketing language — focus on what the API does

### Structure

1. Start with the most common use case
2. Show a minimal working example immediately
3. Explain parameters and options after the example
4. Add advanced patterns and edge cases later
5. End with related pages or next steps

### Code Examples

Use fenced code blocks with `tsx` or `typescript` language tag:

````mdx
```tsx
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();
const [coin] = tx.splitCoins(tx.gas, [1_000_000_000]);
tx.transferObjects([coin], recipientAddress);
```
````

Rules for code examples:

- Always show imports — readers copy-paste
- Use public API paths: `@mysten/sui/transactions`, not `../src/transactions`
- Include type annotations when they clarify usage
- Use meaningful variable names (`tx`, `client`, `keypair`, not `a`, `b`, `c`)
- Show the happy path first, then error handling
- Use `// comments` to explain non-obvious lines
- Prefer `const` over `let`
- Use `async/await` over `.then()` chains

### Headings

- H1 (`#`): Page title (matches frontmatter `title`) — only one per page
- H2 (`##`): Major sections
- H3 (`###`): Subsections within H2
- H4 (`####`): Rarely needed — consider restructuring

### Links

Link to other docs pages using relative paths:

```mdx
See [Transaction Building](../transaction-building/basics.mdx) for more details.
```

Link to API types inline:

```mdx
The `ClientWithCoreApi` type from `@mysten/sui/client` provides...
```

### Tables

Use for parameter references and option comparisons:

```mdx
| Parameter     | Type          | Description                |
| ------------- | ------------- | -------------------------- |
| `signer`      | `Keypair`     | The keypair to sign with   |
| `transaction` | `Transaction` | The transaction to execute |
```

## MDX Features

### Callouts / Admonitions

Use fumadocs callout syntax for warnings and notes:

```mdx
<Callout type="warn">
	This method is deprecated. Use `client.core.executeTransaction` instead.
</Callout>

<Callout type="info">Gas budget is automatically estimated if not specified.</Callout>
```

### Auto Type Tables

The docs use `fumadocs-typescript` for auto-generated type tables. When documenting a TypeScript interface, use the `<AutoTypeTable>` component:

```mdx
<AutoTypeTable path="@mysten/sui" name="TransactionOptions" />
```

### Tabs

For showing multiple approaches:

```mdx
<Tabs items={['gRPC', 'JSON-RPC', 'GraphQL']}>
	<Tab value="gRPC">...</Tab>
</Tabs>
```

## Common Patterns

### Package Overview Page (index.mdx)

```mdx
---
title: Payment Kit
description: Accept payments in any coin type on Sui
---

Brief overview of what the package does (2-3 sentences).

## Installation

\`\`\`npm
pnpm add @mysten/payment-kit
\`\`\`

## Quick Start

\`\`\`tsx
// Minimal working example
\`\`\`

## Key Concepts

Explain the main abstractions.

## Next Steps

- [Getting Started](./getting-started.mdx)
- [API Reference](./api-reference.mdx)
```

### API Method Documentation

```mdx
## methodName

Brief description of what it does.

\`\`\`tsx
const result = await client.core.methodName({
param1: value1,
param2: value2,
});
\`\`\`

### Parameters

| Parameter | Type     | Required | Description      |
| --------- | -------- | -------- | ---------------- |
| `param1`  | `string` | Yes      | What param1 does |
| `param2`  | `number` | No       | What param2 does |

### Returns

Description of the return type with an example of how to use it.
```

### Migration Guide

```mdx
## Before (v1)

\`\`\`tsx
// Old code
\`\`\`

## After (v2)

\`\`\`tsx
// New code
\`\`\`

Key changes:

- Change 1
- Change 2
```
