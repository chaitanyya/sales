/// Default prompts embedded at compile time from markdown files
pub mod defaults {
    pub const COMPANY: &str = include_str!("defaults/company.md");
    pub const PERSON: &str = include_str!("defaults/person.md");
    pub const CONVERSATION_TOPICS: &str = include_str!("defaults/conversation_topics.md");
    pub const COMPANY_PROFILE_RESEARCH: &str = include_str!("defaults/company_profile_research.md");
}

/// Get the default prompt content for a given prompt type.
/// Returns None for types that have no default (like company_overview which must be user-provided).
pub fn get_default_prompt(prompt_type: &str) -> Option<&'static str> {
    match prompt_type {
        "company" => Some(defaults::COMPANY),
        "person" => Some(defaults::PERSON),
        "conversation_topics" => Some(defaults::CONVERSATION_TOPICS),
        "company_profile_research" => Some(defaults::COMPANY_PROFILE_RESEARCH),
        // company_overview has no default - user must provide it
        _ => None,
    }
}
