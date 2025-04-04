const wasm = require('./walrus_wasm.js');
function init() {}
module.exports = init;
Object.assign(module.exports, wasm, { default: init });
