import { Badge } from "@/components/ui/badge";
import type { HealthStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: Record<HealthStatus, string> = {
  abandoned: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  wip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  shipped: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  polished: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
};

const LABELS: Record<HealthStatus, string> = {
  abandoned: "Abandoned",
  wip: "WIP",
  shipped: "Shipped",
  polished: "Polished",
};

export function HealthBadge({ status, score }: { status?: HealthStatus; score?: number }) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Not analyzed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[status])}>
      {LABELS[status]}
      {score !== undefined && <span className="ml-1.5 opacity-70">{score}</span>}
    </Badge>
  );
}
