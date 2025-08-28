import { NextRequest } from "next/server";
import type { GitHubRepo, GitHubUser, GitHubEvent } from "@/lib/types";
import { OPENAI_CHAT_URL, OPENAI_MODEL } from "@/lib/constants";
import { SYSTEM_SUMMARY, buildUserSummaryPrompt } from "@/lib/prompts";

type Input = {
  username: string;
  user: GitHubUser;
  repos: GitHubRepo[];
  events?: GitHubEvent[];
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Input;
  const { username, user, repos, events = [] } = body ?? {} as Input;

  if (!username || !user || !Array.isArray(repos)) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
  }

  const totalStars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
  const topReposList = [...repos]
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, 5)
    .map((r) => `${r.name} (${r.stargazers_count}★)`) 
    .join(", ");

  const languageCounts = new Map<string, number>();
  for (const r of repos) {
    const lang = (r.language || "").toString().trim();
    if (!lang) continue;
    languageCounts.set(lang, (languageCounts.get(lang) || 0) + 1);
  }
  const primaryLanguagesList = Array.from(languageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lang, count]) => `${lang} (${count})`)
    .join(", ");

  const commitEvents = (events || []).filter((e) => e.type === "PushEvent");
  const commitCount = commitEvents.reduce((s, e) => s + ((e.payload?.commits?.length as number) || 0), 0);

  const systemSummary = SYSTEM_SUMMARY;
  const userPrompt = buildUserSummaryPrompt({
    username,
    name: user.name,
    bio: user.bio,
    followers: user.followers,
    publicRepos: user.public_repos,
    totalStars,
    topReposList,
    primaryLanguagesList,
    commitCount,
  });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const fallback = `@${username} has ${user.public_repos} public repos and ${user.followers} followers. Total stars across repositories is ${totalStars}. Top repositories: ${topReposList || "N/A"}. Recent push activity shows ~${commitCount} commits. Overall, the profile suggests areas of focus around ${repos[0]?.language || "varied languages"}. Consider improving README quality, adding topics, and contributing to trending projects.`;
    return Response.json({ summary: fallback, via: "fallback" });
  }

  try {
    const res = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemSummary },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 350,
      }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = "OpenAI API error";
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        } else if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      return new Response(JSON.stringify({ error: errorMessage }), { 
        status: res.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    return Response.json({ summary: content, via: "openai" });
  } catch (err: any) {
    return new Response(JSON.stringify({ 
      error: `Network error: ${err.message || String(err)}` 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


