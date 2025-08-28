export type GitHubUser = {
  login: string;
  avatar_url: string;
  html_url: string;
  name?: string | null;
  company?: string | null;
  blog?: string | null;
  location?: string | null;
  bio?: string | null;
  followers: number;
  following: number;
  public_repos: number;
};

export type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  forks_count: number;
};

export type GitHubEvent = {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string };
  payload?: {
    commits?: Array<{ sha: string; message: string }>;
    [key: string]: unknown;
  };
};

export type UserSnapshot = {
  username: string;
  user: GitHubUser;
  repos: GitHubRepo[];
  events?: GitHubEvent[];
};

export type CompareInput = {
  a: UserSnapshot;
  b: UserSnapshot;
};
