use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use sha2::{Digest, Sha256};
use base64::{Engine as _, engine::general_purpose};

const TOKEN_KEY_SALT: &[u8] = b"liidi-token-key-salt-v1";

pub struct TokenEncryption {
    cipher: Aes256Gcm,
}

impl TokenEncryption {
    /// Derive encryption key from device fingerprint
    pub fn from_device_fingerprint(device_id: &str) -> Self {
        let mut hasher = Sha256::new();
        hasher.update(TOKEN_KEY_SALT);
        hasher.update(device_id.as_bytes());
        let key = hasher.finalize();

        let cipher = Aes256Gcm::new(&key.into());
        Self { cipher }
    }

    /// Encrypt a token using AES-256-GCM
    /// Returns base64-encoded (nonce + ciphertext)
    pub fn encrypt_token(&self, token: &str) -> Result<String, String> {
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        let ciphertext = self
            .cipher
            .encrypt(&nonce, token.as_bytes())
            .map_err(|e| e.to_string())?;

        // Combine nonce + ciphertext for storage
        let mut result = nonce.to_vec();
        result.extend_from_slice(&ciphertext);

        Ok(general_purpose::STANDARD.encode(result))
    }

    /// Decrypt a token using AES-256-GCM
    /// Expects base64-encoded (nonce + ciphertext)
    #[allow(dead_code)]
    pub fn decrypt_token(&self, encrypted: &str) -> Result<String, String> {
        let data = general_purpose::STANDARD.decode(encrypted).map_err(|e| e.to_string())?;

        if data.len() < 12 {
            return Err("Invalid encrypted data".to_string());
        }

        let (nonce, ciphertext) = data.split_at(12);
        let nonce = Nonce::from_slice(nonce);

        let plaintext = self
            .cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| e.to_string())?;

        String::from_utf8(plaintext).map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encryption_roundtrip() {
        let encryption = TokenEncryption::from_device_fingerprint("test-device-id");
        let original = "test-token-value";

        let encrypted = encryption.encrypt_token(original).unwrap();
        let decrypted = encryption.decrypt_token(&encrypted).unwrap();

        assert_eq!(original, decrypted);
    }

    #[test]
    fn test_different_device_fails() {
        let encryption1 = TokenEncryption::from_device_fingerprint("device-1");
        let encryption2 = TokenEncryption::from_device_fingerprint("device-2");

        let original = "test-token-value";
        let encrypted = encryption1.encrypt_token(original).unwrap();

        // Should fail to decrypt with different device fingerprint
        assert!(encryption2.decrypt_token(&encrypted).is_err());
    }
}
