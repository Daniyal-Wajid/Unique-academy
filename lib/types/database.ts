export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "principal" | "administrator" | "office_staff" | "teacher";
export type PersonType = "student" | "staff";
export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "half_day"
  | "leave"
  | "holiday";
export type InvoiceStatus = "paid" | "partial" | "unpaid" | "overdue";
export type PaymentMethod = "cash" | "bank_transfer" | "cheque" | "other";
export type SmsStatus = "pending" | "queued" | "sent" | "failed";
export type DeviceStatus = "online" | "offline" | "unknown";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type PunchType = "check_in" | "check_out" | "unknown";

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Profile = Timestamps & {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  phone: string | null;
  is_active: boolean;
};

export type Student = Timestamps & {
  id: string;
  student_code: string;
  admission_number: string;
  full_name: string;
  father_name: string;
  parent_phone: string;
  alternate_phone: string | null;
  address: string | null;
  admission_date: string;
  class_id: string | null;
  monthly_fee: string;
  discount: string;
  is_active: boolean;
  zk_user_id: string | null;
};

export type StaffMember = Timestamps & {
  id: string;
  employee_code: string;
  full_name: string;
  phone: string;
  designation: string;
  joining_date: string;
  shift_id: string | null;
  salary: string | null;
  zk_user_id: string | null;
  user_id: string | null;
  is_active: boolean;
};

export type Parent = Timestamps & {
  id: string;
  full_name: string;
  primary_phone: string;
  alternate_phone: string | null;
  address: string | null;
  sms_enabled: boolean;
};

export type StudentParent = {
  id: string;
  student_id: string;
  parent_id: string;
  relationship: string;
  is_primary: boolean;
  created_at: string;
};

export type ClassRecord = Timestamps & {
  id: string;
  name: string;
  code: string;
  teacher_id: string | null;
  start_time: string | null;
  end_time: string | null;
  late_after_minutes: number;
  attendance_cutoff_time: string | null;
  is_active: boolean;
};

export type Enrollment = Timestamps & {
  id: string;
  student_id: string;
  class_id: string;
  enrolled_on: string;
  left_on: string | null;
  is_active: boolean;
};

export type Device = Timestamps & {
  id: string;
  name: string;
  model: string;
  serial_number: string | null;
  mac_address: string | null;
  ip_address: string | null;
  port: number;
  status: DeviceStatus;
  last_seen_at: string | null;
  last_error: string | null;
  is_active: boolean;
};

export type BiometricUser = Timestamps & {
  id: string;
  device_id: string;
  zk_user_id: string;
  person_type: PersonType | null;
  student_id: string | null;
  staff_id: string | null;
  name_on_device: string | null;
};

export type AttendanceLog = {
  id: string;
  device_id: string | null;
  zk_user_id: string;
  punched_at: string;
  punch_type: PunchType;
  punch_status_raw: string | null;
  person_type: PersonType | null;
  student_id: string | null;
  staff_id: string | null;
  raw_payload: Json;
  created_at: string;
};

export type DailyAttendance = Timestamps & {
  id: string;
  person_type: PersonType;
  student_id: string | null;
  staff_id: string | null;
  class_id: string | null;
  attendance_date: string;
  status: AttendanceStatus;
  check_in_at: string | null;
  check_out_at: string | null;
  minutes_late: number;
  source: string;
  notes: string | null;
  corrected_by: string | null;
};

export type Shift = Timestamps & {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  late_grace_minutes: number;
  is_active: boolean;
};

export type Holiday = Timestamps & {
  id: string;
  holiday_date: string;
  name: string;
  applies_to: string;
};

export type LeaveRequest = Timestamps & {
  id: string;
  person_type: PersonType;
  student_id: string | null;
  staff_id: string | null;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
};

export type FeeStructure = Timestamps & {
  id: string;
  class_id: string | null;
  name: string;
  amount: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
};

export type Invoice = Timestamps & {
  id: string;
  student_id: string;
  billing_period: string;
  due_date: string;
  subtotal: string;
  discount_amount: string;
  previous_balance: string;
  total_amount: string;
  paid_amount: string;
  status: InvoiceStatus;
  notes: string | null;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  description: string;
  amount: string;
  created_at: string;
};

