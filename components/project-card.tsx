import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthBadge } from "@/components/health-badge";
import { GitBranch, Folder, Star, Clock } from "lucide-react";
import type { Project } from "@/lib/types";

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function ProjectCard({ project }: { project: Project }) {
  const Icon = project.source === "github" ? GitBranch : Folder;
  return (
    <Link href={`/project/${project.id}`} className="block group">
      <Card className="h-full transition-all hover:shadow-md hover:border-foreground/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <h3 className="font-semibold truncate group-hover:underline">{project.name}</h3>
            </div>
            <HealthBadge status={project.healthStatus} score={project.healthScore} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {project.description ?? "No description"}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {project.metadata.primaryLanguage && (
              <Badge variant="secondary" className="font-mono text-[10px]">
                {project.metadata.primaryLanguage}
              </Badge>
            )}
            {project.metadata.stars !== undefined && project.metadata.stars > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {project.metadata.stars}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {relativeTime(project.metadata.lastModified)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
