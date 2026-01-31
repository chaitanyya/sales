<div align="center">

<img src="public/logo.svg" alt="Qualify" width="200" />

<br/>
<br/>

[![GitHub Stars](https://img.shields.io/github/stars/chaitanyya/sales?style=flat-square)](https://github.com/chaitanyya/sales/stargazers)
[![Share on X](https://img.shields.io/badge/Share-000000?style=flat-square&logo=x&logoColor=white)](https://twitter.com/intent/tweet?text=Check%20out%20Qualify%20-%20Claude%20Code%20for%20Sales&url=https://github.com/chaitanyya/sales)

</div>

## Quick Start

```bash
# Prerequisites: Bun, Rust, and Claude CLI
git clone https://github.com/chaitanyya/sales.git
cd sales/qual
bun install
bun run tauri:dev
```

Requires [Bun](https://bun.sh), [Rust](https://rustup.rs), and [Claude CLI](https://claude.ai/code) with API access.

## Claude Code for Sales

Lead research and qualification tool. Uses Claude Code to automatically research companies, score leads, and help you focus on the opportunities that matter.

![Leads List](public/companies.png)

## What it does

Qualify takes a list of companies and does the tedious research work for you:

- **Deep company research** - Automatically pulls company information, business model, products/services, employee count, funding, and more
- **AI-powered scoring** - Scores leads against your custom criteria (target industry, company size, growth signals, urgency indicators)
- **Contact discovery** - Finds relevant people at each company with their roles and contact details
- **Real-time streaming** - Watch research happen live as Claude investigates each lead

![Company Details](public/overview.png)

## Lead Scoring

Define your ideal customer profile and let Qualify score every lead automatically:

- Required characteristics (industry, size, location)
- Demand signifiers (technology adoption, recent changes)
- Growth signals (funding, hiring, expansion)
- Urgency indicators (contract renewals, pain points)

Each lead gets a score from 0-100 with detailed reasoning you can review.

![Lead Scoring](public/rating.png)

## Build for Production

```bash
bun run tauri:build
```

## License

MIT
