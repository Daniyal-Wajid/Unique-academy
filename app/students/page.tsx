import { AppShell } from "@/components/layout/app-shell";
import { StudentsManager } from "@/components/students/students-manager";
import { getCurrentProfile } from "@/lib/services/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

import type { Student } from "@/lib/types/database";

export default async function StudentsPage() {
  const profile = await getCurrentProfile();

  let students: Student[] = [];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("is_active", true)
      .order("student_code", { ascending: true });
    students = data ?? [];
  }

  return (
    <AppShell title="Students" profile={profile}>
      <StudentsManager initialStudents={students} />
    </AppShell>
  );
}
