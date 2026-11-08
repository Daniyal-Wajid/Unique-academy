import { Activity, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { displayDateTime } from "@/lib/utils";
import type { RecentAttendanceLogItem } from "@/lib/services/dashboard";

export function RecentActivity({ logs }: { logs: RecentAttendanceLogItem[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Recent attendance</CardTitle>
        <span className="text-xs text-muted-foreground">{logs.length} latest punches</span>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No biometric punches yet"
            description="Live scans from the MB460 will show here after attendance synchronization is performed."
          />
        ) : (
          <ul className="divide-y divide-border">
            {logs.map((log) => {
              const studentName = log.students?.full_name;
              const studentCode = log.students?.student_code;

              return (
                <li
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold leading-tight text-foreground">
                          {studentName || `Device User #${log.zk_user_id}`}
                        </p>
                        {studentCode && (
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-mono">
                            Roll {studentCode}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {studentName ? `Biometric ID: ${log.zk_user_id} · ` : ""}
                        <span className="capitalize">{log.punch_type.replace("_", " ")}</span>
                      </p>
                    </div>
                  </div>
                  <div className="sm:text-right pl-12 sm:pl-0">
                    <Badge variant="success" className="text-[11px] font-medium">
                      Recorded
                    </Badge>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {displayDateTime(log.punched_at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
