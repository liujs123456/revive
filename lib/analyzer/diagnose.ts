import { getClaude, MODELS } from "../claude";
import type { Project, HealthStatus } from "../types";

export interface Diagnosis {
  healthScore: number;
  healthStatus: HealthStatus;
  diagnosis: string;
}

const SYSTEM_PROMPT = `You are a senior engineer reviewing a developer's project portfolio. Your job is to quickly assess one project's "health" — is it abandoned, work-in-progress, shipped, or polished?

Health status definitions:
- abandoned: hasn't been touched in 6+ months, no clear product, low completion
- wip: actively being worked on but not finished, missing key features or polish
- shipped: it works, has docs, could be used by others — but lacks polish (tests, CI, deployment)
- polished: production-quality (tests, CI, deployment, good README, ongoing maintenance)

Score 0-100 reflects overall quality and completeness. Be honest, not generous.

Respond with ONLY valid JSON in this exact shape:
{
  "healthScore": <0-100>,
  "healthStatus": "<abandoned|wip|shipped|polished>",
  "diagnosis": "<2-3 sentence honest assessment of what this project is and its current state>"
}`;

export async function diagnoseProject(project: Project): Promise<Diagnosis> {
  const meta = project.metadata;
  const ageDays = Math.floor(
    (Date.now() - new Date(meta.lastModified).getTime()) / (1000 * 60 * 60 * 24)
  );

  const userPrompt = `Project: ${project.name}
Source: ${project.source}
Description: ${project.description ?? "(no description)"}
Primary language: ${meta.primaryLanguage ?? "unknown"}
Languages: ${meta.languages?.join(", ") ?? "unknown"}

Indicators:
- Has README: ${meta.hasReadme}
- Has tests: ${meta.hasTests}
- Has CI: ${meta.hasCi}
- Has deployment config: ${meta.hasDeployment}
- Has package.json: ${meta.hasPackageJson}
- Last modified: ${ageDays} days ago
- Commit count: ${meta.commitCount ?? "unknown"}
- Stars: ${meta.stars ?? "(local)"}
- Open issues: ${meta.openIssues ?? "(local)"}

README preview:
${meta.readmePreview ?? "(no README)"}

Assess this project. Respond with JSON only.`;

  const client = getClaude();
  const res = await client.messages.create({
    model: MODELS.fast,
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Diagnose: no JSON in response: ${text.slice(0, 200)}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    healthScore: Math.max(0, Math.min(100, Math.round(parsed.healthScore))),
    healthStatus: parsed.healthStatus,
    diagnosis: parsed.diagnosis,
  };
}
