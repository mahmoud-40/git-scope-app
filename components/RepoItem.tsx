import type { GitHubRepo } from "@/lib/types";

export type RepoItemProps = Readonly<{
  repo: GitHubRepo;
}>;

export function RepoItem({ repo }: RepoItemProps) {
  return (
    <div className="flex justify-between items-start gap-4">
      <div>
        <a className="font-medium hover:underline" href={repo.html_url} target="_blank" rel="noreferrer">
          {repo.full_name}
        </a>
        {repo.description && <div className="text-sm opacity-80 mt-1">{repo.description}</div>}
        <div className="text-xs opacity-70 mt-1">⭐ {repo.stargazers_count} · {repo.language || "Unknown"} · Forks: {repo.forks_count}</div>
      </div>
    </div>
  );
}
