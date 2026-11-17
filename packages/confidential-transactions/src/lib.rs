use fastcrypto::bulletproofs::{Range, RangeProof};
use fastcrypto::groups::Scalar;
use fastcrypto::groups::ristretto255::RistrettoScalar;
use fastcrypto::pedersen::PedersenCommitment;
use fastcrypto::twisted_elgamal::{Ciphertext, PrivateKey, PublicKey, precompute_table};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn prove(value: u64, blinding: &[u8], range: u8) -> Result<Vec<u8>, JsError> {
    let blinding = bcs::from_bytes(&blinding)
        .map_err(|e| JsError::new(&format!("Invalid blinding: {}", e)))?;
    let range = map_range(range)?;
    let proof = RangeProof::prove(value, &blinding, &range, &[], &mut rand::thread_rng())
        .map_err(|e| JsError::new(&format!("Failed to create range proof: {}", e)))?;
    bcs::to_bytes(&proof)
        .map_err(|e| JsError::new(&format!("Failed to serialize range proof: {}", e)))
}

#[wasm_bindgen]
pub fn verify(proof_bytes: &[u8], commitment_bytes: &[u8], range: u8) -> Result<bool, JsError> {
    let proof: RangeProof = bcs::from_bytes(proof_bytes)
        .map_err(|e| JsError::new(&format!("Invalid proof bytes: {}", e)))?;
    let commitment: PedersenCommitment = bcs::from_bytes(commitment_bytes)
        .map_err(|e| JsError::new(&format!("Invalid commitment bytes: {}", e)))?;
    let range = map_range(range)?;
    proof
        .verify(&commitment, &range, &[], &mut rand::thread_rng())
        .map_err(|e| JsError::new(&format!("Failed to verify range proof: {}", e)))?;
    Ok(true)
}

#[wasm_bindgen]
pub fn commit(value: u64, blinding: &[u8]) -> Result<Vec<u8>, JsError> {
    let blinding = bcs::from_bytes(&blinding)
        .map_err(|e| JsError::new(&format!("Invalid blinding: {}", e)))?;
    bcs::to_bytes(&PedersenCommitment::from_blinding(
        &RistrettoScalar::from(value),
        &blinding,
    ))
    .map_err(|e| JsError::new(&format!("Failed to serialize commitment: {}", e)))
}

#[wasm_bindgen]
pub fn generate_private_key() -> Result<Vec<u8>, JsError> {
    bcs::to_bytes(&RistrettoScalar::rand(&mut rand::thread_rng()))
        .map_err(|e| JsError::new(&format!("Failed to serialize blinding: {}", e)))
}

#[wasm_bindgen]
pub fn pk_from_sk(sk_bytes: &[u8]) -> Result<Vec<u8>, JsError> {
    let sk = bcs::from_bytes::<PrivateKey>(sk_bytes)
        .map_err(|e| JsError::new(&format!("Invalid secret key: {}", e)))?;
    bcs::to_bytes(&fastcrypto::twisted_elgamal::pk_from_sk(&sk))
        .map_err(|e| JsError::new(&format!("Failed to serialize public key: {}", e)))
}

#[wasm_bindgen]
pub fn encrypt(public_key: &[u8], value: u32) -> Result<JsValue, JsError> {
    let public_key: PublicKey = bcs::from_bytes(public_key)
        .map_err(|e| JsError::new(&format!("Invalid public key: {}", e)))?;
    let (ciphertext, blinding) = Ciphertext::encrypt(&public_key, value, &mut rand::thread_rng());
    Ok(serde_wasm_bindgen::to_value(&(
        bcs::to_bytes(&ciphertext)
            .map_err(|e| JsError::new(&format!("Failed to serialize ciphertext: {}", e)))?,
        bcs::to_bytes(&blinding)
            .map_err(|e| JsError::new(&format!("Failed to serialize blinding: {}", e)))?,
    ))?)
}

#[wasm_bindgen]
pub fn decrypt(
    secret_key: &[u8],
    ciphertext_bytes: &[u8],
    dlog_table: JsValue,
) -> Result<u32, JsError> {
    let secret_key: PrivateKey = bcs::from_bytes(secret_key)
        .map_err(|e| JsError::new(&format!("Invalid secret key: {}", e)))?;
    let ciphertext: Ciphertext = bcs::from_bytes(ciphertext_bytes)
        .map_err(|e| JsError::new(&format!("Invalid ciphertext bytes: {}", e)))?;
    let table = serde_wasm_bindgen::from_value::<HashMap<[u8; 32], u16>>(dlog_table)?;
    ciphertext
        .decrypt(&secret_key, &table)
        .map_err(|e| JsError::new(&format!("Failed to decrypt ciphertext: {}", e)))
}

#[wasm_bindgen]
pub fn precompute_dlog_table() -> Result<JsValue, JsError> {
    let table = precompute_table();
    serde_wasm_bindgen::to_value(&table)
        .map_err(|e| JsError::new(&format!("Failed to serialize precomputed table: {}", e)))
}

fn map_range(upper_bound: u8) -> Result<Range, JsError> {
    match upper_bound {
        8 => Ok(Range::Bits8),
        16 => Ok(Range::Bits16),
        32 => Ok(Range::Bits32),
        64 => Ok(Range::Bits64),
        _ => Err(JsError::new("Unsupported range upper bound")),
    }
}
