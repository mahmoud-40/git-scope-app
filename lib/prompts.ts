export const SYSTEM_SUMMARY = "You are a senior developer relations writer. Produce concise, accurate, high-signal profile summaries using only the provided data. Do NOT infer, guess, or mention private activity. Keep the tone neutral, developer-focused, and avoid fluff. Format the answer in Markdown with the exact sections and limits requested. If some data is missing, omit that detail without speculating.";

export const SYSTEM_COMPARE = "You are a senior developer relations writer. Produce concise, accurate, high-signal comparisons using only the provided data. Do NOT infer or guess. Keep tone neutral and developer-focused. Format strictly as requested.";

export function buildUserSummaryPrompt(params: {
  username: string;
  name: string | null | undefined;
  bio: string | null | undefined;
  followers: number;
  publicRepos: number;
  totalStars: number;
  topReposList: string;
  primaryLanguagesList: string;
  commitCount: number;
}): string {
  const { username, name, bio, followers, publicRepos, totalStars, topReposList, primaryLanguagesList, commitCount } = params;
  return `Analyze GitHub user @${username} using ONLY this snapshot:

Profile
- Name: ${name || 'N/A'}
- Bio: ${bio || 'N/A'}
- Followers: ${followers}
- Public repos: ${publicRepos}

Repos summary
- Total stars: ${totalStars}
- Top repos (by stars, up to 5): ${topReposList || 'N/A'}
- Primary languages (top 3 by repo count): ${primaryLanguagesList || 'N/A'}

Recent activity
- Push events (last 30d): ${commitCount}

Write:
1) Summary (max 90 words) focusing on concrete strengths supported by the data.
2) Strengths (3-5 bullets). Each bullet starts with a **bold noun phrase**.
3) Suggestions (3-5 bullets) that are specific and actionable (docs, tests, topics, CI, issues, collaboration, visibility).

Rules:
- Do NOT mention missing/unknown data.
- Do NOT suggest things already evidenced as strong.
- No marketing language. Be direct.
- Markdown only. No preamble. No closing sentence.`;
}

export function buildComparePrompt(params: {
  a: {
    username: string;
    name: string | null | undefined;
    followers: number;
    publicRepos: number;
    totalStars: number;
    topReposList: string;
    topLanguages: string;
    commits30d: number;
  };
  b: {
    username: string;
    name: string | null | undefined;
    followers: number;
    publicRepos: number;
    totalStars: number;
    topReposList: string;
    topLanguages: string;
    commits30d: number;
  };
}): string {
  const { a, b } = params;
  return `Compare two GitHub users using ONLY this snapshot.

User A: @${a.username}
Profile: name=${a.name || 'N/A'}, followers=${a.followers}, public_repos=${a.publicRepos}
Repos: total_stars=${a.totalStars}, top_repos=${a.topReposList || 'N/A'}, top_languages=${a.topLanguages || 'N/A'}
Activity: push_commits_30d=${a.commits30d}

User B: @${b.username}
Profile: name=${b.name || 'N/A'}, followers=${b.followers}, public_repos=${b.publicRepos}
Repos: total_stars=${b.totalStars}, top_repos=${b.topReposList || 'N/A'}, top_languages=${b.topLanguages || 'N/A'}
Activity: push_commits_30d=${b.commits30d}

Write:
1) Summary (max 80 words) with data-backed contrast.
2) A vs B (3-6 bullets) with bold metric labels (e.g., **Total stars:** A X vs B Y).
3) Suggestions (3-5 bullets) tailored for each, prefixed with A: or B:.

Rules:
- No speculation; only use given data.
- No marketing language; be direct.
- Markdown only.`;
}
