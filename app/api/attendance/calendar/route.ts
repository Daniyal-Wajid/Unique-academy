import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // YYYY-MM
  const date = searchParams.get("date"); // YYYY-MM-DD

  const supabase = await createClient();

  // If specific date requested, return detailed student breakdown for that date
  if (date) {
    const { data: records, error } = await supabase
      .from("daily_attendance")
      .select(`
        id,
        person_type,
        student_id,
        attendance_date,
        status,
        check_in_at,
        check_out_at,
        minutes_late,
        students (
          student_code,
          full_name,
          father_name,
          parent_phone
        )
      `)
      .eq("person_type", "student")
      .eq("attendance_date", date);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also get active students list to see if any are unmarked
    const { data: allStudents } = await supabase
      .from("students")
      .select("id, student_code, full_name, father_name, parent_phone")
      .eq("is_active", true)
      .order("student_code", { ascending: true });

    const recordMap = new Map((records ?? []).map((r) => [r.student_id, r]));

    const detailedList = (allStudents ?? []).map((s) => {
      const rec = recordMap.get(s.id);
      return {
        studentId: s.id,
        studentCode: s.student_code,
        fullName: s.full_name,
        fatherName: s.father_name,
        parentPhone: s.parent_phone,
        status: rec?.status ?? "unmarked",
        checkInAt: rec?.check_in_at ?? null,
        minutesLate: rec?.minutes_late ?? 0,
      };
    });

    const summary = {
      total: detailedList.length,
      present: detailedList.filter((r) => r.status === "present").length,
      absent: detailedList.filter((r) => r.status === "absent").length,
      late: detailedList.filter((r) => r.status === "late").length,
      unmarked: detailedList.filter((r) => r.status === "unmarked").length,
    };

    return NextResponse.json({
      date,
      summary,
      students: detailedList,
    });
  }

  // Month-level aggregation for calendar view
  let query = supabase
    .from("daily_attendance")
    .select("attendance_date, status")
    .eq("person_type", "student");

  if (month) {
    query = query
      .gte("attendance_date", `${month}-01`)
      .lte("attendance_date", `${month}-31`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate by date
  const dayStats: Record<string, { present: number; absent: number; late: number; total: number }> = {};

  for (const row of data ?? []) {
    const d = row.attendance_date;
    if (!dayStats[d]) {
      dayStats[d] = { present: 0, absent: 0, late: 0, total: 0 };
    }
    dayStats[d].total += 1;
    if (row.status === "present") dayStats[d].present += 1;
    else if (row.status === "absent") dayStats[d].absent += 1;
    else if (row.status === "late") dayStats[d].late += 1;
  }

  return NextResponse.json({
    month,
    dayStats,
  });
}

