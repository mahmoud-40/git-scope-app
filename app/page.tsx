"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { getRepos, getUser, getRecentEvents, computeCommitActivityScore, computeTotalStars } from "@/lib/github";
import type { GitHubRepo, GitHubUser, GitHubEvent } from "@/lib/types";
import { NotesSection } from "@/components/NotesSection";
import { UserHeader } from "@/components/UserHeader";
import { RepoItem } from "@/components/RepoItem";
import { useLocalNotes } from "@/hooks/useLocalNotes";
import ReactMarkdown from "react-markdown";

type FetchState<T> = { kind: "idle" } | { kind: "loading" } | { kind: "error"; error: string } | { kind: "loaded"; data: T };

export default function Home() {
  const [username, setUsername] = useState("");
  const [compareUsername, setCompareUsername] = useState("");

  const [userState, setUserState] = useState<FetchState<{ user: GitHubUser; repos: GitHubRepo[]; events: GitHubEvent[] }>>({ kind: "idle" });
  const [compareState, setCompareState] = useState<FetchState<{ user: GitHubUser; repos: GitHubRepo[]; events: GitHubEvent[] }>>({ kind: "idle" });

  const [aiSummary, setAiSummary] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);

  const [aiCompare, setAiCompare] = useState<string>("");
  const [aiCompareLoading, setAiCompareLoading] = useState(false);

  const { allNotes, getNotesFor, addNote, updateNote, deleteNote } = useLocalNotes();

  useEffect(() => {
    if (rateLimitCountdown > 0) {
      const timer = setTimeout(() => {
        setRateLimitCountdown((s) => s - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [rateLimitCountdown]);

  async function loadUser(target: "primary" | "compare") {
    const uname = (target === "primary" ? username : compareUsername).trim();
    if (!uname) return;
    const setState = target === "primary" ? setUserState : setCompareState;
    setState({ kind: "loading" });
    try {
      const [u, r, e] = await Promise.all([getUser(uname), getRepos(uname), getRecentEvents(uname)]);
      setState({ kind: "loaded", data: { user: u, repos: r, events: e } });
    } catch (err: any) {
      setState({ kind: "error", error: String(err?.message || err) });
    }
  }

  const userMetrics = useMemo(() => {
    if (userState.kind !== "loaded") return null;
    const { repos, events } = userState.data;
    return {
      totalStars: computeTotalStars(repos),
      commitActivity30d: computeCommitActivityScore(events, 30),
    } as const;
  }, [userState]);

  const compareMetrics = useMemo(() => {
    if (compareState.kind !== "loaded") return null;
    const { repos, events } = compareState.data;
    return {
      totalStars: computeTotalStars(repos),
      commitActivity30d: computeCommitActivityScore(events, 30),
    } as const;
  }, [compareState]);

  async function summarizeWithAI() {
    if (userState.kind !== "loaded") return;
    setAiLoading(true);
    setAiSummary("");
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: userState.data.user.login,
          user: userState.data.user,
          repos: userState.data.repos,
          events: userState.data.events,
        }),
      });
      
      if (!res.ok) {
        if (res.status === 429) {
          const errorText = await res.text();
          let errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
          let retryAfter = 60;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
            retryAfter = errorJson.retryAfter || retryAfter;
          } catch {}
          setRateLimitCountdown(retryAfter);
          throw new Error(errorMessage);
        }
        const errorText = await res.text();
        let errorMessage = "Failed to generate summary";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const json = await res.json();
      setAiSummary(json.summary || "");
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      setAiSummary(`Error: ${errorMessage}`);
    } finally {
      setAiLoading(false);
    }
  }

  async function compareWithAI() {
    if (userState.kind !== "loaded" || compareState.kind !== "loaded") return;
    setAiCompareLoading(true);
    setAiCompare("");
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          a: {
            username: userState.data.user.login,
            user: userState.data.user,
            repos: userState.data.repos,
            events: userState.data.events,
          },
          b: {
            username: compareState.data.user.login,
            user: compareState.data.user,
            repos: compareState.data.repos,
            events: compareState.data.events,
          },
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          const errorText = await res.text();
          let errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
          let retryAfter = 60;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
            retryAfter = errorJson.retryAfter || retryAfter;
          } catch {}
          setRateLimitCountdown(retryAfter);
          throw new Error(errorMessage);
        }
        const errorText = await res.text();
        let errorMessage = "Failed to generate comparison";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const json = await res.json();
      setAiCompare(json.summary || "");
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      setAiCompare(`Error: ${errorMessage}`);
    } finally {
      setAiCompareLoading(false);
    }
  }

  return (
    <main className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">GitHub Profile Explorer</h1>

      <section className="border rounded p-3">
        <div className="font-semibold mb-2">Saved Notes</div>
        {allNotes.length === 0 ? (
          <div className="text-sm opacity-70">Your saved notes will appear here.</div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {allNotes.map((n) => (
              <li key={n.id} className="border rounded p-2">
                <div className="text-xs opacity-70 mb-1">{n.targetType}: {n.targetKey}</div>
                <div className="text-sm whitespace-pre-wrap">{n.content}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border rounded p-3 space-y-3">
        <div className="flex flex-col md:flex-row gap-2">
          <input
            className="flex-1 border rounded px-2 py-1 bg-transparent"
            placeholder="Enter GitHub username (e.g., octocat)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadUser("primary")}
          />
          <button className="px-3 py-1 border rounded" onClick={() => loadUser("primary")}>Search</button>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            className="flex-1 border rounded px-2 py-1 bg-transparent"
            placeholder="Compare with (optional)"
            value={compareUsername}
            onChange={(e) => setCompareUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadUser("compare")}
          />
          <button className="px-3 py-1 border rounded" onClick={() => loadUser("compare")}>Load Compare</button>
        </div>
      </section>

      <section className="border rounded p-3 space-y-4">
        <div className="font-semibold">User</div>
        {userState.kind === "idle" && <div className="text-sm opacity-70">Search a username to begin.</div>}
        {userState.kind === "loading" && <div className="text-sm">Loading…</div>}
        {userState.kind === "error" && <div className="text-sm text-red-500">{userState.error}</div>}
        {userState.kind === "loaded" && (
          <div className="space-y-4">
            <UserHeader user={userState.data.user} />
            {userMetrics && (
              <div className="text-sm opacity-80">Total stars: {userMetrics.totalStars} · Recent commit activity (30d): {userMetrics.commitActivity30d}</div>
            )}

            <div className="flex gap-2 items-center">
              <button 
                className="px-3 py-1 border rounded" 
                onClick={summarizeWithAI} 
                disabled={aiLoading || rateLimitCountdown > 0}
              >
                {aiLoading ? "Summarizing…" : 
                 rateLimitCountdown > 0 ? `Wait ${rateLimitCountdown}s` : "AI Summary"}
              </button>
              {aiSummary && <span className="text-xs opacity-70">via AI</span>}
            </div>
            {aiSummary && (
              <div className="border rounded p-3 text-sm whitespace-pre-wrap prose prose-invert max-w-none">
                <ReactMarkdown>{aiSummary}</ReactMarkdown>
              </div>
            )}

            <NotesSection
              notes={getNotesFor("user", `user:${userState.data.user.login}`)}
              onAdd={(content) => addNote("user", `user:${userState.data.user.login}`, content)}
              onUpdate={(id, content) => updateNote(id, content)}
              onDelete={(id) => deleteNote(id)}
            />

            <div>
              <div className="font-semibold mb-2">Repositories</div>
              {userState.data.repos.length === 0 ? (
                <div className="text-sm opacity-70">No repositories found.</div>
              ) : (
                <ul className="space-y-3">
                  {userState.data.repos.map((repo) => (
                    <li key={repo.id} className="border rounded p-3">
                      <RepoItem repo={repo} />
                      <NotesSection
                        notes={getNotesFor("repo", `repo:${repo.full_name}`)}
                        onAdd={(content) => addNote("repo", `repo:${repo.full_name}`, content)}
                        onUpdate={(id, content) => updateNote(id, content)}
                        onDelete={(id) => deleteNote(id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="border rounded p-3 space-y-3">
        <div className="font-semibold">Compare</div>
        {compareState.kind === "idle" && <div className="text-sm opacity-70">Load a second user to compare.</div>}
        {compareState.kind === "loading" && <div className="text-sm">Loading…</div>}
        {compareState.kind === "error" && <div className="text-sm text-red-500">{compareState.error}</div>}
        {userState.kind === "loaded" && compareState.kind === "loaded" && (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="min-w-[600px] w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="p-2">Metric</th>
                    <th className="p-2">{userState.data.user.login}</th>
                    <th className="p-2">{compareState.data.user.login}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-2">Public Repos</td>
                    <td className="p-2">{userState.data.user.public_repos}</td>
                    <td className="p-2">{compareState.data.user.public_repos}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">Total Stars</td>
                    <td className="p-2">{userMetrics?.totalStars ?? 0}</td>
                    <td className="p-2">{compareMetrics?.totalStars ?? 0}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">Commit Activity (30d)</td>
                    <td className="p-2">{userMetrics?.commitActivity30d ?? 0}</td>
                    <td className="p-2">{compareMetrics?.commitActivity30d ?? 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 items-center">
              <button
                className="px-3 py-1 border rounded"
                onClick={compareWithAI}
                disabled={aiCompareLoading || rateLimitCountdown > 0}
              >
                {aiCompareLoading ? "Comparing…" : rateLimitCountdown > 0 ? `Wait ${rateLimitCountdown}s` : "AI Compare"}
              </button>
              {aiCompare && <span className="text-xs opacity-70">via AI</span>}
            </div>
            {aiCompare && (
              <div className="border rounded p-3 text-sm whitespace-pre-wrap prose prose-invert max-w-none">
                <ReactMarkdown>{aiCompare}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
