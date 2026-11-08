import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    default: "bg-secondary text-primary",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-sky-50 text-sky-700",
  };

  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className={cn("rounded-lg p-2", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
