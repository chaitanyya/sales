# Claude Code for Sales/GTM!

AI-powered sales lead research and qualification system. Qual helps sales teams research companies and individuals, then automatically score and qualify leads based on configurable criteria.

## Features

- **Lead Management** - Add and manage company leads with research status tracking
- **People Research** - Track and research individuals within target companies
- **AI-Powered Research** - Uses Claude CLI with web search to generate detailed lead profiles
- **Automated Scoring** - Configurable lead qualification with pass/fail gates and weighted scoring
- **Real-Time Streaming** - Live progress updates during research operations
- **Customizable Prompts** - Edit the prompts used for company and person research
- **Flexible Scoring Config** - Define required characteristics, demand signifiers, and scoring weights

## Screenshots

### Lead List
View all your leads with research status, industry tags, and qualification scores at a glance.

![Lead List](/public/1.png)

### Company Profile
AI-generated research profiles with company overview, products, services, and key information.

![Company Profile](/public/2.png)

### Lead Scoring
Detailed scoring breakdown showing required characteristics, demand signifiers, and AI assessment.

![Lead Scoring](/public/3.png)

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ or [Bun](https://bun.sh/) 1.0+
- [Claude CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated

## Installation

1. Clone the repository:

```bash
git clone https://github.com/chaitanyya/sales.git
cd sales
```

2. Install dependencies:

```bash
bun install
# or
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` if needed. The defaults work for most setups:

```
DATABASE_URL=./data.db
NODE_ENV=development
```

4. Initialize the database:

```bash
bun run db:push
bun run db:seed
```

This creates the SQLite database and seeds it with default prompts and scoring configuration.

## Running the Application

Start the development server:

```bash
bun run dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Commands

| Command | Description |
|---------|-------------|
| `bun run db:push` | Push schema changes to the database |
| `bun run db:seed` | Seed default prompts and scoring config |
| `bun run db:studio` | Open Drizzle Studio to browse the database |
| `bun run db:reset` | Delete database and recreate with seed data |
| `bun run db:generate` | Generate migration files |
| `bun run db:migrate` | Run pending migrations |

## Project Structure

```
/app              - Next.js App Router pages and API routes
  /api            - REST API endpoints
  /lead           - Lead management pages
  /people         - People management pages
  /prompt         - Prompt configuration
  /scoring        - Scoring configuration
/components       - React components
/db               - Database schema and seed data
/lib              - Utilities, types, and business logic
/drizzle          - Database migrations
```

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Database**: SQLite with Drizzle ORM
- **UI**: Tailwind CSS, shadcn/ui, Radix UI
- **State**: Zustand
- **AI**: Claude CLI for research operations

## Development

```bash
# Run linting
bun run lint

# Fix lint issues
bun run lint:fix

# Format code
bun run format

# Check formatting
bun run format:check
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Path to SQLite database | `./data.db` |
| `CLAUDE_PATH` | Path to Claude CLI (auto-detected if not set) | - |
| `NODE_ENV` | Environment mode | `development` |

### Claude CLI

The application requires Claude CLI to be installed and authenticated. If not in your PATH, set the `CLAUDE_PATH` environment variable.

Common installation locations:
- `/usr/local/bin/claude`
- `/opt/homebrew/bin/claude`
- `~/.local/bin/claude`

## License

[Add your license here]
