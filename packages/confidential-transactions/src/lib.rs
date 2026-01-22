use wasm_bindgen::prelude::*;

mod bulletproofs;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}
