"use client";

import { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Clock,
  HelpCircle,
  X,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DayStats = {
  present: number;
  absent: number;
  late: number;
  total: number;
};

type StudentDetail = {
  studentId: string;
  studentCode: string;
  fullName: string;
  fatherName: string;
  parentPhone: string;
  status: "present" | "absent" | "late" | "unmarked";
  checkInAt: string | null;
  minutesLate: number;
};

export function AttendanceCalendarView({ initialDate }: { initialDate: string }) {
  const [currentYear, setCurrentYear] = useState(() => parseInt(initialDate.slice(0, 4), 10));
  const [currentMonth, setCurrentMonth] = useState(() => parseInt(initialDate.slice(5, 7), 10) - 1);
  const [monthStats, setMonthStats] = useState<Record<string, DayStats>>({});
  const [loading, setLoading] = useState(false);

  // Selected date dialog state
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const [dateDetail, setDateDetail] = useState<{
    summary: { total: number; present: number; absent: number; late: number; unmarked: number };
    students: StudentDetail[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSearch, setDetailSearch] = useState("");
  const [detailFilter, setDetailFilter] = useState<string>("all");

  const monthString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

  // Fetch month calendar data
  useEffect(() => {
    async function fetchMonthData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/attendance/calendar?month=${monthString}`);
        const data = await res.json();
        if (data.dayStats) {
          setMonthStats(data.dayStats);
        }
      } catch (err) {
        console.error("Failed to load month attendance stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMonthData();
  }, [monthString]);

  // Fetch specific date details
  useEffect(() => {
    if (!selectedDate) return;
    async function fetchDateDetail() {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/attendance/calendar?date=${selectedDate}`);
        const data = await res.json();
        if (data.students) {
          setDateDetail({ summary: data.summary, students: data.students });
        }
      } catch (err) {
        console.error("Failed to load date details", err);
      } finally {
        setDetailLoading(false);
      }
    }
    fetchDateDetail();
  }, [selectedDate]);

  function handlePrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  // Days in month calculation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
  const monthName = new Date(currentYear, currentMonth, 1).toLocaleString("en-US", { month: "long" });

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blankDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const filteredStudents = (dateDetail?.students ?? []).filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(detailSearch.toLowerCase()) ||
      s.studentCode.toLowerCase().includes(detailSearch.toLowerCase()) ||
      s.parentPhone.includes(detailSearch);

    const matchesStatus = detailFilter === "all" || s.status === detailFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card className="border-border">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Attendance History Calendar
            </CardTitle>
            <CardDescription>
              Click any date to see exact student attendance records, punch timings, and absences.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevMonth} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-sm min-w-[130px] text-center">
              {monthName} {currentYear}
            </span>
            <Button variant="outline" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-2 sm:p-4">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-semibold text-muted-foreground pb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {blankDays.map((b) => (
              <div key={`blank-${b}`} className="min-h-[60px] sm:min-h-[85px] rounded-lg bg-muted/10 border border-transparent" />
            ))}

            {daysArray.map((day) => {
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const stats = monthStats[dateStr];
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === initialDate;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  className={`min-h-[60px] sm:min-h-[85px] p-1.5 sm:p-2 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20"
                      : isToday
                      ? "border-amber-400 bg-amber-50/40 dark:bg-amber-950/20"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                        isToday ? "bg-amber-500 text-white" : "text-foreground"
                      }`}
                    >
                      {day}
                    </span>
                    {stats && stats.total > 0 && (
                      <span className="hidden sm:inline-block text-[10px] text-muted-foreground font-mono">
                        {stats.total} recs
                      </span>
                    )}
                  </div>

                  {stats && (stats.present > 0 || stats.absent > 0) ? (
                    <div className="space-y-0.5 sm:space-y-1 mt-1">
                      {stats.present > 0 && (
                        <div className="flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1 py-0.5 rounded">
                          <span className="hidden sm:inline">Pres:</span>
                          <span className="font-bold">{stats.present}</span>
                        </div>
                      )}
                      {stats.absent > 0 && (
                        <div className="flex items-center justify-between text-[10px] text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 py-0.5 rounded">
                          <span className="hidden sm:inline">Abs:</span>
                          <span className="font-bold">{stats.absent}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground/50 italic text-center py-1">
                      No logs
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Breakdown Detail Panel */}
      {selectedDate && (
        <Card className="border-border shadow-md">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-3 bg-muted/20">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base text-foreground">
                  Detailed Attendance for {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  {selectedDate}
                </Badge>
              </div>
              <CardDescription>
                Live breakdown of biometric check-in punches and absentees for this day.
              </CardDescription>
            </div>

            {/* Quick stats for this day */}
            {dateDetail && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-600 text-white text-xs gap-1 py-1">
                  <UserCheck className="h-3 w-3" />
                  {dateDetail.summary.present} Present
                </Badge>
                <Badge className="bg-rose-600 text-white text-xs gap-1 py-1">
                  <UserX className="h-3 w-3" />
                  {dateDetail.summary.absent} Absent
                </Badge>
                {dateDetail.summary.late > 0 && (
                  <Badge className="bg-amber-600 text-white text-xs gap-1 py-1">
                    <Clock className="h-3 w-3" />
                    {dateDetail.summary.late} Late
                  </Badge>
                )}
                {dateDetail.summary.unmarked > 0 && (
                  <Badge variant="outline" className="text-xs gap-1 py-1">
                    <HelpCircle className="h-3 w-3" />
                    {dateDetail.summary.unmarked} Unmarked
                  </Badge>
                )}
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {/* Search and Filters */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search student or phone..."
                  value={detailSearch}
                  onChange={(e) => setDetailSearch(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {["all", "present", "absent", "late", "unmarked"].map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={detailFilter === status ? "default" : "outline"}
                    onClick={() => setDetailFilter(status)}
                    className="h-8 text-xs capitalize"
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>

            {/* Students Table */}
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Roll / Code</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Father Name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Biometric Check-in</th>
                    <th className="px-4 py-3">Parent Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {detailLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        Loading day details...
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No student records match the search filter for {selectedDate}.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.studentId} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs">{s.studentCode}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{s.fullName}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{s.fatherName}</td>
                        <td className="px-4 py-3">
                          <Badge
                            className={`text-xs gap-1 capitalize ${
                              s.status === "present"
                                ? "bg-emerald-600 text-white"
                                : s.status === "absent"
                                ? "bg-rose-600 text-white"
                                : s.status === "late"
                                ? "bg-amber-600 text-white"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {s.status === "present" ? (
                              <UserCheck className="h-3 w-3" />
                            ) : s.status === "absent" ? (
                              <UserX className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {s.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {s.checkInAt
                            ? new Date(s.checkInAt).toLocaleTimeString("en-PK", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })
                            : "-"}
                          {s.minutesLate > 0 && (
                            <span className="ml-1 text-amber-600 text-[11px]">
                              (+{s.minutesLate}m late)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground font-medium">
                          {s.parentPhone || <span className="text-rose-500 italic">No phone</span>}
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

