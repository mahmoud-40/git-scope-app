import type { GitHubUser, GitHubRepo, GitHubEvent } from "@/lib/types";
import { GITHUB_API_BASE, REPOS_PER_PAGE, EVENTS_PER_PAGE } from "@/lib/constants";

async function fetchJson<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

export async function getUser(username: string): Promise<GitHubUser> {
  return fetchJson<GitHubUser>(`${GITHUB_API_BASE}/users/${encodeURIComponent(username)}`);
}

export async function getRepos(username: string): Promise<GitHubRepo[]> {
  const url = `${GITHUB_API_BASE}/users/${encodeURIComponent(
    username
  )}/repos?per_page=${REPOS_PER_PAGE}&sort=updated`;
  return fetchJson<GitHubRepo[]>(url);
}

export async function getRecentEvents(username: string): Promise<GitHubEvent[]> {
  const url = `${GITHUB_API_BASE}/users/${encodeURIComponent(
    username
  )}/events/public?per_page=${EVENTS_PER_PAGE}`;
  return fetchJson<GitHubEvent[]>(url);
}

export function computeCommitActivityScore(events: GitHubEvent[], days = 30): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  let commits = 0;
  for (const ev of events) {
    const ts = new Date(ev.created_at).getTime();
    if (ts < cutoff) continue;
    if (ev.type === "PushEvent" && ev.payload?.commits && Array.isArray(ev.payload.commits)) {
      commits += ev.payload.commits.length;
    }
  }
  return commits;
}

export function computeTotalStars(repos: GitHubRepo[]): number {
  return repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
}


