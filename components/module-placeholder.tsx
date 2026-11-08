import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/empty-state";
import type { Profile } from "@/lib/types/database";
import type { LucideIcon } from "lucide-react";

export function ModulePlaceholder({
  title,
  profile,
  icon,
  description,
  phase,
}: {
  title: string;
  profile: Profile | null;
  icon: LucideIcon;
  description: string;
  phase: string;
}) {
  return (
    <AppShell title={title} profile={profile}>
      <EmptyState
        icon={icon}
        title={`${title} is scheduled for ${phase}`}
        description={description}
      />
    </AppShell>
  );
}
