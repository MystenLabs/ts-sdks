---
'@mysten/wallet-sdk': minor
'@mysten-incubation/sponsor': minor
---

Add explicit transaction analyzer result statuses and support optional analyzer dependencies.

Analyzer results now include `status`, top-level analysis includes an overall status, and
`optional(analyzer)` lets aggregate analyzers inspect another analyzer's full result without being
skipped when that optional dependency cannot run. Sponsor validation now uses this to preserve
policy rejections from validators that ran while separately reporting analysis failures from
validators that could not run.