export type Payment = {
  id: string;
  invoice_id: string;
  student_id: string;
  amount: string;
  method: PaymentMethod;
  received_at: string;
  receipt_number: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type FeeAdjustment = {
  id: string;
  invoice_id: string;
  amount: string;
  adjustment_type: string;
  reason: string;
  recorded_by: string | null;
  created_at: string;
};

export type SmsTemplate = Timestamps & {
  id: string;
  template_key: string;
  name: string;
  body: string;
  is_active: boolean;
};

export type SmsLog = {
  id: string;
  to_phone: string;
  template_key: string | null;
  body: string;
  status: SmsStatus;
  provider: string;
  provider_message_id: string | null;
  error_message: string | null;
  student_id: string | null;
  parent_id: string | null;
  duplicate_key: string | null;
  sent_at: string | null;
  created_at: string;
};

export type NotificationPreference = Timestamps & {
  id: string;
  parent_id: string;
  arrival: boolean;
  absence: boolean;
  late: boolean;
  fee_reminder: boolean;
  overdue: boolean;
  payment: boolean;
  announcement: boolean;
};

export type SystemSetting = Timestamps & {
  key: string;
  value: Json;
  description: string | null;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Json;
  created_at: string;
};

export type DeviceSyncCheckpoint = Timestamps & {
  id: string;
  device_id: string;
  last_sync_at: string | null;
  last_punched_at: string | null;
  last_record_uid: string | null;
  records_synced: number;
  status: string;
  error_message: string | null;
};

type Table<TRow, TInsert, TUpdate> = {
  Row: TRow;
  Insert: TInsert;
  Update: TUpdate;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & { id: string; email: string }, Partial<Profile>>;
      students: Table<Student, Partial<Student> & Pick<Student, "student_code" | "admission_number" | "full_name" | "father_name" | "parent_phone" | "admission_date">, Partial<Student>>;
      staff: Table<StaffMember, Partial<StaffMember> & Pick<StaffMember, "employee_code" | "full_name" | "phone" | "designation" | "joining_date">, Partial<StaffMember>>;
      parents: Table<Parent, Partial<Parent> & Pick<Parent, "full_name" | "primary_phone">, Partial<Parent>>;
      student_parents: Table<StudentParent, Partial<StudentParent> & Pick<StudentParent, "student_id" | "parent_id">, Partial<StudentParent>>;
      classes: Table<ClassRecord, Partial<ClassRecord> & Pick<ClassRecord, "name" | "code">, Partial<ClassRecord>>;
      enrollments: Table<Enrollment, Partial<Enrollment> & Pick<Enrollment, "student_id" | "class_id">, Partial<Enrollment>>;
      devices: Table<Device, Partial<Device> & Pick<Device, "name">, Partial<Device>>;
      biometric_users: Table<BiometricUser, Partial<BiometricUser> & Pick<BiometricUser, "device_id" | "zk_user_id">, Partial<BiometricUser>>;
      attendance_logs: Table<AttendanceLog, Partial<AttendanceLog> & Pick<AttendanceLog, "zk_user_id" | "punched_at">, Partial<AttendanceLog>>;
      daily_attendance: Table<DailyAttendance, Partial<DailyAttendance> & Pick<DailyAttendance, "person_type" | "attendance_date" | "status">, Partial<DailyAttendance>>;
      shifts: Table<Shift, Partial<Shift> & Pick<Shift, "name" | "start_time" | "end_time">, Partial<Shift>>;
      holidays: Table<Holiday, Partial<Holiday> & Pick<Holiday, "holiday_date" | "name">, Partial<Holiday>>;
      leave_requests: Table<LeaveRequest, Partial<LeaveRequest> & Pick<LeaveRequest, "person_type" | "start_date" | "end_date">, Partial<LeaveRequest>>;
      fee_structures: Table<FeeStructure, Partial<FeeStructure> & Pick<FeeStructure, "name" | "amount" | "effective_from">, Partial<FeeStructure>>;
      invoices: Table<Invoice, Partial<Invoice> & Pick<Invoice, "student_id" | "billing_period" | "due_date" | "total_amount">, Partial<Invoice>>;
      invoice_items: Table<InvoiceItem, Partial<InvoiceItem> & Pick<InvoiceItem, "invoice_id" | "description" | "amount">, Partial<InvoiceItem>>;
      payments: Table<Payment, Partial<Payment> & Pick<Payment, "invoice_id" | "student_id" | "amount" | "receipt_number">, Partial<Payment>>;
      fee_adjustments: Table<FeeAdjustment, Partial<FeeAdjustment> & Pick<FeeAdjustment, "invoice_id" | "amount" | "adjustment_type" | "reason">, Partial<FeeAdjustment>>;
      sms_templates: Table<SmsTemplate, Partial<SmsTemplate> & Pick<SmsTemplate, "template_key" | "name" | "body">, Partial<SmsTemplate>>;
      sms_logs: Table<SmsLog, Partial<SmsLog> & Pick<SmsLog, "to_phone" | "body">, Partial<SmsLog>>;
      notification_preferences: Table<NotificationPreference, Partial<NotificationPreference> & Pick<NotificationPreference, "parent_id">, Partial<NotificationPreference>>;
      system_settings: Table<SystemSetting, Partial<SystemSetting> & { key: string; value: Json }, Partial<SystemSetting>>;
      audit_logs: Table<AuditLog, Partial<AuditLog> & Pick<AuditLog, "action" | "entity_type">, Partial<AuditLog>>;
      device_sync_checkpoints: Table<DeviceSyncCheckpoint, Partial<DeviceSyncCheckpoint> & { device_id: string }, Partial<DeviceSyncCheckpoint>>;
    };
    Views: Record<string, never>;
    Functions: {
      record_payment: {
        Args: {
          p_invoice_id: string;
          p_amount: number | string;
          p_method: PaymentMethod;
          p_received_at?: string;
          p_notes?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      app_role: AppRole;
      person_type: PersonType;
      attendance_status: AttendanceStatus;
      invoice_status: InvoiceStatus;
      payment_method: PaymentMethod;
      sms_status: SmsStatus;
      device_status: DeviceStatus;
      leave_status: LeaveStatus;
      punch_type: PunchType;
    };
    CompositeTypes: Record<string, never>;
  };
}
