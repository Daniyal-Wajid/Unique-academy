import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { todayInKarachi } from "@/lib/utils";
import type { AttendanceLog } from "@/lib/types/database";

export type DailyStudentAttendance = {
  studentId: string;
  studentCode: string;
  fullName: string;
  fatherName: string;
  parentPhone: string;
  zkUserId: string | null;
  status: "present" | "absent" | "late" | "unmarked";
  checkInAt: string | null;
  minutesLate: number;
  attendanceId?: string;
};

export async function getAttendanceOverview(date = todayInKarachi()) {
  if (!isSupabaseConfigured()) {
    return {
      date,
      configured: false,
      records: [] as DailyStudentAttendance[],
      rawLogs: [] as AttendanceLog[],
      summary: { total: 0, present: 0, absent: 0, late: 0, unmarked: 0 },
    };
  }

  const supabase = await createClient();

  // 1. Fetch all active students
  const { data: students, error: studentErr } = await supabase
    .from("students")
    .select("id, student_code, full_name, father_name, parent_phone, zk_user_id")
    .eq("is_active", true)
    .order("student_code", { ascending: true });

  if (studentErr || !students) {
    return {
      date,
      configured: true,
      error: studentErr?.message ?? "Failed to load students",
      records: [],
      rawLogs: [],
      summary: { total: 0, present: 0, absent: 0, late: 0, unmarked: 0 },
    };
  }

  // 2. Fetch daily attendance for this date
  const { data: dailyRecords } = await supabase
    .from("daily_attendance")
    .select("*")
    .eq("person_type", "student")
    .eq("attendance_date", date);

  // 3. Fetch raw fingerprint punches for this date
  const startOfDay = `${date}T00:00:00+05:00`;
  const endOfDay = `${date}T23:59:59+05:00`;

  const { data: rawLogs } = await supabase
    .from("attendance_logs")
    .select("*")
    .gte("punched_at", startOfDay)
    .lte("punched_at", endOfDay)
    .order("punched_at", { ascending: false });

  // Map daily attendance by student_id
  const dailyMap = new Map((dailyRecords ?? []).map((r) => [r.student_id, r]));

  // Combine students with attendance status
  const records: DailyStudentAttendance[] = students.map((s) => {
    const daily = dailyMap.get(s.id);
    return {
      studentId: s.id,
      studentCode: s.student_code,
      fullName: s.full_name,
      fatherName: s.father_name,
      parentPhone: s.parent_phone,
      zkUserId: s.zk_user_id,
      status: (daily?.status as any) ?? "unmarked",
      checkInAt: daily?.check_in_at ?? null,
      minutesLate: daily?.minutes_late ?? 0,
      attendanceId: daily?.id,
    };
  });

  const summary = {
    total: records.length,
    present: records.filter((r) => r.status === "present").length,
    absent: records.filter((r) => r.status === "absent").length,
    late: records.filter((r) => r.status === "late").length,
    unmarked: records.filter((r) => r.status === "unmarked").length,
  };

  return {
    date,
    configured: true,
    records,
    rawLogs: (rawLogs as AttendanceLog[]) ?? [],
    summary,
  };
}

/**
 * Process biometric punches for a given date:
 * - Match punches to students by zk_user_id
 * - If student punched, mark as 'present' (or 'late' if after threshold)
 * - If student did not punch, mark as 'absent'
 */
export async function syncAndMarkDailyAttendance(date = todayInKarachi()) {
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, zk_user_id")
    .eq("is_active", true);

  if (!students || students.length === 0) {
    return { success: false, message: "No active students found" };
  }

  const startOfDay = `${date}T00:00:00+05:00`;
  const endOfDay = `${date}T23:59:59+05:00`;

  const { data: logs } = await supabase
    .from("attendance_logs")
    .select("zk_user_id, punched_at")
    .gte("punched_at", startOfDay)
    .lte("punched_at", endOfDay)
    .order("punched_at", { ascending: true });

  // Map zk_user_id to earliest punch time
  const punchesByZkUser = new Map<string, string>();
  for (const log of logs ?? []) {
    if (log.zk_user_id && !punchesByZkUser.has(log.zk_user_id)) {
      punchesByZkUser.set(log.zk_user_id, log.punched_at);
    }
  }

  // Upsert attendance for each student
  const updates = students.map((s) => {
    const hasPunched = s.zk_user_id ? punchesByZkUser.has(s.zk_user_id) : false;
    const punchTime = s.zk_user_id ? punchesByZkUser.get(s.zk_user_id) : null;

    return {
      person_type: "student" as const,
      student_id: s.id,
      attendance_date: date,
      status: hasPunched ? ("present" as const) : ("absent" as const),
      check_in_at: punchTime ?? null,
      source: hasPunched ? "device" : "system_auto",
    };
  });

  // Fetch existing attendance records for today
  const { data: existingRecords } = await supabase
    .from("daily_attendance")
    .select("id, student_id")
    .eq("attendance_date", date);

  const existingMap = new Map((existingRecords ?? []).map((r) => [r.student_id, r.id]));

  for (const update of updates) {
    const existingId = existingMap.get(update.student_id);
    if (existingId) {
      await supabase
        .from("daily_attendance")
        .update({
          status: update.status,
          check_in_at: update.check_in_at,
          source: update.source,
        })
        .eq("id", existingId);
    } else {
      await supabase.from("daily_attendance").insert(update);
    }
  }

  return {
    success: true,
    processed: updates.length,
    present: updates.filter((u) => u.status === "present").length,
    absent: updates.filter((u) => u.status === "absent").length,
  };
}
