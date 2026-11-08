import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInKarachi } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const punches = Array.isArray(payload) ? payload : [payload];

    if (punches.length === 0) {
      return NextResponse.json({ error: "Empty punch payload" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch student mapping for zk_user_ids
    const zkUserIds = punches.map((p) => String(p.zk_user_id)).filter(Boolean);
    const { data: students } = await supabase
      .from("students")
      .select("id, zk_user_id, full_name")
      .in("zk_user_id", zkUserIds);

    const studentMap = new Map((students ?? []).map((s) => [s.zk_user_id, s.id]));

function parseToKarachiIso(val?: string) {
  if (!val) return new Date().toISOString();
  if (val.endsWith("Z") || val.includes("+") || (val.length > 10 && val.slice(10).includes("-"))) {
    return val;
  }
  return `${val}+05:00`;
}

    // 2. Prepare attendance_logs rows
    const logRows = punches.map((p) => {
      const zkId = String(p.zk_user_id);
      const studentId = studentMap.get(zkId) ?? null;
      return {
        zk_user_id: zkId,
        punched_at: parseToKarachiIso(p.punched_at),
        punch_type: (p.punch_type as any) || "check_in",
        person_type: "student" as const,
        student_id: studentId,
        raw_payload: p,
      };
    });

    const { error: logErr } = await supabase
      .from("attendance_logs")
      .upsert(logRows, { onConflict: "device_id,zk_user_id,punched_at", ignoreDuplicates: true });

    if (logErr) {
      return NextResponse.json({ error: logErr.message }, { status: 500 });
    }

    // 3. Automatically mark daily_attendance as present for each student
    const today = todayInKarachi();
    for (const log of logRows) {
      if (log.student_id) {
        const { data: existing } = await supabase
          .from("daily_attendance")
          .select("id")
          .eq("student_id", log.student_id)
          .eq("attendance_date", today)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("daily_attendance")
            .update({
              status: "present",
              check_in_at: log.punched_at,
              source: "device",
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("daily_attendance").insert({
            person_type: "student",
            student_id: log.student_id,
            attendance_date: today,
            status: "present",
            check_in_at: log.punched_at,
            source: "device",
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: logRows.length,
      matchedStudents: logRows.filter((l) => l.student_id !== null).length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record punch" },
      { status: 500 }
    );
  }
}
