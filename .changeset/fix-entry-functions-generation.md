---
'@mysten/codegen': patch
---

Fix hasFunctions() to respect privateMethods configuration

This change fixes a bug where modules with only entry functions (no types or public functions) were not being generated even when privateMethods was set to 'entry'. The hasFunctions() method now checks the #includedFunctions set instead of only looking for public functions, ensuring consistency with the privateMethods option added in version 0.5.0.
