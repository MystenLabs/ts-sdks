use core::num::NonZeroU16;
use js_sys::{Array, Uint8Array};
use walrus_core::encoding::{EncodingConfig, EncodingFactory, Primary, SliverData};
use walrus_core::metadata::{BlobMetadata, BlobMetadataApi};
use walrus_core::{BlobId, EncodingType};
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::{JsCast, JsError, JsValue};

#[wasm_bindgen]
pub struct BlobEncoder {
    config: EncodingConfig,
}

#[wasm_bindgen]
impl BlobEncoder {
    #[wasm_bindgen(constructor)]
    pub fn new(n_shards: u16) -> Result<Self, JsError> {
        let config = EncodingConfig::new(
            NonZeroU16::new(n_shards).ok_or(JsError::new("n_shards must be greater than 0"))?,
        );
        Ok(Self { config })
    }

    /// Encode data and write BCS-encoded SliverData directly into pre-allocated buffers.
    ///
    /// Arguments:
    /// - data: Input data to encode
    /// - primary_buffers: Array of Uint8Array buffers (one per shard) for primary slivers
    /// - secondary_buffers: Array of Uint8Array buffers (one per shard) for secondary slivers
    ///
    /// Each buffer will be written with BCS-encoded SliverData.
    ///
    /// Returns: JsValue with (metadata, root_hash)
    #[wasm_bindgen]
    pub fn encode(
        &self,
        data: &Uint8Array,
        primary_buffers: &Array,
        secondary_buffers: &Array,
    ) -> Result<JsValue, JsError> {
        let data_vec = data.to_vec();
        let encoder = self.config.get_for_type(EncodingType::RS2);
        let (sliver_pairs, metadata) = encoder.encode_with_metadata(data_vec)?;

        // Validate buffer counts
        if primary_buffers.length() != sliver_pairs.len() as u32 {
            return Err(JsError::new(&format!(
                "Expected {} primary buffers, got {}",
                sliver_pairs.len(),
                primary_buffers.length()
            )));
        }
        if secondary_buffers.length() != sliver_pairs.len() as u32 {
            return Err(JsError::new(&format!(
                "Expected {} secondary buffers, got {}",
                sliver_pairs.len(),
                secondary_buffers.length()
            )));
        }

        // Write BCS-encoded slivers to buffers
        for (i, sliver_pair) in sliver_pairs.iter().enumerate() {
            let primary_buffer = primary_buffers
                .get(i as u32)
                .dyn_into::<Uint8Array>()
                .map_err(|_| JsError::new(&format!("Primary buffer {} is not a Uint8Array", i)))?;
            Self::write_sliver_data_bcs(&sliver_pair.primary, &primary_buffer)?;

            let secondary_buffer = secondary_buffers
                .get(i as u32)
                .dyn_into::<Uint8Array>()
                .map_err(|_| {
                    JsError::new(&format!("Secondary buffer {} is not a Uint8Array", i))
                })?;
            Self::write_sliver_data_bcs(&sliver_pair.secondary, &secondary_buffer)?;
        }

        let root_hash = match metadata.metadata() {
            BlobMetadata::V1(inner) => inner.compute_root_hash(),
        };

        Ok(serde_wasm_bindgen::to_value(&(metadata, root_hash))?)
    }

    /// Compute metadata for data without encoding it.
    /// Returns (metadata, root_hash)
    #[wasm_bindgen]
    pub fn compute_metadata(&self, data: &Uint8Array) -> Result<JsValue, JsError> {
        let data_vec = data.to_vec();
        let encoder = self.config.get_for_type(EncodingType::RS2);
        let metadata = encoder.compute_metadata(&data_vec)?;
        let root_hash = match metadata.metadata() {
            BlobMetadata::V1(inner) => inner.compute_root_hash(),
        };
        Ok(serde_wasm_bindgen::to_value(&(metadata, root_hash))?)
    }

    /// Decode blob from BCS-encoded SliverData buffers.
    ///
    /// Arguments:
    /// - blob_id: The blob identifier
    /// - blob_size: The original unencoded blob size in bytes
    /// - bcs_buffers: Vec<Uint8Array>, each containing BCS-encoded SliverData<Primary>
    /// - output_buffer: Uint8Array to write decoded data into (must be exactly blob_size bytes)
    #[wasm_bindgen]
    pub fn decode(
        &self,
        blob_id: JsValue,
        blob_size: u64,
        bcs_buffers: Vec<Uint8Array>,
        output_buffer: &Uint8Array,
    ) -> Result<(), JsError> {
        let _blob_id = serde_wasm_bindgen::from_value::<BlobId>(blob_id)?;

        if output_buffer.length() as u64 != blob_size {
            return Err(JsError::new(&format!(
                "Output buffer size mismatch: expected {}, got {}",
                blob_size,
                output_buffer.length()
            )));
        }

        let mut sliver_data: Vec<SliverData<Primary>> = Vec::with_capacity(bcs_buffers.len());

        for (i, buffer) in bcs_buffers.iter().enumerate() {
            let bytes = buffer.to_vec();
            let sliver: SliverData<Primary> = bcs::from_bytes(&bytes).map_err(|e| {
                JsError::new(&format!(
                    "BCS deserialization failed at index {} (buffer size {}): {}",
                    i,
                    bytes.len(),
                    e
                ))
            })?;
            sliver_data.push(sliver);
        }

        let decoder = self.config.get_for_type(EncodingType::RS2);
        let decoded = decoder.decode(blob_size, sliver_data)?;
        output_buffer.copy_from(&decoded[..]);

        Ok(())
    }

    fn write_sliver_data_bcs<T: walrus_core::encoding::EncodingAxis>(
        sliver: &SliverData<T>,
        buffer: &Uint8Array,
    ) -> Result<(), JsError> {
        let serialized = bcs::to_bytes(sliver)
            .map_err(|e| JsError::new(&format!("BCS serialization failed: {}", e)))?;

        // Verify buffer size
        if buffer.length() as usize != serialized.len() {
            return Err(JsError::new(&format!(
                "Buffer size mismatch: expected {}, got {}",
                serialized.len(),
                buffer.length()
            )));
        }

        buffer.copy_from(&serialized[..]);

        Ok(())
    }
}
