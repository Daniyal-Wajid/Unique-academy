import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { todayInKarachi } from "@/lib/utils";
import type { AttendanceLog, Device } from "@/lib/types/database";

export type RecentAttendanceLogItem = AttendanceLog & {
  students?: {
    full_name: string;
    student_code: string;
  } | null;
};

export type DashboardStats = {
  configured: boolean;
  error: string | null;
  totalStudents: number;
  presentStudents: number;
  absentStudents: number;
  pendingFeeStudents: number;
  outstandingFees: number;
  devices: Device[];
  recentLogs: RecentAttendanceLogItem[];

  /* -----------------------------------------------------------------------
   * Commented out for future extension. Uncomment fields + queries below:
   * -----------------------------------------------------------------------
  totalStaff: number;
  lateStudents: number;
  staffPresent: number;
  staffTotal: number;
  todayCollection: number;
  monthlyCollection: number;
  ----------------------------------------------------------------------- */
};

const emptyStats: DashboardStats = {
  configured: false,
  error: null,
  totalStudents: 0,
  presentStudents: 0,
  absentStudents: 0,
  pendingFeeStudents: 0,
  outstandingFees: 0,
  devices: [],
  recentLogs: [],

  /* -----------------------------------------------------------------------
   * Commented out for future extension:
   * -----------------------------------------------------------------------
  totalStaff: 0,
  lateStudents: 0,
  staffPresent: 0,
  staffTotal: 0,
  todayCollection: 0,
  monthlyCollection: 0,
  ----------------------------------------------------------------------- */
};

/* Commented out — only needed when payments module is enabled:
function sumAmount(rows: { amount: string | number }[] | null) {
  return (rows ?? []).reduce((total, row) => total + Number(row.amount ?? 0), 0);
}
*/

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!isSupabaseConfigured()) {
    return { ...emptyStats, configured: false };
  }

  try {
    const supabase = await createClient();
    const today = todayInKarachi();

    const [
      students,
      presentStudents,
      absentStudents,
      outstanding,
      pendingStudents,
      devices,
      recentLogs,

      /* -------------------------------------------------------------------
       * Commented out for future extension. Uncomment queries below:
       * -------------------------------------------------------------------
      staff,
      lateStudents,
      staffPresent,
      todayPayments,
      monthPayments,
      ------------------------------------------------------------------- */
    ] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase
        .from("daily_attendance")
        .select("id", { count: "exact", head: true })
        .eq("person_type", "student")
        .eq("attendance_date", today)
        .eq("status", "present"),
      supabase
        .from("daily_attendance")
        .select("id", { count: "exact", head: true })
        .eq("person_type", "student")
        .eq("attendance_date", today)
        .eq("status", "absent"),
      supabase.from("invoices").select("total_amount, paid_amount").in("status", ["unpaid", "partial", "overdue"]),
      supabase.from("invoices").select("student_id").in("status", ["unpaid", "partial", "overdue"]),
      supabase.from("devices").select("*").eq("is_active", true).order("name"),
      supabase
        .from("attendance_logs")
        .select("*, students ( full_name, student_code )")
        .order("punched_at", { ascending: false })
        .limit(8),

      /* -------------------------------------------------------------------
       * Commented out for future extension:
       * -------------------------------------------------------------------
      supabase.from("staff").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase
        .from("daily_attendance")
        .select("id", { count: "exact", head: true })
        .eq("person_type", "student")
        .eq("attendance_date", today)
        .eq("status", "late"),
      supabase
        .from("daily_attendance")
        .select("id", { count: "exact", head: true })
        .eq("person_type", "staff")
        .eq("attendance_date", today)
        .in("status", ["present", "late", "half_day"]),
      supabase.from("payments").select("amount").gte("received_at", `${today}T00:00:00+05:00`).lte("received_at", `${today}T23:59:59+05:00`),
      supabase.from("payments").select("amount").gte("received_at", `${monthStart}T00:00:00+05:00`),
      ------------------------------------------------------------------- */
    ]);

    const firstError =
      students.error?.message ||
      presentStudents.error?.message ||
      devices.error?.message ||
      null;

    const outstandingFees = (outstanding.data ?? []).reduce((total, invoice) => {
      return total + Number(invoice.total_amount ?? 0) - Number(invoice.paid_amount ?? 0);
    }, 0);

    const pendingFeeStudents = new Set((pendingStudents.data ?? []).map((row) => row.student_id)).size;

    return {
      configured: true,
      error: firstError,
      totalStudents: students.count ?? 0,
      presentStudents: presentStudents.count ?? 0,
      absentStudents: absentStudents.count ?? 0,
      outstandingFees,
      pendingFeeStudents,
      devices: devices.data ?? [],
      recentLogs: (recentLogs.data as unknown as RecentAttendanceLogItem[]) ?? [],

      /* -------------------------------------------------------------------
       * Commented out for future extension:
       * -------------------------------------------------------------------
      totalStaff: staff.count ?? 0,
      lateStudents: lateStudents.count ?? 0,
      staffPresent: staffPresent.count ?? 0,
      staffTotal: staff.count ?? 0,
      todayCollection: sumAmount(todayPayments.data),
      monthlyCollection: sumAmount(monthPayments.data),
      ------------------------------------------------------------------- */
    };
  } catch (error) {
    return {
      ...emptyStats,
      configured: true,
      error: error instanceof Error ? error.message : "Unable to load dashboard data",
    };
  }
}
