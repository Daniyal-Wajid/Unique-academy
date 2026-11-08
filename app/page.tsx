import {
  ClipboardCheck,
  GraduationCap,
  UserRoundCheck,
  UserX,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { DeviceStatusCard } from "@/components/dashboard/device-status";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StatCard } from "@/components/dashboard/stat-card";
import { getCurrentProfile } from "@/lib/services/auth";
import { getDashboardStats } from "@/lib/services/dashboard";
import { formatPkr } from "@/lib/utils";

/* -------------------------------------------------------------------------
 * Commented out imports for future extension:
 * -------------------------------------------------------------------------
import { Banknote, Clock3, Users } from "lucide-react";
------------------------------------------------------------------------- */

export default async function DashboardPage() {
  const [profile, stats] = await Promise.all([getCurrentProfile(), getDashboardStats()]);

  return (
    <AppShell title="Dashboard" profile={profile}>
      {stats.error ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {stats.error}. Apply `supabase/migrations/20261031120000_init.sql` in the Supabase SQL editor if tables are missing.
        </div>
      ) : null}
      {!stats.configured ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Supabase keys are not configured. Copy `.env.example` to `.env.local` and restart the app.
        </div>
      ) : null}

      {/* Quick Action Banners for Absentee SMS and Fee Status SMS */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 p-4 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium text-rose-900 dark:text-rose-200">
              <UserX className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <span>Absentee SMS Service</span>
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-300">
              {stats.absentStudents > 0
                ? `${stats.absentStudents} student${stats.absentStudents > 1 ? "s are" : " is"} absent today without notice.`
                : "No absent students recorded today."}
            </p>
          </div>
          <a
            href="/sms"
            className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow transition hover:bg-rose-700"
          >
            Send Absent Alerts →
          </a>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
              <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>Fee Status SMS Service</span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {stats.pendingFeeStudents > 0
                ? `${stats.pendingFeeStudents} student${stats.pendingFeeStudents > 1 ? "s have" : " has"} pending dues (${formatPkr(stats.outstandingFees)}).`
                : "All student fees are up to date."}
            </p>
          </div>
          <a
            href="/sms"
            className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow transition hover:bg-amber-700"
          >
            Send Fee Reminders →
          </a>
        </div>
      </div>

      {/* Core Operational Stats: Fingerprint Attendance & Fee Status */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total students"
          value={stats.totalStudents}
          icon={GraduationCap}
          hint="Enrolled students"
          tone="info"
        />
        <StatCard
          title="Present students"
          value={stats.presentStudents}
          icon={UserRoundCheck}
          tone="success"
          hint="Fingerprint punches today"
        />
        <StatCard
          title="Absent students"
          value={stats.absentStudents}
          icon={UserX}
          tone="danger"
          hint="No punch recorded today"
        />
        <StatCard
          title="Pending fee students"
          value={stats.pendingFeeStudents}
          icon={Wallet}
          tone="warning"
          hint={`${formatPkr(stats.outstandingFees)} due`}
        />

        {/* ---------------------------------------------------------------------
         * Commented out for future extension. Uncomment below cards as needed:
         * ---------------------------------------------------------------------
        <StatCard title="Late students" value={stats.lateStudents} icon={Clock3} tone="warning" hint="Today" />
        <StatCard title="Total staff" value={stats.totalStaff} icon={Users} hint="Active records" />
        <StatCard
          title="Staff attendance"
          value={`${stats.staffPresent}/${stats.staffTotal}`}
          icon={ClipboardCheck}
          hint="Present, late, or half-day today"
        />
        <StatCard title="Today's collection" value={formatPkr(stats.todayCollection)} icon={Banknote} tone="success" />
        <StatCard title="Monthly collection" value={formatPkr(stats.monthlyCollection)} icon={Wallet} hint="This calendar month" />
        --------------------------------------------------------------------- */}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <DeviceStatusCard devices={stats.devices} />
        <RecentActivity logs={stats.recentLogs} />
      </div>
    </AppShell>
  );
}
