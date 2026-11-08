import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInKarachi } from "@/lib/utils";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        supabaseConfigured: false,
        message: "Supabase credentials are not configured",
      },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1" || searchParams.get("force") === "true";

  try {
    const supabase = createAdminClient();
    const today = todayInKarachi();

    // 1. Ensure dummy sentinel student exists (is_active: false so it never receives SMS or clutters student rosters)
    let { data: sentinelStudent } = await supabase
      .from("students")
      .select("id, student_code")
      .eq("student_code", "SENTINEL")
      .maybeSingle();

    if (!sentinelStudent) {
      const { data: created, error: createErr } = await supabase
        .from("students")
        .insert({
          admission_number: "SYS-SENTINEL",
          student_code: "SENTINEL",
          full_name: "Supabase KeepAlive Sentinel",
          father_name: "Auto Sentinel",
          parent_phone: "03000000000",
          admission_date: today,
          monthly_fee: "0",
          discount: "0",
          is_active: false,
        })
        .select("id, student_code")
        .single();

      if (!createErr && created) {
        sentinelStudent = created;
      }
    }

    // 2. Check the most recent attendance record across real students
    const { data: latestRecords } = await supabase
      .from("daily_attendance")
      .select("attendance_date, created_at")
      .neq("student_id", sentinelStudent?.id ?? "")
      .order("attendance_date", { ascending: false })
      .limit(1);

    const latestDateStr = latestRecords?.[0]?.attendance_date;
    let daysSinceLastActivity = 999;
    if (latestDateStr) {
      const diffMs = new Date(today).getTime() - new Date(latestDateStr).getTime();
      daysSinceLastActivity = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    let sentinelTriggered = false;

    // 3. If inactive for >= 5 days (or force requested), mark attendance for sentinel student
    if (sentinelStudent && (daysSinceLastActivity >= 5 || force)) {
      const { data: existingAttendance } = await supabase
        .from("daily_attendance")
        .select("id")
        .eq("student_id", sentinelStudent.id)
        .eq("attendance_date", today)
        .maybeSingle();

      if (existingAttendance) {
        const { error: updateErr } = await supabase
          .from("daily_attendance")
          .update({
            status: "present",
            notes: `Keep-alive pulse updated at ${new Date().toISOString()} to prevent Supabase auto-pause.`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingAttendance.id);

        if (!updateErr) sentinelTriggered = true;
      } else {
        const { error: insertErr } = await supabase
          .from("daily_attendance")
          .insert({
            person_type: "student",
            student_id: sentinelStudent.id,
            attendance_date: today,
            status: "present",
            source: "system_keepalive",
            notes: "Automatic keep-alive attendance punch to prevent Supabase inactivity pausing.",
          });

        if (!insertErr) sentinelTriggered = true;
      }
    }

    return NextResponse.json({
      ok: true,
      supabaseConfigured: true,
      serverTime: new Date().toISOString(),
      todayKarachi: today,
      lastRealAttendanceDate: latestDateStr ?? null,
      daysSinceLastActivity,
      sentinelTriggered,
      keepAliveStatus: sentinelTriggered
        ? "Keep-alive attendance record logged for dummy sentinel student."
        : daysSinceLastActivity < 5
        ? `Database is actively in use (${daysSinceLastActivity} days since last record). No sentinel action needed.`
        : "Database ping completed.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Health check failed",
      },
      { status: 500 }
    );
  }
}
