"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { HealthBadge } from "@/components/health-badge";
import { SuggestionCard } from "@/components/suggestion-card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  ArrowLeft,
  GitBranch,
  Folder,
  ExternalLink,
  Sparkles,
  Wrench,
  Lightbulb,
  FileText,
  Repeat,
  FolderOpen,
} from "lucide-react";
import type { Project, Suggestion, SuggestionCategory } from "@/lib/types";

const CATEGORY_META: Record<
  SuggestionCategory,
  { label: string; icon: typeof Wrench; color: string }
> = {
  technical: { label: "Technical", icon: Wrench, color: "text-blue-600" },
  feature: { label: "Features", icon: Lightbulb, color: "text-amber-600" },
  resume: { label: "Resume Polish", icon: FileText, color: "text-emerald-600" },
  pivot: { label: "Pivot Ideas", icon: Repeat, color: "text-violet-600" },
};

const CATEGORY_ORDER: SuggestionCategory[] = ["technical", "feature", "resume", "pivot"];

export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  async function load() {
    const res = await fetch(`/api/projects/${id}`);
    if (!res.ok) {
      toast.error("Project not found");
      return;
    }
    const data = (await res.json()) as { project: Project };
    setProject(data.project);
  }

  async function analyze() {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/projects/${id}/analyze`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Analyze failed");
      }
      toast.success("Analysis complete");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  if (project === null) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const Icon = project.source === "github" ? GitBranch : Folder;
  const grouped = (project.suggestions ?? []).reduce<Record<string, Suggestion[]>>(
    (acc, s) => {
      (acc[s.category] ??= []).push(s);
      return acc;
    },
    {}
  );

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>

        <header className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <Icon className="h-6 w-6 text-muted-foreground shrink-0" />
              <h1 className="text-3xl font-bold tracking-tight truncate">{project.name}</h1>
            </div>
            <HealthBadge status={project.healthStatus} score={project.healthScore} />
          </div>
          <p className="text-muted-foreground mb-3">
            {project.description ?? "No description available"}
          </p>
          <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
            {project.metadata.primaryLanguage && (
              <Badge variant="secondary" className="font-mono">
                {project.metadata.primaryLanguage}
              </Badge>
            )}
            <span className="font-mono opacity-70">{project.path}</span>
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                Open on GitHub
              </a>
            )}
            {project.source === "local" && (
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch(`/api/projects/${id}/reveal`, { method: "POST" });
                  if (!res.ok) {
                    const err = await res.json();
                    toast.error(err.error ?? "Failed to open in Finder");
                  }
                }}
                className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
              >
                <FolderOpen className="h-3 w-3" />
                Reveal in Finder
              </button>
            )}
          </div>
        </header>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
              <Stat label="README" ok={project.metadata.hasReadme} />
              <Stat label="Tests" ok={project.metadata.hasTests} />
              <Stat label="CI" ok={project.metadata.hasCi} />
              <Stat label="Deployment" ok={project.metadata.hasDeployment} />
              <Stat label="package.json" ok={project.metadata.hasPackageJson} />
            </div>
          </CardContent>
        </Card>

        {project.diagnosis ? (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Diagnosis
            </h2>
            <Card>
              <CardContent className="pt-6">
                <p className="leading-relaxed">{project.diagnosis}</p>
              </CardContent>
            </Card>
          </section>
        ) : null}

        <Separator className="my-8" />

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Suggestions</h2>
            <Button onClick={analyze} disabled={analyzing}>
              <Sparkles className={`h-4 w-4 ${analyzing ? "animate-pulse" : ""}`} />
              {analyzing
                ? "Analyzing…"
                : project.suggestions
                  ? "Re-analyze"
                  : "Analyze with Claude"}
            </Button>
          </div>

          {!project.suggestions ? (
            <p className="text-muted-foreground text-sm">
              No analysis yet. Click &quot;Analyze with Claude&quot; to generate suggestions.
            </p>
          ) : (
            <div className="space-y-8">
              {CATEGORY_ORDER.map((cat) => {
                const items = grouped[cat];
                if (!items?.length) return null;
                const meta = CATEGORY_META[cat];
                const CatIcon = meta.icon;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-3">
                      <CatIcon className={`h-4 w-4 ${meta.color}`} />
                      <h3 className="font-semibold">{meta.label}</h3>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {items.map((s, i) => (
                        <SuggestionCard key={i} s={s} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`font-semibold ${ok ? "text-emerald-600" : "text-muted-foreground/50"}`}>
        {ok ? "Yes" : "No"}
      </span>
    </div>
  );
}
