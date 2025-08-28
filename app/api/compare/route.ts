import { NextRequest } from "next/server";
import type { CompareInput, UserSnapshot, GitHubRepo, GitHubEvent } from "@/lib/types";
import { OPENAI_CHAT_URL, OPENAI_MODEL } from "@/lib/constants";
import { SYSTEM_COMPARE, buildComparePrompt } from "@/lib/prompts";

function computeTotals(repos: GitHubRepo[]) {
  const totalStars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
  const languageCounts = new Map<string, number>();
  for (const r of repos) {
    const lang = (r.language || "").toString().trim();
    if (!lang) continue;
    languageCounts.set(lang, (languageCounts.get(lang) || 0) + 1);
  }
  const topLanguages = Array.from(languageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lang, count]) => `${lang} (${count})`)
    .join(", ");
  const topRepos = [...repos]
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, 5)
    .map((r) => `${r.name} (${r.stargazers_count}★)`) 
    .join(", ");
  return { totalStars, topLanguages, topRepos };
}

function computeCommitCount(events: GitHubEvent[] = []) {
  return (events || [])
    .filter((e) => e?.type === "PushEvent")
    .reduce((s, e) => s + ((e.payload?.commits?.length as number) || 0), 0);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CompareInput;
  if (!body?.a || !body?.b) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
  }

  const { a, b } = body as { a: UserSnapshot; b: UserSnapshot };

  const aTotals = computeTotals(a.repos || []);
  const bTotals = computeTotals(b.repos || []);
  const aCommits = computeCommitCount(a.events || []);
  const bCommits = computeCommitCount(b.events || []);

  const system = SYSTEM_COMPARE;

  const userPrompt = buildComparePrompt({
    a: {
      username: a.username,
      name: a.user?.name,
      followers: a.user?.followers,
      publicRepos: a.user?.public_repos,
      totalStars: aTotals.totalStars,
      topReposList: aTotals.topRepos || 'N/A',
      topLanguages: aTotals.topLanguages || 'N/A',
      commits30d: aCommits,
    },
    b: {
      username: b.username,
      name: b.user?.name,
      followers: b.user?.followers,
      publicRepos: b.user?.public_repos,
      totalStars: bTotals.totalStars,
      topReposList: bTotals.topRepos || 'N/A',
      topLanguages: bTotals.topLanguages || 'N/A',
      commits30d: bCommits,
    },
  });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const fallback = `Summary: @${a.username} vs @${b.username}. A stars=${aTotals.totalStars}, repos=${a.user?.public_repos}, commits30d=${aCommits}. B stars=${bTotals.totalStars}, repos=${b.user?.public_repos}, commits30d=${bCommits}.

- **Total stars:** A ${aTotals.totalStars} vs B ${bTotals.totalStars}
- **Public repos:** A ${a.user?.public_repos} vs B ${b.user?.public_repos}
- **Commit activity (30d):** A ${aCommits} vs B ${bCommits}

Suggestions:
- A: improve docs, tests, topics; promote top repos.
- B: collaborate more, add CI, contribute to OSS.`;
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
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 350,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      let message = "OpenAI API error";
      try {
        const j = JSON.parse(txt);
        message = j.error?.message || j.error || message;
      } catch {
        message = txt || message;
      }
      return new Response(JSON.stringify({ error: message }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content || "";
    return Response.json({ summary: content, via: "openai" });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: `Network error: ${err?.message || String(err)}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
