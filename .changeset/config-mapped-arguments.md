---
'@mysten/codegen': minor
---

Add `configArguments` codegen option for mapping function parameters and package addresses to a
runtime config object. Matched parameters become optional in generated `arguments` and are resolved
from a typed optional `config` object instead, with per-function minimal config slices, resolver
functions for generic types (receiving the matched parameter's normalized instantiation and
call-site metadata), and a generated per-package config interface in `config-arguments.ts`.
Misconfigured matchers are surfaced at generation time. Also treat
`0x2::accumulator::AccumulatorRoot` as a well-known object that is auto-injected like `Clock`.
