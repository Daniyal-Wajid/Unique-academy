"use client";

import { useState } from "react";
import {
  MessageSquare,
  Send,
  UserX,
  Wallet,
  History,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { AbsenteeRecipient, FeeRecipient, SmsLogItem } from "@/lib/services/sms";

export function SmsHub({
  initialAbsentees,
  initialFeePending,
  initialLogs,
  currentDate,
  gatewayEnabled = false,
}: {
  initialAbsentees: AbsenteeRecipient[];
  initialFeePending: FeeRecipient[];
  initialLogs: SmsLogItem[];
  currentDate: string;
  gatewayEnabled?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"absentee" | "fees" | "logs">("absentee");
  const [absentees, setAbsentees] = useState(initialAbsentees);
  const [feePending, setFeePending] = useState(initialFeePending);
  const [logs, setLogs] = useState(initialLogs);

  // Template states
  const [absenteeTemplate, setAbsenteeTemplate] = useState(
    "Respected Parent, your child {name} was marked ABSENT today ({date}) at Unique Academy. Please contact office if this was unintentional."
  );
  const [feeTemplate, setFeeTemplate] = useState(
    "Respected Parent, fee of PKR {amount} for {name} is pending at Unique Academy. Kindly clear the dues at your earliest. Thank you."
  );

  // Selection states
  const [selectedAbsenteeIds, setSelectedAbsenteeIds] = useState<string[]>(
    initialAbsentees.map((a) => a.studentId)
  );
  const [selectedFeeIds, setSelectedFeeIds] = useState<string[]>(
    initialFeePending.map((f) => f.studentId)
  );

  // Selected Log IDs for deletion
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [deletingLogs, setDeletingLogs] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Delete Log functions
  async function handleDeleteSelectedLogs() {
    if (selectedLogIds.length === 0) return;
    if (!confirm(`Delete ${selectedLogIds.length} selected SMS history records?`)) return;

    setDeletingLogs(true);
    try {
      const res = await fetch("/api/sms/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedLogIds }),
      });
      const data = await res.json();
      if (data.success) {
        setLogs(logs.filter((l) => !selectedLogIds.includes(l.id)));
        setSelectedLogIds([]);
        setStatusMessage({ type: "success", text: `Deleted ${data.count} log record(s).` });
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to delete logs" });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Network error while deleting logs" });
    } finally {
      setDeletingLogs(false);
    }
  }

  async function handleDeleteAllLogs() {
    if (logs.length === 0) return;
    if (!confirm("Are you sure you want to clear ALL SMS history logs? This cannot be undone.")) return;

    setDeletingLogs(true);
    try {
      const res = await fetch("/api/sms/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (data.success) {
        setLogs([]);
        setSelectedLogIds([]);
        setStatusMessage({ type: "success", text: "All SMS history logs cleared successfully." });
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to clear logs" });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Network error while clearing logs" });
    } finally {
      setDeletingLogs(false);
    }
  }

  // Filtered lists
  const filteredAbsentees = absentees.filter(
    (a) =>
      a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.parentPhone.includes(searchTerm) ||
      a.studentCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFees = feePending.filter(
    (f) =>
      f.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.parentPhone.includes(searchTerm) ||
      f.studentCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleSendAbsenteeSms(targets: AbsenteeRecipient[]) {
    if (targets.length === 0) return;
    setSending(true);
    setStatusMessage(null);

    const payloadRecipients = targets.map((t) => ({
      studentId: t.studentId,
      fullName: t.fullName,
      parentPhone: t.parentPhone,
      message: absenteeTemplate
        .replace("{name}", t.fullName)
        .replace("{date}", currentDate),
    }));

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: payloadRecipients,
          templateKey: "absence_alert",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: "success",
          text: `Successfully dispatched ${data.sentCount} Absentee SMS notifications!`,
        });
        // Refresh page after a brief moment
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to send SMS" });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Network error while sending SMS" });
    } finally {
      setSending(false);
    }
  }

  async function handleSendFeeSms(targets: FeeRecipient[]) {
    if (targets.length === 0) return;
    setSending(true);
    setStatusMessage(null);

    const payloadRecipients = targets.map((t) => ({
      studentId: t.studentId,
      fullName: t.fullName,
      pendingDue: t.pendingDue,
      parentPhone: t.parentPhone,
      message: feeTemplate
        .replace("{name}", t.fullName)
        .replace("{amount}", t.pendingDue.toLocaleString()),
    }));

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: payloadRecipients,
          templateKey: "fee_reminder",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: "success",
          text: `Successfully dispatched ${data.sentCount} Fee Status SMS notifications!`,
        });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to send Fee SMS" });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Network error while sending Fee SMS" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            SMS Notification Service
          </h2>
          <p className="text-sm text-muted-foreground">
            Dispatch absentee alerts and fee status reminders to parent mobile phones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {gatewayEnabled ? (
            <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950/30 gap-1.5 py-1 px-3 border-emerald-300 text-emerald-700 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              SMS Gateway Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950/30 gap-1.5 py-1 px-3 border-amber-300 text-amber-700 dark:text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Demo Mode (logs only)
            </Badge>
          )}
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
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          )}
          {statusMessage.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("absentee")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "absentee"
              ? "border-rose-500 text-rose-600 dark:text-rose-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserX className="h-4 w-4" />
          Absentee SMS ({absentees.length})
        </button>

        <button
          onClick={() => setActiveTab("fees")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "fees"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wallet className="h-4 w-4" />
          Fee Status SMS ({feePending.length})
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "logs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="h-4 w-4" />
          Sent History & Outbox ({logs.length})
        </button>
      </div>

      {/* TAB 1: ABSENTEE SMS */}
      {activeTab === "absentee" && (
        <div className="space-y-6">
          {/* Template Box */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Absentee SMS Template Customizer
              </CardTitle>
              <CardDescription className="text-xs">
                Keywords <code className="text-primary font-mono">&#123;name&#125;</code> and{" "}
                <code className="text-primary font-mono">&#123;date&#125;</code> will be automatically
                replaced for each student.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <textarea
                value={absenteeTemplate}
                onChange={(e) => setAbsenteeTemplate(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-input bg-background p-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Length: {absenteeTemplate.length} characters (approx.{" "}
                  {Math.ceil(absenteeTemplate.length / 160)} SMS per recipient)
                </span>
                <span className="italic">
                  Preview: &ldquo;{absenteeTemplate.replace("{name}", "Ali Ahmed").replace("{date}", currentDate)}&rdquo;
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Absentees List */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search absent student or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="gap-2 bg-rose-600 hover:bg-rose-700 text-white"
                    disabled={sending || selectedAbsenteeIds.length === 0}
                    onClick={() => {
                      const selected = absentees.filter((a) =>
                        selectedAbsenteeIds.includes(a.studentId)
                      );
                      handleSendAbsenteeSms(selected);
                    }}
                  >
                    <Send className={`h-4 w-4 ${sending ? "animate-spin" : ""}`} />
                    Send SMS to Selected ({selectedAbsenteeIds.length})
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-y border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={
                            absentees.length > 0 &&
                            selectedAbsenteeIds.length === absentees.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAbsenteeIds(absentees.map((a) => a.studentId));
                            } else {
                              setSelectedAbsenteeIds([]);
                            }
                          }}
                          className="rounded border-input text-primary"
                        />
                      </th>
                      <th className="px-4 py-3">Roll / Code</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Father Name</th>
                      <th className="px-4 py-3">Parent Mobile</th>
                      <th className="px-4 py-3">Last Sent</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAbsentees.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          {absentees.length === 0
                            ? "No students marked absent today! If needed, click 'Mark Absentees for Today' on the Attendance page."
                            : "No students matching your search."}
                        </td>
                      </tr>
                    ) : (
                      filteredAbsentees.map((a) => {
                        const isSelected = selectedAbsenteeIds.includes(a.studentId);
                        return (
                          <tr key={a.studentId} className="hover:bg-muted/20">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAbsenteeIds([...selectedAbsenteeIds, a.studentId]);
                                  } else {
                                    setSelectedAbsenteeIds(
                                      selectedAbsenteeIds.filter((id) => id !== a.studentId)
                                    );
                                  }
                                }}
                                className="rounded border-input text-primary"
                              />
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{a.studentCode}</td>
                            <td className="px-4 py-3 font-medium text-foreground">{a.fullName}</td>
                            <td className="px-4 py-3 text-muted-foreground">{a.fatherName}</td>
                            <td className="px-4 py-3 font-mono text-xs text-foreground font-medium">
                              {a.parentPhone || (
                                <span className="text-rose-500 italic">No phone</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {a.lastSmsSentAt ? (
                                <Badge variant="outline" className="text-emerald-600 gap-1">
                                  <Check className="h-3 w-3" />
                                  Sent today
                                </Badge>
                              ) : (
                                <span>Not sent today</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={sending || !a.parentPhone}
                                onClick={() => handleSendAbsenteeSms([a])}
                                className="h-7 text-xs gap-1 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                              >
                                <Send className="h-3 w-3" />
                                Send Alert
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
      )}

      {/* TAB 2: FEE STATUS SMS */}
      {activeTab === "fees" && (
        <div className="space-y-6">
          {/* Template Box */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Fee Status SMS Template Customizer
              </CardTitle>
              <CardDescription className="text-xs">
                Keywords <code className="text-primary font-mono">&#123;name&#125;</code> and{" "}
                <code className="text-primary font-mono">&#123;amount&#125;</code> will be automatically
                replaced with the student&apos;s pending balance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <textarea
                value={feeTemplate}
                onChange={(e) => setFeeTemplate(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-input bg-background p-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Length: {feeTemplate.length} characters (approx.{" "}
                  {Math.ceil(feeTemplate.length / 160)} SMS per recipient)
                </span>
                <span className="italic">
                  Preview: &ldquo;{feeTemplate.replace("{name}", "Ali Ahmed").replace("{amount}", "3,500")}&rdquo;
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Fee Pending List */}
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

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                    disabled={sending || selectedFeeIds.length === 0}
                    onClick={() => {
                      const selected = feePending.filter((f) =>
                        selectedFeeIds.includes(f.studentId)
                      );
                      handleSendFeeSms(selected);
                    }}
                  >
                    <Send className={`h-4 w-4 ${sending ? "animate-spin" : ""}`} />
                    Send Fee Reminders ({selectedFeeIds.length})
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-y border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={
                            feePending.length > 0 &&
                            selectedFeeIds.length === feePending.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFeeIds(feePending.map((f) => f.studentId));
                            } else {
                              setSelectedFeeIds([]);
                            }
                          }}
                          className="rounded border-input text-primary"
                        />
                      </th>
                      <th className="px-4 py-3">Roll / Code</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Father Name</th>
                      <th className="px-4 py-3">Monthly Fee</th>
                      <th className="px-4 py-3">Pending Due</th>
                      <th className="px-4 py-3">Parent Mobile</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredFees.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-muted-foreground">
                          {feePending.length === 0
                            ? "No pending fee records found. All student fees are clear!"
                            : "No students matching your search."}
                        </td>
                      </tr>
                    ) : (
                      filteredFees.map((f) => {
                        const isSelected = selectedFeeIds.includes(f.studentId);
                        return (
                          <tr key={f.studentId} className="hover:bg-muted/20">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedFeeIds([...selectedFeeIds, f.studentId]);
                                  } else {
                                    setSelectedFeeIds(
                                      selectedFeeIds.filter((id) => id !== f.studentId)
                                    );
                                  }
                                }}
                                className="rounded border-input text-primary"
                              />
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{f.studentCode}</td>
                            <td className="px-4 py-3 font-medium text-foreground">{f.fullName}</td>
                            <td className="px-4 py-3 text-muted-foreground">{f.fatherName}</td>
                            <td className="px-4 py-3 font-mono text-xs">
                              PKR {f.monthlyFee.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-rose-600 dark:text-rose-400">
                              PKR {f.pendingDue.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-foreground font-medium">
                              {f.parentPhone || (
                                <span className="text-rose-500 italic">No phone</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={sending || !f.parentPhone}
                                onClick={() => handleSendFeeSms([f])}
                                className="h-7 text-xs gap-1 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/30"
                              >
                                <Send className="h-3 w-3" />
                                Send Reminder
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
      )}

      {/* TAB 3: SMS HISTORY & LOGS */}
      {activeTab === "logs" && (
        <Card className="border-border">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">SMS Dispatch History & Logs</CardTitle>
                <CardDescription>
                  Detailed audit trail of all absentee alerts and fee status SMS sent from the academy.
                </CardDescription>
              </div>

              {/* Delete controls */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedLogIds.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deletingLogs}
                    onClick={handleDeleteSelectedLogs}
                    className="text-xs gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Selected ({selectedLogIds.length})
                  </Button>
                )}

                {logs.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deletingLogs}
                    onClick={handleDeleteAllLogs}
                    className="text-xs gap-1.5 text-muted-foreground hover:text-rose-600 hover:border-rose-300 dark:hover:bg-rose-950/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear Entire History
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-y border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={logs.length > 0 && selectedLogIds.length === logs.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLogIds(logs.map((l) => l.id));
                          } else {
                            setSelectedLogIds([]);
                          }
                        }}
                        className="rounded border-input text-primary"
                      />
                    </th>
                    <th className="px-4 py-3">Sent Time</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">To Phone</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Message Body</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No SMS logs recorded yet. Send your first SMS from the Absentee or Fee Status tabs!
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const isSelected = selectedLogIds.includes(log.id);
                      return (
                        <tr key={log.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLogIds([...selectedLogIds, log.id]);
                                } else {
                                  setSelectedLogIds(selectedLogIds.filter((id) => id !== log.id));
                                }
                              }}
                              className="rounded border-input text-primary"
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {log.sentAt
                              ? new Date(log.sentAt).toLocaleString("en-PK", {
                                  timeZone: "Asia/Karachi",
                                })
                              : new Date(log.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-3 font-medium text-xs">
                            {log.studentName || "General / Parent"}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{log.toPhone}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                log.templateKey === "absence_alert"
                                  ? "border-rose-300 text-rose-700 bg-rose-50/50"
                                  : log.templateKey === "fee_reminder"
                                  ? "border-amber-300 text-amber-700 bg-amber-50/50"
                                  : ""
                              }`}
                            >
                              {log.templateKey === "absence_alert"
                                ? "Absent Alert"
                                : log.templateKey === "fee_reminder"
                                ? "Fee Reminder"
                                : "SMS"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-md truncate">
                            {log.body}
                          </td>
                          <td className="px-4 py-3">
                            {log.status === "sent" ? (
                              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Sent
                              </Badge>
                            ) : (
                              <div className="flex flex-col gap-1 items-start">
                                <Badge variant="danger" className="text-xs gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Failed
                                </Badge>
                                {log.errorMessage && (
                                  <span className="text-[11px] text-rose-500 font-mono max-w-xs truncate" title={log.errorMessage}>
                                    {log.errorMessage}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const res = await fetch("/api/sms/delete", {
                                    method: "DELETE",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ ids: [log.id] }),
                                  });
                                  const data = await res.json();
                                  if (data.success) {
                                    setLogs(logs.filter((l) => l.id !== log.id));
                                  }
                                } catch {
                                  // ignore
                                }
                              }}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                              title="Delete this log entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
      )}
    </div>
  );
}
