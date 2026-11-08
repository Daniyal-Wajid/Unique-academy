/*
 * ==========================================================================
 * REPORTS PAGE — Commented out for future extension.
 * Uncomment the code below to re-enable.
 * ==========================================================================

import { BarChart3 } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";
import { getCurrentProfile } from "@/lib/services/auth";

export default async function ReportsPage() {
  const profile = await getCurrentProfile();
  return (
    <ModulePlaceholder
      title="Reports"
      profile={profile}
      icon={BarChart3}
      phase="Phase 7"
      description="Attendance, fee, payment, and SMS reports with PDF and Excel export will be added after the operational modules."
    />
  );
}

*/

// Placeholder export to prevent Next.js build errors
export default function ReportsPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
      <p>This module is not yet enabled.</p>
    </div>
  );
}
