import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

export async function POST(req: Request) {
  const { token } = (await req.json()) as { token: string };
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Token is required" },
      { status: 400 }
    );
  }

  try {
    const octokit = new Octokit({ auth: token });
    const { data: user } = await octokit.users.getAuthenticated();
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      per_page: 1,
      type: "owner",
    });
    return NextResponse.json({
      ok: true,
      username: user.login,
      repoCountSample: repos.length,
      avatarUrl: user.avatar_url,
    });
  } catch (err) {
    const msg = (err as Error).message;
    return NextResponse.json(
      {
        ok: false,
        error: msg.includes("Bad credentials") || msg.includes("401")
          ? "Invalid token"
          : msg.includes("Resource not accessible") || msg.includes("403")
          ? "Token missing required permissions (need Contents: Read + Metadata: Read)"
          : msg,
      },
      { status: 400 }
    );
  }
}
