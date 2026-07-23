---
'@mysten/codegen': minor
---

Add a per-package `configArguments` codegen option for mapping function parameters and package
addresses to a runtime config object. Matchers reference types as `module::Type` for the
package's own types, `@pkg/name::module::Type` for dependency packages from the codegen config,
or by explicit address, and support type matchers, per-function matchers
(`{ function, parameterName | parameterIndex }`), and multi-matcher keys. Matched parameters
become optional in generated `arguments` and resolve from a typed optional `config` object; keys
binding multiple distinct types (or generics) are typed as resolver functions receiving the
parameter's instantiation and call-site metadata. Each package emits a
`config-arguments.ts` convenience interface. Also treat `0x2::accumulator::AccumulatorRoot` as a
well-known object that is auto-injected like `Clock`.
