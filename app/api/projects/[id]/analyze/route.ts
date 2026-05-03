import { NextResponse } from "next/server";
import { getProject, updateAnalysis } from "@/lib/db";
import { diagnoseProject } from "@/lib/analyzer/diagnose";
import { suggestImprovements } from "@/lib/analyzer/suggest";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    const diagnosis = await diagnoseProject(project);
    const enriched = { ...project, ...diagnosis };
    const suggestions = await suggestImprovements(enriched);

    updateAnalysis(
      id,
      diagnosis.healthScore,
      diagnosis.healthStatus,
      diagnosis.diagnosis,
      suggestions
    );

    return NextResponse.json({
      ...diagnosis,
      suggestions,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
