use fastcrypto::bulletproofs::{Range, RangeProof};
use fastcrypto::groups::ristretto255::RistrettoScalar;
use fastcrypto::pedersen::PedersenCommitment;
use wasm_bindgen::JsError;
use wasm_bindgen::prelude::wasm_bindgen;

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
        .verify(&commitment, &range, &[])
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

fn map_range(upper_bound: u8) -> Result<Range, JsError> {
    match upper_bound {
        8 => Ok(Range::Bits8),
        16 => Ok(Range::Bits16),
        32 => Ok(Range::Bits32),
        64 => Ok(Range::Bits64),
        _ => Err(JsError::new("Unsupported range upper bound")),
    }
}
