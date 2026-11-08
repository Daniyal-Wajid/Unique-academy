/*
 * ==========================================================================
 * STAFF PAGE — Commented out for future extension.
 * Uncomment the code below to re-enable.
 * ==========================================================================

import { Users } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";
import { getCurrentProfile } from "@/lib/services/auth";

export default async function StaffPage() {
  const profile = await getCurrentProfile();
  return (
    <ModulePlaceholder
      title="Staff"
      profile={profile}
      icon={Users}
      phase="Phase 2"
      description="Employee records, shifts, designations, and staff attendance history will be managed here."
    />
  );
}

*/

// Placeholder export to prevent Next.js build errors
export default function StaffPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
      <p>This module is not yet enabled.</p>
    </div>
  );
}
