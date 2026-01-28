//! Subscription validation logic
//!
//! This module provides comprehensive subscription status validation.

use crate::crypto::{TokenEncryption, verify_device_fingerprint};
use crate::db::schema::SubscriptionState;
use crate::subscription::store::load_subscription_state;
use std::sync::{Arc, Mutex};
use rusqlite::Connection;
use chrono::Utc;

/// Subscription validator handles all subscription-related validation logic
#[allow(dead_code)]
pub struct SubscriptionValidator {
    state: Option<SubscriptionState>,
}

#[allow(dead_code)]
impl SubscriptionValidator {
    /// Load validator from database
    pub fn load(conn: &Arc<Mutex<Connection>>) -> Result<Self, String> {
        let state = load_subscription_state(conn)
            .map_err(|e| e.to_string())?;
        Ok(Self { state })
    }

    /// Create validator from provided state (for testing)
    pub fn from_state(state: SubscriptionState) -> Self {
        Self { state: Some(state) }
    }

    /// Create empty validator (no subscription state)
    pub fn empty() -> Self {
        Self { state: None }
    }

    /// Check if subscription is currently valid
    pub fn is_subscription_valid(&self) -> bool {
        let Some(state) = &self.state else {
            return false;
        };

        // First verify device fingerprint matches
        if !verify_device_fingerprint(&state.device_fingerprint) {
            return false;
        };

        self.is_status_valid(state, Utc::now().timestamp())
    }

    /// Check if subscription status is valid (ignoring device fingerprint)
    pub fn is_status_valid(&self, state: &SubscriptionState, now: i64) -> bool {
        match state.subscription_status.as_str() {
            "active" => true,
            "past_due" | "canceled" | "expired" => {
                // Check grace period
                state.grace_period_ends_at.map_or(false, |end| now < end)
            }
            _ => false,
        }
    }

    /// Get the lockout reason if subscription is invalid
    pub fn get_lockout_reason(&self) -> Option<String> {
        if self.is_subscription_valid() {
            return None;
        }

        let state = self.state.as_ref()?;
        let grace_end = state.grace_period_ends_at.unwrap_or(0);

        if Utc::now().timestamp() < grace_end {
            // Still in grace period - no lockout
            None
        } else {
            // Grace period expired
            Some(match state.subscription_status.as_str() {
                "past_due" => {
                    "Subscription payment past due. Please update your payment method.".to_string()
                }
                "canceled" => "Subscription canceled. Data access is locked.".to_string(),
                "expired" => "Subscription expired. Please renew to continue.".to_string(),
                _ => "Subscription not active. Please subscribe to use Zyntopia Liidi.".to_string(),
            })
        }
    }

    /// Get remaining days in grace period
    pub fn get_grace_period_days_remaining(&self) -> Option<i64> {
        let state = self.state.as_ref()?;
        let grace_end = state.grace_period_ends_at?;
        let now = Utc::now().timestamp();
        let remaining = grace_end - now;
        Some((remaining / (24 * 60 * 60)).max(0))
    }

    /// Get the stored subscription state
    pub fn get_state(&self) -> Option<&SubscriptionState> {
        self.state.as_ref()
    }

    /// Decrypt and return the stored token
    pub fn decrypt_token(&self) -> Result<String, String> {
        let state = self.state.as_ref()
            .ok_or("No subscription state found")?;

        // Verify device fingerprint first
        if !verify_device_fingerprint(&state.device_fingerprint) {
            return Err("Device fingerprint mismatch".to_string());
        }

        let encryption = TokenEncryption::from_device_fingerprint(&state.device_fingerprint);
        encryption.decrypt_token(&state.encrypted_token)
    }

    /// Get subscription status string
    pub fn get_status(&self) -> &str {
        self.state
            .as_ref()
            .map(|s| s.subscription_status.as_str())
            .unwrap_or("unknown")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_state(status: &str, grace_ends_at: Option<i64>) -> SubscriptionState {
        let now = Utc::now().timestamp();
        SubscriptionState {
            id: 1,
            encrypted_token: "test_token".to_string(),
            subscription_status: status.to_string(),
            subscription_expires_at: None,
            token_issued_at: now,
            token_expires_at: now + 86400,
            last_validated_at: now,
            device_fingerprint: get_device_fingerprint().unwrap_or_default(),
            grace_period_ends_at: grace_ends_at,
        }
    }

    #[test]
    fn test_active_subscription_is_valid() {
        let validator = SubscriptionValidator::from_state(create_test_state("active", None));
        assert!(validator.is_subscription_valid());
    }

    #[test]
    fn test_expired_subscription_in_grace_period() {
        let now = Utc::now().timestamp();
        let grace_end = now + 86400; // 1 day from now
        let validator = SubscriptionValidator::from_state(create_test_state("expired", Some(grace_end)));
        assert!(validator.is_subscription_valid());
    }

    #[test]
    fn test_expired_subscription_past_grace_period() {
        let now = Utc::now().timestamp();
        let grace_end = now - 86400; // 1 day ago
        let validator = SubscriptionValidator::from_state(create_test_state("expired", Some(grace_end)));
        assert!(!validator.is_subscription_valid());
    }

    #[test]
    fn test_empty_validator_is_invalid() {
        let validator = SubscriptionValidator::empty();
        assert!(!validator.is_subscription_valid());
    }
}
