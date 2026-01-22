
let imports = {};
imports['__wbindgen_placeholder__'] = module.exports;

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

function decodeText(ptr, len) {
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}
/**
 * @param {bigint} value
 * @param {Uint8Array} blinding
 * @param {number} range
 * @returns {Uint8Array}
 */
exports.prove = function(value, blinding, range) {
    const ptr0 = passArray8ToWasm0(blinding, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.prove(value, ptr0, len0, range);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
};

/**
 * @param {bigint} value
 * @param {Uint8Array} blinding
 * @returns {Uint8Array}
 */
exports.commit = function(value, blinding) {
    const ptr0 = passArray8ToWasm0(blinding, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.commit(value, ptr0, len0);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
};

/**
 * @param {Uint8Array} proof_bytes
 * @param {Uint8Array} commitment_bytes
 * @param {number} range
 * @returns {boolean}
 */
exports.verify = function(proof_bytes, commitment_bytes, range) {
    const ptr0 = passArray8ToWasm0(proof_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(commitment_bytes, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.verify(ptr0, len0, ptr1, len1, range);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
};

exports.__wbg_Error_e83987f665cf5504 = function(arg0, arg1) {
    const ret = Error(getStringFromWasm0(arg0, arg1));
    return ret;
};

exports.__wbg___wbindgen_is_function_ee8a6c5833c90377 = function(arg0) {
    const ret = typeof(arg0) === 'function';
    return ret;
};

exports.__wbg___wbindgen_is_object_c818261d21f283a4 = function(arg0) {
    const val = arg0;
    const ret = typeof(val) === 'object' && val !== null;
    return ret;
};

exports.__wbg___wbindgen_is_string_fbb76cb2940daafd = function(arg0) {
    const ret = typeof(arg0) === 'string';
    return ret;
};

exports.__wbg___wbindgen_is_undefined_2d472862bd29a478 = function(arg0) {
    const ret = arg0 === undefined;
    return ret;
};

exports.__wbg___wbindgen_throw_b855445ff6a94295 = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

exports.__wbg_call_525440f72fbfc0ea = function() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.call(arg1, arg2);
    return ret;
}, arguments) };

exports.__wbg_call_e762c39fa8ea36bf = function() { return handleError(function (arg0, arg1) {
    const ret = arg0.call(arg1);
    return ret;
}, arguments) };

exports.__wbg_crypto_574e78ad8b13b65f = function(arg0) {
    const ret = arg0.crypto;
    return ret;
};

exports.__wbg_getRandomValues_b8f5dbd5f3995a9e = function() { return handleError(function (arg0, arg1) {
    arg0.getRandomValues(arg1);
}, arguments) };

exports.__wbg_length_69bca3cb64fc8748 = function(arg0) {
    const ret = arg0.length;
    return ret;
};

exports.__wbg_msCrypto_a61aeb35a24c1329 = function(arg0) {
    const ret = arg0.msCrypto;
    return ret;
};

exports.__wbg_new_no_args_ee98eee5275000a4 = function(arg0, arg1) {
    const ret = new Function(getStringFromWasm0(arg0, arg1));
    return ret;
};

exports.__wbg_new_with_length_01aa0dc35aa13543 = function(arg0) {
    const ret = new Uint8Array(arg0 >>> 0);
    return ret;
};

exports.__wbg_node_905d3e251edff8a2 = function(arg0) {
    const ret = arg0.node;
    return ret;
};

exports.__wbg_process_dc0fbacc7c1c06f7 = function(arg0) {
    const ret = arg0.process;
    return ret;
};

exports.__wbg_prototypesetcall_2a6620b6922694b2 = function(arg0, arg1, arg2) {
    Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
};

exports.__wbg_randomFillSync_ac0988aba3254290 = function() { return handleError(function (arg0, arg1) {
    arg0.randomFillSync(arg1);
}, arguments) };

exports.__wbg_require_60cc747a6bc5215a = function() { return handleError(function () {
    const ret = module.require;
    return ret;
}, arguments) };

exports.__wbg_static_accessor_GLOBAL_89e1d9ac6a1b250e = function() {
    const ret = typeof global === 'undefined' ? null : global;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
};

exports.__wbg_static_accessor_GLOBAL_THIS_8b530f326a9e48ac = function() {
    const ret = typeof globalThis === 'undefined' ? null : globalThis;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
};

exports.__wbg_static_accessor_SELF_6fdf4b64710cc91b = function() {
    const ret = typeof self === 'undefined' ? null : self;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
};

exports.__wbg_static_accessor_WINDOW_b45bfc5a37f6cfa2 = function() {
    const ret = typeof window === 'undefined' ? null : window;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
};

exports.__wbg_subarray_480600f3d6a9f26c = function(arg0, arg1, arg2) {
    const ret = arg0.subarray(arg1 >>> 0, arg2 >>> 0);
    return ret;
};

exports.__wbg_versions_c01dfd4722a88165 = function(arg0) {
    const ret = arg0.versions;
    return ret;
};

exports.__wbindgen_cast_2241b6af4c4b2941 = function(arg0, arg1) {
    // Cast intrinsic for `Ref(String) -> Externref`.
    const ret = getStringFromWasm0(arg0, arg1);
    return ret;
};

exports.__wbindgen_cast_cb9088102bce6b30 = function(arg0, arg1) {
    // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
    const ret = getArrayU8FromWasm0(arg0, arg1);
    return ret;
};

exports.__wbindgen_init_externref_table = function() {
    const table = wasm.__wbindgen_externrefs;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
    ;
};

const wasmPath = `${__dirname}/confidential_transactions_bg.wasm`;
const wasmBytes = require('fs').readFileSync(wasmPath);
const wasmModule = new WebAssembly.Module(wasmBytes);
const wasm = exports.__wasm = new WebAssembly.Instance(wasmModule, imports).exports;

wasm.__wbindgen_start();

