export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Unique Academy";
export const TIMEZONE = "Asia/Karachi";
export const MAX_USERS = 250;

export const STAFF_ROLES = [
  "principal",
  "administrator",
  "office_staff",
  "teacher",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABELS: Record<StaffRole, string> = {
  principal: "Principal",
  administrator: "Administrator",
  office_staff: "Office Staff",
  teacher: "Teacher",
};

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/attendance", label: "Attendance", icon: "ClipboardCheck" },
  { href: "/fees", label: "Fees Management", icon: "Wallet" },
  { href: "/sms", label: "SMS Service", icon: "MessageSquare" },
  { href: "/students", label: "Students", icon: "GraduationCap" },
  { href: "/device", label: "Device (ZKTeco)", icon: "Fingerprint" },
  { href: "/settings", label: "Settings & Hosting", icon: "Settings" },
  /* --------------------------------------------------------------------------
   * Commented out for future extension. Uncomment any item to re-enable:
   * --------------------------------------------------------------------------
  { href: "/classes", label: "Classes", icon: "BookOpen" },
  { href: "/staff", label: "Staff", icon: "Users" },
  { href: "/parents", label: "Parents Directory", icon: "Contact" },
  { href: "/reports", label: "Reports & Analytics", icon: "BarChart3" },
  { href: "/settings", label: "Settings", icon: "Settings" },
  -------------------------------------------------------------------------- */
] as const;
