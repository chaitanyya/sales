//! Enrichment data structures for research jobs
//!
//! These structures represent the additional metadata that can be extracted
//! during research and used to populate database columns.

use serde::Deserialize;

/// Enrichment data for leads (companies)
#[derive(Debug, Deserialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LeadEnrichment {
    pub website: Option<String>,
    pub industry: Option<String>,
    pub sub_industry: Option<String>,
    pub employees: Option<i64>,
    pub employee_range: Option<String>,
    pub revenue: Option<f64>,
    pub revenue_range: Option<String>,
    pub company_linkedin_url: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub country: Option<String>,
}

/// Enrichment data for people
#[derive(Debug, Deserialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PersonEnrichment {
    pub email: Option<String>,
    pub title: Option<String>,
    pub management_level: Option<String>,
    pub linkedin_url: Option<String>,
    pub year_joined: Option<i64>,
}
