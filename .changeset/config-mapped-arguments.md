---
'@mysten/codegen': minor
---

Add `configArguments` codegen option for mapping function parameters and package addresses to a
runtime config object. Matchers are network-agnostic (`module::Type`, `@pkg/name::module::Type`
using identifiers from the `packages` config, or framework `0x1`-`0x3`) and support type matchers,
per-function matchers (`{ function, parameterName | parameterIndex }`), and multi-matcher keys.
Matched parameters become optional in generated `arguments` and resolve from a typed optional
`config` object; keys binding multiple distinct types (or generics) are typed as resolver
functions receiving the parameter's normalized instantiation and call-site metadata. Each package
emits a `config-arguments.ts` convenience interface. Also treat
`0x2::accumulator::AccumulatorRoot` as a well-known object that is auto-injected like `Clock`.
