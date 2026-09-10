# eventsource-parser

Vendored from [rexxars/eventsource-parser](https://github.com/rexxars/eventsource-parser) at commit
[`6519a0f70dfeb22f829e5c696da2cb4988d64c6a`](https://github.com/rexxars/eventsource-parser/tree/6519a0f70dfeb22f829e5c696da2cb4988d64c6a).

Licensed under MIT; the upstream copyright notice and license are in [LICENSE](./LICENSE).

This directory contains the upstream parser, types, and errors. The parser tests and their fixtures
are in `test/unit/graphql/eventsource-parser/`.

Local changes:

- Added source attribution comments.
- Changed TypeScript import extensions to `.js` and adjusted test import paths.
- Applied repository formatting.
- Added the opt-in `dispatchEmptyData` option to dispatch named events without data fields, as
  required for GraphQL-over-SSE `complete` events. Default SSE behavior is unchanged.
- Replaced the upstream test-only `eventsource-encoder` dependency with small fixture helpers.
