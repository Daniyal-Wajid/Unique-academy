"use client";

import { useState } from "react";
import {
  GraduationCap,
  Fingerprint,
  Phone,
  Plus,
  Search,
  Wallet,
  CheckCircle2,
  AlertCircle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Student } from "@/lib/types/database";

export function StudentsManager({ initialStudents }: { initialStudents: Student[] }) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Form states
  const [fullName, setFullName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [zkUserId, setZkUserId] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("3500");
  const [studentCode, setStudentCode] = useState("");

  const filtered = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.father_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.zk_user_id && s.zk_user_id.includes(searchTerm)) ||
      s.parent_phone.includes(searchTerm)
  );

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          fatherName,
          parentPhone,
          zkUserId: zkUserId || null,
          monthlyFee: Number(monthlyFee) || 0,
          studentCode: studentCode || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.student) {
        setStudents([...students, data.student]);
        setFeedback({
          type: "success",
          message: `Student "${fullName}" enrolled and linked to Fingerprint ID ${zkUserId || "N/A"}.`,
        });
        setShowAddModal(false);
        // Reset form
        setFullName("");
        setFatherName("");
        setParentPhone("");
        setZkUserId("");
        setStudentCode("");
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to add student" });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error saving student record" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Student & Fingerprint Directory
          </h2>
          <p className="text-sm text-muted-foreground">
            Link student profiles to their ZKTeco biometric ID and parent phone for SMS.
          </p>
        </div>

        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Student
        </Button>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${
            feedback.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          )}
          {feedback.message}
        </div>
      )}

      {/* Add Student Modal / Form Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-semibold text-foreground">Enroll New Student</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Full Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Muhammad Ali"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Father Name
                  </label>
                  <Input
                    placeholder="e.g. Tariq Mehmood"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Parent Mobile (for SMS) *
                  </label>
                  <Input
                    required
                    placeholder="03001234567"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Fingerprint Device User ID
                  </label>
                  <Input
                    placeholder="e.g. 1, 2, 105"
                    value={zkUserId}
                    onChange={(e) => setZkUserId(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Matches User ID on the ZKTeco MB460
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Roll No / Code
                  </label>
                  <Input
                    placeholder="STU-001 (Optional)"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Monthly Fee (PKR)
                  </label>
                  <Input
                    type="number"
                    placeholder="3500"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Student"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Students Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, roll no, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              Total Enrolled: <span className="font-semibold text-foreground">{students.length}</span>
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
                  <th className="px-4 py-3">Parent Mobile (SMS)</th>
                  <th className="px-4 py-3">Fingerprint ID</th>
                  <th className="px-4 py-3">Monthly Fee</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      {students.length === 0
                        ? "No students registered yet. Click 'Add New Student' to enroll your first student!"
                        : "No students matching your search criteria."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{s.student_code}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{s.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.father_name}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <span className="inline-flex items-center gap-1.5 text-foreground">
                          <Phone className="h-3 w-3 text-primary" />
                          {s.parent_phone}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.zk_user_id ? (
                          <Badge variant="outline" className="font-mono text-xs gap-1">
                            <Fingerprint className="h-3 w-3 text-emerald-600" />
                            ID: {s.zk_user_id}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[11px] text-muted-foreground">
                            Not mapped
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        PKR {Number(s.monthly_fee).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                          Active
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
