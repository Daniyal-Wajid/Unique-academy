import { AppShell } from "@/components/layout/app-shell";
import { AttendanceManager } from "@/components/attendance/attendance-manager";
import { getCurrentProfile } from "@/lib/services/auth";
import { getAttendanceOverview } from "@/lib/services/attendance";
import { todayInKarachi } from "@/lib/utils";

export default async function AttendancePage() {
  const [profile, attendanceData] = await Promise.all([
    getCurrentProfile(),
    getAttendanceOverview(todayInKarachi()),
  ]);

  return (
    <AppShell title="Attendance" profile={profile}>
      {attendanceData.error && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {attendanceData.error}
        </div>
      )}
      {!attendanceData.configured && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Supabase is not configured. Add your API keys to `.env.local` to load attendance records.
        </div>
      )}

      <AttendanceManager
        initialRecords={attendanceData.records}
        initialLogs={attendanceData.rawLogs}
        initialSummary={attendanceData.summary}
        currentDate={todayInKarachi()}
      />
    </AppShell>
  );
}
