"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  Fingerprint,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Clock,
  Send,
  Sparkles,
  Calendar as CalendarIcon,
} from "lucide-react";
import { AttendanceCalendarView } from "./attendance-calendar-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { DailyStudentAttendance } from "@/lib/services/attendance";
import type { AttendanceLog } from "@/lib/types/database";

export function AttendanceManager({
  initialRecords,
  initialLogs,
  initialSummary,
  currentDate,
}: {
  initialRecords: DailyStudentAttendance[];
  initialLogs: AttendanceLog[];
  initialSummary: { total: number; present: number; absent: number; late: number; unmarked: number };
  currentDate: string;
}) {
  const [activeTab, setActiveTab] = useState<"sheet" | "calendar" | "logs">("sheet");
  const [records, setRecords] = useState(initialRecords);
  const [logs, setLogs] = useState(initialLogs);
  const [summary, setSummary] = useState(initialSummary);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.zkUserId && r.zkUserId.includes(searchTerm)) ||
      r.parentPhone.includes(searchTerm);

    const matchesStatus = statusFilter === "all" || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  async function handleProcessAttendance() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/attendance/process-absentees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: currentDate }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Attendance processed: ${data.present} present, ${data.absent} marked absent.`);
        window.location.reload();
      } else {
        setMessage(`Error: ${data.message || "Failed to process"}`);
      }
    } catch (err) {
      setMessage("Failed to trigger attendance calculation.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulatePunch(zkUserId: string) {
    if (!zkUserId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zk_user_id: zkUserId,
          punched_at: new Date().toISOString(),
          punch_type: "check_in",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Fingerprint punch received for Device User ID ${zkUserId}!`);
        window.location.reload();
      } else {
        setMessage(`Punch error: ${data.error}`);
      }
    } catch {
      setMessage("Failed to send punch simulation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Fingerprint Attendance
          </h2>
          <p className="text-sm text-muted-foreground">
            Showing biometric records for {currentDate} (Asia/Karachi)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleProcessAttendance}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Mark Absentees for Today
          </Button>

          <Link href="/sms">
            <Button size="sm" className="gap-2 bg-rose-600 hover:bg-rose-700 text-white">
              <Send className="h-4 w-4" />
              Send Absentee SMS ({summary.absent})
            </Button>
          </Link>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
          {message}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Students
            </CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">Enrolled active</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Present Today
            </CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {summary.present}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Fingerprint verified
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-rose-50/30 dark:bg-rose-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-rose-800 dark:text-rose-300">
              Absent Today
            </CardTitle>
            <UserX className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">
              {summary.absent}
            </div>
            <p className="text-xs text-rose-600 dark:text-rose-400">Needs Absentee SMS</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Unmarked / Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {summary.unmarked}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400">Awaiting scan or sync</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab("sheet")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "sheet"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          Today's Attendance Sheet ({records.length})
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "calendar"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarIcon className="h-4 w-4 text-primary" />
          Attendance Calendar & History
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "logs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Fingerprint className="h-4 w-4" />
          Raw Fingerprint Punches ({logs.length})
        </button>
      </div>

      {/* Tab 2: Attendance Calendar View */}
      {activeTab === "calendar" && (
        <AttendanceCalendarView initialDate={currentDate} />
      )}

      {/* Tab 1: Students Attendance Sheet */}
      {activeTab === "sheet" && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search student or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present Only</option>
                  <option value="absent">Absent Only</option>
                  <option value="unmarked">Unmarked Only</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-y border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Roll / Code</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Father Name</th>
                    <th className="px-4 py-3">Device User ID</th>
                    <th className="px-4 py-3">Check-in Time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Parent Mobile</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        {records.length === 0
                          ? "No students enrolled yet. Add students in the Students tab."
                          : "No students matching your filter."}
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => (
                      <tr key={r.studentId} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs">{r.studentCode}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{r.fullName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.fatherName}</td>
                        <td className="px-4 py-3">
                          {r.zkUserId ? (
                            <Badge variant="outline" className="font-mono text-xs gap-1">
                              <Fingerprint className="h-3 w-3 text-primary" />
                              ID: {r.zkUserId}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Not mapped</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {r.checkInAt ? (
                            new Date(r.checkInAt).toLocaleTimeString("en-US", {
                              timeZone: "Asia/Karachi",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {r.status === "present" && (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                              Present
                            </Badge>
                          )}
                          {r.status === "absent" && (
                            <Badge className="bg-rose-600 hover:bg-rose-700 text-white text-xs">
                              Absent
                            </Badge>
                          )}
                          {r.status === "late" && (
                            <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                              Late
                            </Badge>
                          )}
                          {r.status === "unmarked" && (
                            <Badge variant="secondary" className="text-xs">
                              Unmarked
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {r.parentPhone || "No phone"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.zkUserId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Test fingerprint punch for this student"
                              onClick={() => handleSimulatePunch(r.zkUserId!)}
                              disabled={loading}
                              className="h-7 text-xs gap-1 text-primary hover:bg-primary/10"
                            >
                              <Sparkles className="h-3 w-3" />
                              Test Punch
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Raw Fingerprint Punches */}
      {activeTab === "logs" && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Device Punch History</CardTitle>
            <CardDescription>
              Raw timestamps captured directly from the ZKTeco MB460 biometric reader.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-y border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Device User ID</th>
                    <th className="px-4 py-3">Punch Timestamp</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Matched Student ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        No biometric punch logs recorded for today yet.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs font-medium">
                          ID: {log.zk_user_id}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {new Date(log.punched_at).toLocaleString("en-PK", {
                            timeZone: "Asia/Karachi",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {log.punch_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {log.student_id ? (
                            <span className="text-emerald-600 font-mono">Matched</span>
                          ) : (
                            <span className="text-amber-600 italic">Unlinked ID</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
