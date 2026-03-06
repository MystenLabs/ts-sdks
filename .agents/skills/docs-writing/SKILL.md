---
name: docs-writing
description: 'Write and maintain SDK documentation in packages/docs/content/. Use when adding new doc pages, updating existing docs, or modifying the documentation structure. Ensures frontmatter, meta.json, and LLM index stay in sync.'
---

# SDK Documentation Writing

Write documentation for the Sui TypeScript SDK ecosystem in `packages/docs/content/`. All docs are MDX files organized by package, rendered by fumadocs, and exported as flat markdown for LLM consumption.

## Before Writing

1. Read the relevant `meta.json` to understand the section structure.
2. Check existing pages in the same section for style and conventions.
3. Read [references/structure.md](references/structure.md) for directory layout and meta.json format.
4. Read [references/style-guide.md](references/style-guide.md) for writing conventions.

## Creating a New Doc Page

1. Create the `.mdx` file in the appropriate `content/` subdirectory.
2. Add YAML frontmatter with both `title` and `description` (required):

```mdx
---
title: My New Feature
description: Short one-line description under 120 characters
---

Content goes here...
```

3. Add the page name to the parent `meta.json` `pages` array in the correct order.
4. If creating a new section directory, create a `meta.json` with `title` and `pages`.
5. Regenerate the LLM index: `pnpm --filter @mysten/docs build:docs`
6. Validate: `pnpm --filter @mysten/docs validate-docs`

## Editing Existing Docs

1. Read the full page before editing — understand context.
2. Keep the `description` frontmatter accurate after changes.
3. After significant structural changes, regenerate and validate:
   ```npm
   pnpm --filter @mysten/docs build:docs
   npx tsx packages/docs/scripts/generate-llms-index.ts --check
   ```

## Key Rules

1. **Every MDX file must have `title` and `description`** — CI validates this.
2. **Descriptions under 120 characters** — used in the LLM index.
3. **No trailing period** on descriptions.
4. **Use code examples liberally** — show, don't tell.
5. **Import from public API paths** — `@mysten/sui/transactions`, not internal paths.
6. **Use fenced code blocks** with `tsx` or `typescript` language tag.
7. **Every new page must be in a `meta.json` `pages` array** — or it won't appear in navigation.
8. **`dist/` is generated at build time** — not committed to git. Run `build:docs` to verify output locally.

## Common Mistakes — STOP

- Adding an MDX file without updating `meta.json` → Page won't appear in navigation or index
- Missing `description` in frontmatter → CI validation will fail
- Using internal import paths → Readers won't be able to use them
- Using JSX components without imports → MDX build will fail
- Adding a new section directory without `meta.json` → Pages won't be indexed

## Navigation

- **[Directory Structure](references/structure.md)** — Content layout, meta.json format, how pages are organized by package
- **[Style Guide](references/style-guide.md)** — Writing conventions, MDX features, code example patterns

## Build Commands

```npm
# Generate LLM index + flat markdown
pnpm --filter @mysten/docs build:docs

# Check index is up to date
npx tsx packages/docs/scripts/generate-llms-index.ts --check

# Validate frontmatter + dead links
pnpm --filter @mysten/docs validate-docs

# Full site build (Next.js)
pnpm --filter @mysten/docs build
```
