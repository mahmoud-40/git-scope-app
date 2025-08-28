import Image from "next/image";
import type { GitHubUser } from "@/lib/types";

export type UserHeaderProps = Readonly<{
  user: GitHubUser;
}>;

export function UserHeader({ user }: UserHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <Image src={user.avatar_url} alt="avatar" width={80} height={80} className="rounded-full" />
      <div>
        <div className="text-xl font-semibold">{user.name || user.login}</div>
        <div className="text-sm opacity-80">@{user.login}</div>
        {user.bio && <div className="text-sm mt-1">{user.bio}</div>}
        <div className="text-xs opacity-70 mt-1">
          Followers: {user.followers} · Following: {user.following} · Public repos: {user.public_repos}
        </div>
      </div>
    </div>
  );
}
