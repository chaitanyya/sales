use sha2::{Digest, Sha256};
use std::process::Command;

/// Generate a device fingerprint for hardware-bound encryption
/// This is used to derive encryption keys, preventing casual token copying
pub fn get_device_fingerprint() -> Result<String, String> {
    let mut hasher = Sha256::new();

    // Collect hardware identifiers
    hasher.update(b"liidi-device-v1");

    // macOS hardware UUID
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = Command::new("ioreg")
            .args(["-rd1", "-c", "IOPlatformExpertDevice"])
            .output()
        {
            let output_str = String::from_utf8_lossy(&output.stdout);
            if let Some(line) = output_str.lines().find(|l| l.contains("IOPlatformUUID")) {
                hasher.update(line.as_bytes());
            }
        }
    }

    // Windows machine ID
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = Command::new("wmic")
            .args(["csproduct", "get", "uuid"])
            .output()
        {
            let output_str = String::from_utf8_lossy(&output.stdout);
            hasher.update(output_str.as_bytes());
        }
    }

    // Linux machine-id
    #[cfg(target_os = "linux")]
    {
        if let Ok(output) = Command::new("cat")
            .arg("/etc/machine-id")
            .output()
        {
            let output_str = String::from_utf8_lossy(&output.stdout);
            hasher.update(output_str.trim());
        } else if let Ok(output) = Command::new("cat")
            .arg("/var/lib/dbus/machine-id")
            .output()
        {
            let output_str = String::from_utf8_lossy(&output.stdout);
            hasher.update(output_str.trim());
        }
    }

    // Add hostname for additional entropy
    if let Ok(hostname) = whoami::hostname() {
        hasher.update(hostname.as_bytes());
    }

    // Add username (optional, adds per-user entropy)
    hasher.update(whoami::username().as_bytes());

    Ok(format!("{:x}", hasher.finalize()))
}

/// Verify that the current device matches the stored fingerprint
pub fn verify_device_fingerprint(stored: &str) -> bool {
    match get_device_fingerprint() {
        Ok(current) => current == stored,
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fingerprint_is_consistent() {
        let fp1 = get_device_fingerprint();
        let fp2 = get_device_fingerprint();

        assert!(fp1.is_ok());
        assert_eq!(fp1, fp2);
    }

    #[test]
    fn test_verify_matches() {
        let fp = get_device_fingerprint().unwrap();
        assert!(verify_device_fingerprint(&fp));
    }

    #[test]
    fn test_verify_rejects_invalid() {
        assert!(!verify_device_fingerprint("invalid-fingerprint"));
    }
}
