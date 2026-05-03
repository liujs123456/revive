import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Suggestion } from "@/lib/types";

const EFFORT_COLOR: Record<Suggestion["effort"], string> = {
  small: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  large: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

const IMPACT_COLOR: Record<Suggestion["impact"], string> = {
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  high: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
};

export function SuggestionCard({ s }: { s: Suggestion }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <h4 className="font-semibold text-sm leading-snug">{s.title}</h4>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">{s.detail}</p>
        <div className="flex gap-2">
          <Badge variant="outline" className={cn("text-[10px] uppercase", EFFORT_COLOR[s.effort])}>
            {s.effort} effort
          </Badge>
          <Badge variant="outline" className={cn("text-[10px] uppercase", IMPACT_COLOR[s.impact])}>
            {s.impact} impact
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
