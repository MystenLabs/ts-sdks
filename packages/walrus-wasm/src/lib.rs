use wasm_bindgen::prelude::*;

mod bls12381;
mod encoder;
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}
