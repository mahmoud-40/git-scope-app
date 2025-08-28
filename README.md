# Git Scope — GitHub Profile Explorer

A clean, focused Next.js + TypeScript app to explore GitHub profiles and repositories, compare two users on key metrics, and generate AI-powered summaries. Includes a lightweight notes system that persists locally in the browser.

Live demo: [https://git-scope-app.vercel.app/](https://git-scope-app.vercel.app/)

## Features

- Profile explorer
  - Search any GitHub username and view profile details (avatar, name, bio, followers, public repos)
  - List all public repositories with key info (name, description, stars, language, forks)
  - Inline metrics: total stars and recent commit activity (last 30 days)
- AI insights
  - One-click AI summary of a user's profile and repos
  - AI comparison of two users with data-backed contrast and suggestions
- Comparison
  - Side-by-side table: public repos, total stars, and recent commit activity (30d)
- Notes
  - Add personal notes for a user or a specific repository
  - Notes are saved locally and surface automatically on revisit ("Saved Notes")
 
## Video Demo

https://github.com/user-attachments/assets/71542acc-9947-44ec-93c3-259de8f165f6

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- React 19
- Tailwind CSS v4
- React Markdown (for AI output)
- OpenAI Chat Completions API (optional, for AI features)

## Getting Started

Prerequisites

- Node.js 18+ (recommended 18.18+ or 20+)
- An OpenAI API key (only needed for AI summary/compare)

Installation

```bash
git clone https://github.com/mahmoud-40/git-scope-app.git
cd git-scope-app
npm install
```

Environment
Create a .env.local file in the project root:

```env
# Required only for AI features
OPENAI_API_KEY=your_openai_api_key
```

Run

```bash
npm run dev          # starts Next.js with Turbopack on http://localhost:3000
# or
npm run build        # production build (Turbopack)
npm start            # start production server
```

## Usage

- Enter a GitHub username (e.g., mahmoud-40) and load the profile.
- Optionally enter a second username to compare metrics side by side.
- Click "AI Summary" for a concise profile analysis, or "AI Compare" for a data-backed comparison.
- Use the "Notes" section to save personal notes for the current user and for individual repos.
- All saved notes appear in the "Saved Notes" section at the top of the page.

## How It Works

- Data fetching (GitHub)
  - Client requests: users, repos (per_page=100, sort=updated), and recent public events (per_page=100).
  - Metrics derived client-side:
    - Total stars across listed repos
    - Recent commit activity: counts commits in "PushEvent" over the last 30 days
- AI summary/compare
  - Server routes (/api/summarize and /api/compare) build compact, data-only prompts and call the OpenAI Chat Completions API.
  - If OPENAI_API_KEY is not set, routes return a concise fallback string.
- Notes
  - Stored in localStorage (key: "git-scope-notes"), keyed by target (user:username or repo:owner/name).
  - Not synced across devices or browsers.

## API

- POST /api/summarize
  - Purpose: Generate an AI summary for a user.
  - Body: { username, user, repos, events }
  - Returns: { summary, via }
- POST /api/compare
  - Purpose: Generate an AI comparison for two users.
  - Body: { a: UserSnapshot, b: UserSnapshot }
  - Returns: { summary, via }

The app calls GitHub's public REST endpoints:

- GET /users/:username
- GET /users/:username/repos?per_page=100&sort=updated
- GET /users/:username/events/public?per_page=100

## Project Structure

```text
.
├─ app/
│  ├─ api/
│  │  ├─ compare/route.ts      # AI comparison (server)
│  │  └─ summarize/route.ts    # AI summary (server)
│  ├─ globals.css              # Tailwind v4 styles
│  ├─ layout.tsx               # Root layout
│  └─ page.tsx                 # Main UI (search, results, compare, notes, AI)
├─ components/
│  ├─ NotesSection.tsx         # Notes UI (per user/repo + saved notes view)
│  ├─ RepoItem.tsx             # Single repository display
│  └─ UserHeader.tsx           # Profile header (avatar + basics)
├─ hooks/
│  └─ useLocalNotes.ts         # LocalStorage-backed notes (keyed by user/repo)
├─ lib/
│  ├─ constants.ts             # API constants and pagination
│  ├─ github.ts                # GitHub fetchers + simple metrics
│  ├─ prompts.ts               # Prompt builders for AI summary/compare
│  └─ types.ts                 # Shared TypeScript types
├─ public/
├─ eslint.config.mjs
├─ next.config.ts
├─ package.json
├─ postcss.config.mjs
└─ tsconfig.json
```

## Deployment

- Live: [https://git-scope-app.vercel.app/](https://git-scope-app.vercel.app/)
- To deploy your own on Vercel:
  1) Import the repository.
  2) Add OPENAI_API_KEY (optional) in Project Settings → Environment Variables.
  3) Deploy.
 
## License

No license specified.
