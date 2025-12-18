// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Type declarations for the Node.js entry point (index.mjs)
// Node.js wasm-pack builds don't require async initialization

export * from './nodejs/move_bytecode_template.js';

// No-op init for Node.js compatibility (wasm is loaded synchronously)
// Accepts optional argument for API compatibility with web version (ignored in Node.js)
export default function init(options?: { module_or_path?: unknown }): void;
