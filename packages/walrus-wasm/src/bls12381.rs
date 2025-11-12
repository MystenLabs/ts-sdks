use fastcrypto::bls12381::min_pk::BLS12381AggregateSignature;
use fastcrypto::bls12381::min_pk::{BLS12381PublicKey, BLS12381Signature};
use fastcrypto::traits::AggregateAuthenticator;
use fastcrypto::traits::ToFromBytes;
use fastcrypto::traits::VerifyingKey;
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::{JsError, JsValue};

#[wasm_bindgen]
pub fn bls12381_min_pk_verify(
    signature: &[u8],
    public_key: &[u8],
    msg: &[u8],
) -> Result<bool, JsError> {
    let signature = BLS12381Signature::from_bytes(signature)?;
    let public_key = BLS12381PublicKey::from_bytes(public_key)?;
    Ok(public_key.verify(msg, &signature).is_ok())
}

/// Aggregate a list of signatures.
/// The signatures must be of the type Vec<Vec<u8>> with each signature being a 96 bytes long serialized signature.
#[wasm_bindgen]
pub fn bls12381_min_pk_aggregate(signatures: JsValue) -> Result<Vec<u8>, JsError> {
    let signatures = serde_wasm_bindgen::from_value::<Vec<Vec<u8>>>(signatures)?;
    let signatures = signatures
        .iter()
        .map(|sig| BLS12381Signature::from_bytes(sig))
        .collect::<Result<Vec<_>, _>>()?;
    let aggregate_signatures = BLS12381AggregateSignature::aggregate(&signatures)?;
    Ok(aggregate_signatures.as_bytes().to_vec())
}

/// Verify an aggregate signature.
#[wasm_bindgen]
pub fn bls12381_min_pk_verify_aggregate(
    public_keys: JsValue, // Vec<Vec<u8>>
    msg: &[u8],
    signature: &[u8],
) -> Result<bool, JsError> {
    let public_keys = serde_wasm_bindgen::from_value::<Vec<Vec<u8>>>(public_keys)?;
    let public_keys = public_keys
        .iter()
        .map(|pk| BLS12381PublicKey::from_bytes(pk))
        .collect::<Result<Vec<_>, _>>()?;
    let signature = BLS12381AggregateSignature::from_bytes(signature)?;
    Ok(signature.verify(&public_keys, msg).is_ok())
}
