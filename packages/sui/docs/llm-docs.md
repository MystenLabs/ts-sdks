# LLM Documentation

> Give AI agents access to Sui SDK documentation in your project

Every `@mysten/*` package ships a `docs/` directory containing flat markdown files optimized for AI
agent consumption. When you install an SDK package, you automatically get accurate, up-to-date
documentation that coding agents (Claude Code, Cursor, Copilot, etc.) can read directly — no
separate install or training data required.

## How It Works

Each package includes:

- `docs/llms-index.md` — routing index listing all doc pages with descriptions
- `docs/*.md` — individual reference pages

For example, installing `@mysten/sui` gives you docs at
`node_modules/@mysten/sui/docs/llms-index.md`.

## Configure Your Agent

Add the following snippet to your agent's configuration file (`AGENTS.md`, `CLAUDE.md`,
`.cursorrules`, etc.):

```markdown
## Sui SDK Reference

Every @mysten/\* package ships LLM documentation in its `docs/` directory. When working with these
packages, find the relevant docs by looking for `docs/llms-index.md` files inside
`node_modules/@mysten/\*/`. Read the index first to find the page you need, then read that page for
details.
```
