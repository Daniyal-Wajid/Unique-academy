import type { StaffRole } from "@/lib/constants";

export const WRITE_ROLES: StaffRole[] = [
  "principal",
  "administrator",
  "office_staff",
];

export const ADMIN_ROLES: StaffRole[] = ["principal", "administrator"];

export function canManageRecords(role: StaffRole | null | undefined) {
  return !!role && WRITE_ROLES.includes(role);
}

export function canManageUsers(role: StaffRole | null | undefined) {
  return !!role && ADMIN_ROLES.includes(role);
}

export function canManageDevice(role: StaffRole | null | undefined) {
  return !!role && ADMIN_ROLES.includes(role);
}

export function canManageFinance(role: StaffRole | null | undefined) {
  return !!role && WRITE_ROLES.includes(role);
}
