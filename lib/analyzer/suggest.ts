import { getClaude, MODELS } from "../claude";
import type { Project, Suggestion } from "../types";

const SYSTEM_PROMPT = `You are a sharp staff engineer + product advisor helping a developer decide what to do with their existing projects to make them more useful, more impressive on a resume, or more interesting to work on.

For one project, generate exactly 6 actionable suggestions split across 4 categories:
- technical (2 suggestions): code quality, missing tests, CI, dep upgrades, refactors, performance
- feature (2 suggestions): NEW features that would 10x the project's usefulness or "wow" factor
- resume (1 suggestion): how to make the project more impressive to a hiring manager — better README, demo video, case study, deployment, screenshots
- pivot (1 suggestion): if this project is dead or limited, what could it be reborn as? bold ideas welcome

Each suggestion has:
- title: short imperative phrase, < 60 chars
- detail: 2-3 sentences with concrete WHY and HOW
- effort: small (< 1 day) | medium (1-5 days) | large (> 5 days)
- impact: low | medium | high

Be specific to THIS project — don't give generic advice. Reference what the project actually does.

Respond with ONLY valid JSON, no markdown:
{
  "suggestions": [
    { "category": "technical", "title": "...", "detail": "...", "effort": "small", "impact": "high" },
    ... (6 total)
  ]
}`;

export async function suggestImprovements(project: Project): Promise<Suggestion[]> {
  const meta = project.metadata;
  const ageDays = Math.floor(
    (Date.now() - new Date(meta.lastModified).getTime()) / (1000 * 60 * 60 * 24)
  );

  const userPrompt = `Project: ${project.name}
Description: ${project.description ?? "(no description)"}
Primary language: ${meta.primaryLanguage ?? "unknown"}
Languages: ${meta.languages?.join(", ") ?? "unknown"}
Source: ${project.source}${project.url ? ` (${project.url})` : ""}

Current state:
- Last modified: ${ageDays} days ago
- Has README: ${meta.hasReadme}
- Has tests: ${meta.hasTests}
- Has CI: ${meta.hasCi}
- Has deployment: ${meta.hasDeployment}
- Stars: ${meta.stars ?? "(local)"}
${project.healthStatus ? `- Current diagnosis: ${project.healthStatus} (score ${project.healthScore}/100)` : ""}
${project.diagnosis ? `- Assessment: ${project.diagnosis}` : ""}

README preview:
${meta.readmePreview ?? "(no README)"}

Generate 6 specific, actionable suggestions. Respond with JSON only.`;

  const client = getClaude();
  const res = await client.messages.create({
    model: MODELS.smart,
    max_tokens: 2500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Suggest: no JSON in response: ${text.slice(0, 200)}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.suggestions as Suggestion[];
}
