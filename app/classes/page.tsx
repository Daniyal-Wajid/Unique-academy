/*
 * ==========================================================================
 * CLASSES PAGE — Commented out for future extension.
 * Uncomment the code below to re-enable.
 * ==========================================================================

import { BookOpen } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";
import { getCurrentProfile } from "@/lib/services/auth";

export default async function ClassesPage() {
  const profile = await getCurrentProfile();
  return (
    <ModulePlaceholder
      title="Classes"
      profile={profile}
      icon={BookOpen}
      phase="Phase 2"
      description="Batches, teacher assignment, timings, and attendance rules will be configured here."
    />
  );
}

*/

// Placeholder export to prevent Next.js build errors
export default function ClassesPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
      <p>This module is not yet enabled.</p>
    </div>
  );
}
