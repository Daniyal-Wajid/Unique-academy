/*
 * ==========================================================================
 * PARENTS PAGE — Commented out for future extension.
 * Uncomment the code below to re-enable.
 * ==========================================================================

import { Contact } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";
import { getCurrentProfile } from "@/lib/services/auth";

export default async function ParentsPage() {
  const profile = await getCurrentProfile();
  return (
    <ModulePlaceholder
      title="Parents"
      profile={profile}
      icon={Contact}
      phase="Phase 2"
      description="Guardian contacts, multiple phone numbers, SMS preferences, and student relationships will be managed here."
    />
  );
}

*/

// Placeholder export to prevent Next.js build errors
export default function ParentsPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
      <p>This module is not yet enabled.</p>
    </div>
  );
}
