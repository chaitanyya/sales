use serde::Deserialize;
use std::sync::OnceLock;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelConfig {
    default_model: String,
    models: Vec<ModelOption>,
}

#[derive(Debug, Deserialize)]
struct ModelOption {
    value: String,
}

fn config() -> &'static ModelConfig {
    static CONFIG: OnceLock<ModelConfig> = OnceLock::new();
    CONFIG.get_or_init(|| {
        serde_json::from_str(include_str!("../../src/config/claude-models.json"))
            .expect("embedded Claude model configuration must be valid")
    })
}

pub fn default_model() -> &'static str {
    &config().default_model
}

pub fn is_supported_model(model: &str) -> bool {
    config().models.iter().any(|option| option.value == model)
}

#[cfg(test)]
mod tests {
    use super::{config, default_model, is_supported_model};
    use std::collections::HashSet;

    #[test]
    fn configured_models_are_unique_and_include_default() {
        let config = config();
        let unique: HashSet<_> = config.models.iter().map(|model| &model.value).collect();

        assert_eq!(unique.len(), config.models.len());
        assert!(is_supported_model(default_model()));
    }

    #[test]
    fn rejects_unknown_models() {
        assert!(!is_supported_model("claude-made-up-99"));
    }
}
