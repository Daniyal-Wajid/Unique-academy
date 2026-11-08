"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Send,
  Calendar,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export type FeeStudentRow = {
  studentId: string;
  studentCode: string;
  fullName: string;
  fatherName: string;
  parentPhone: string;
  monthlyFee: number;
  isPaid: boolean;
  paidAmount: number;
  pendingDue: number;
  invoiceId: string | null;
  updatedAt: string | null;
};

export function FeesManager({
  initialRecords,
  currentMonth,
  initialSummary,
}: {
  initialRecords: FeeStudentRow[];
  currentMonth: string;
  initialSummary: {
    total: number;
    paidCount: number;
    unpaidCount: number;
    totalExpected: number;
    totalCollected: number;
  };
}) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [records, setRecords] = useState(initialRecords);
  const [summary, setSummary] = useState(initialSummary);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Month changer
  async function handleMonthChange(newMonth: string) {
    setSelectedMonth(newMonth);
    try {
      const res = await fetch(`/api/fees/update?month=${newMonth}`);
      const data = await res.json();
      if (data.records) {
        setRecords(data.records);
        setSummary(data.summary);
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to load records for the selected month" });
    }
  }

  // Toggle single student fee paid status
  async function handleTogglePaid(student: FeeStudentRow) {
    const nextStatus = !student.isPaid;
    setUpdatingId(student.studentId);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/fees/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.studentId,
          month: selectedMonth,
          isPaid: nextStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Optimistically update local state
        const updated = records.map((r) => {
          if (r.studentId === student.studentId) {
            return {
              ...r,
              isPaid: nextStatus,
              paidAmount: nextStatus ? r.monthlyFee : 0,
              pendingDue: nextStatus ? 0 : r.monthlyFee,
            };
          }
          return r;
        });
        setRecords(updated);
        setSummary({
          ...summary,
          paidCount: updated.filter((r) => r.isPaid).length,
          unpaidCount: updated.filter((r) => !r.isPaid).length,
          totalCollected: updated.reduce((sum, r) => sum + (r.isPaid ? r.monthlyFee : r.paidAmount), 0),
        });
        setStatusMessage({
          type: "success",
          text: `Marked ${student.fullName} as ${nextStatus ? "Paid" : "Unpaid"}. ${nextStatus ? "This student will now be excluded from fee reminders." : "This student will now be included in fee reminders."}`,
        });
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to update fee status" });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Network error while updating fee status" });
    } finally {
      setUpdatingId(null);
    }
  }

  // Mark all filtered as paid
  async function handleMarkAllFiltered(paid: boolean) {
    const targets = filteredRecords.filter((r) => r.isPaid !== paid);
    if (targets.length === 0) return;

    setBatchLoading(true);
    setStatusMessage(null);

    let successCount = 0;
    for (const t of targets) {
      try {
        const res = await fetch("/api/fees/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: t.studentId,
            month: selectedMonth,
            isPaid: paid,
          }),
        });
        const data = await res.json();
        if (data.success) successCount++;
      } catch {
        // Continue
      }
    }

    setBatchLoading(false);
    setStatusMessage({
      type: "success",
      text: `Batch updated ${successCount} student(s) as ${paid ? "Paid" : "Unpaid"} for ${selectedMonth}!`,
    });
    handleMonthChange(selectedMonth);
  }

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.fatherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.parentPhone.includes(searchTerm);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "paid" && r.isPaid) ||
      (statusFilter === "unpaid" && !r.isPaid);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Student Fee Collection & Payment Tracker
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage who paid the monthly fee. Students marked as <strong>Paid</strong> are automatically excluded from SMS fee reminders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month selector input */}
          <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-lg border border-border">
            <Calendar className="h-4 w-4 text-muted-foreground ml-2" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-none pr-2 py-1"
            />
          </div>

          <Link href="/sms">
            <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
              <Send className="h-4 w-4" />
              Fee SMS Dispatch ({summary.unpaidCount})
            </Button>
          </Link>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${
            statusMessage.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Students
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">Enrolled active</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Fees Paid
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary.paidCount}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">No reminder needed</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Fees Pending (Unpaid)
            </CardTitle>
            <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {summary.unpaidCount}
            </div>
            <p className="text-xs text-rose-600 dark:text-rose-400">Receiving SMS reminders</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Collected
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              PKR {summary.totalCollected.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              of PKR {summary.totalExpected.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Students Fee Ledger</CardTitle>
              <CardDescription>
                Click <strong>"Mark as Paid"</strong> or <strong>"Mark Unpaid"</strong> to update student payment in real-time.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={batchLoading}
                onClick={() => handleMarkAllFiltered(true)}
                className="text-xs gap-1.5 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark Visible as Paid
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={batchLoading}
                onClick={() => handleMarkAllFiltered(false)}
                className="text-xs gap-1.5 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
              >
                <XCircle className="h-3.5 w-3.5" />
                Mark Visible as Unpaid
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Controls: Search & Filter */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student, roll number, father, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
                className="h-8 text-xs"
              >
                All ({records.length})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "unpaid" ? "default" : "outline"}
                onClick={() => setStatusFilter("unpaid")}
                className="h-8 text-xs text-rose-700 dark:text-rose-400"
              >
                Pending Due ({summary.unpaidCount})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "paid" ? "default" : "outline"}
                onClick={() => setStatusFilter("paid")}
                className="h-8 text-xs text-emerald-700 dark:text-emerald-400"
              >
                Paid ({summary.paidCount})
              </Button>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="rounded-md border border-border overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Roll / Code</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Father Name</th>
                  <th className="px-4 py-3">Monthly Fee</th>
                  <th className="px-4 py-3">Fee Status</th>
                  <th className="px-4 py-3">SMS Reminder State</th>
                  <th className="px-4 py-3 text-right">Update Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No student records match the search.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => {
                    const isProcessing = updatingId === r.studentId;
                    return (
                      <tr key={r.studentId} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs">{r.studentCode}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{r.fullName}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{r.fatherName}</td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold">
                          PKR {r.monthlyFee.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          {r.isPaid ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              PAID
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-rose-300 text-rose-700 bg-rose-50/50 text-xs gap-1 font-semibold">
                              <XCircle className="h-3 w-3" />
                              UNPAID
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {r.isPaid ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Excluded from SMS
                            </span>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due for Reminder (PKR {r.pendingDue.toLocaleString()})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant={r.isPaid ? "outline" : "default"}
                            disabled={isProcessing}
                            onClick={() => handleTogglePaid(r)}
                            className={`h-7 text-xs gap-1.5 ${
                              r.isPaid
                                ? "text-rose-700 hover:bg-rose-50 hover:text-rose-800 border-rose-300 dark:border-rose-900"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            {isProcessing ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : r.isPaid ? (
                              <>
                                <XCircle className="h-3 w-3" />
                                Mark Unpaid
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                Mark as Paid
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

