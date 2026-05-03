import { Octokit } from "@octokit/rest";
import crypto from "node:crypto";
import type { Project, ProjectMetadata } from "../types";

let _octokit: Octokit | null = null;

function getOctokit(): Octokit {
  if (_octokit) return _octokit;
  const auth = process.env.GITHUB_TOKEN;
  if (!auth) throw new Error("GITHUB_TOKEN is not set in .env.local");
  _octokit = new Octokit({ auth });
  return _octokit;
}

function projectId(fullName: string): string {
  return "github:" + crypto.createHash("sha1").update(fullName).digest("hex").slice(0, 16);
}

async function fetchReadme(owner: string, repo: string): Promise<string | undefined> {
  try {
    const res = await getOctokit().repos.getReadme({ owner, repo });
    const content = Buffer.from(res.data.content, "base64").toString("utf-8");
    return content.slice(0, 5000);
  } catch {
    return undefined;
  }
}

async function fetchLanguages(owner: string, repo: string): Promise<string[]> {
  try {
    const res = await getOctokit().repos.listLanguages({ owner, repo });
    return Object.entries(res.data)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([lang]) => lang);
  } catch {
    return [];
  }
}

async function detectFiles(owner: string, repo: string, defaultBranch: string): Promise<{
  hasTests: boolean;
  hasCi: boolean;
  hasPackageJson: boolean;
  hasDeployment: boolean;
}> {
  try {
    const res = await getOctokit().git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: "1",
    });
    const paths = res.data.tree.map((t) => t.path ?? "").filter(Boolean);
    return {
      hasTests: paths.some(
        (p) => /(^|\/)(tests?|__tests__|spec)(\/|$)/.test(p) || /\.(test|spec)\./.test(p)
      ),
      hasCi: paths.some(
        (p) =>
          p.startsWith(".github/workflows/") ||
          p === ".gitlab-ci.yml" ||
          p === ".circleci/config.yml"
      ),
      hasPackageJson: paths.includes("package.json"),
      hasDeployment: paths.some((p) =>
        ["vercel.json", "netlify.toml", "Dockerfile", "fly.toml", "railway.json"].includes(p)
      ),
    };
  } catch {
    return {
      hasTests: false,
      hasCi: false,
      hasPackageJson: false,
      hasDeployment: false,
    };
  }
}

export async function scanGithubRepos(username: string): Promise<Project[]> {
  const octokit = getOctokit();
  const projects: Project[] = [];

  const repos = await octokit.paginate(octokit.repos.listForUser, {
    username,
    per_page: 100,
    type: "owner",
    sort: "pushed",
  });

  for (const repo of repos) {
    if (repo.fork || repo.archived) continue;

    try {
      const [readme, languages, fileFlags] = await Promise.all([
        fetchReadme(repo.owner.login, repo.name),
        fetchLanguages(repo.owner.login, repo.name),
        detectFiles(repo.owner.login, repo.name, repo.default_branch ?? "main"),
      ]);

      const metadata: ProjectMetadata = {
        hasReadme: !!readme,
        hasTests: fileFlags.hasTests,
        hasCi: fileFlags.hasCi,
        hasPackageJson: fileFlags.hasPackageJson,
        hasDeployment: fileFlags.hasDeployment,
        primaryLanguage: languages[0] ?? repo.language ?? undefined,
        languages,
        lastModified: repo.pushed_at ?? repo.updated_at ?? new Date().toISOString(),
        stars: repo.stargazers_count,
        openIssues: repo.open_issues_count,
        readmePreview: readme,
      };

      projects.push({
        id: projectId(repo.full_name),
        source: "github",
        name: repo.name,
        path: repo.full_name,
        description: repo.description ?? undefined,
        url: repo.html_url,
        metadata,
        scannedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn(`Failed to scan github repo ${repo.full_name}:`, err);
    }
  }

  return projects;
}
