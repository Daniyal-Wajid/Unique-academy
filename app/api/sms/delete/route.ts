import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { ids, all } = body;

    const supabase = await createClient();

    if (all) {
      // Delete all logs
      const { error } = await supabase.from("sms_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: "All SMS logs deleted successfully" });
    }

    if (Array.isArray(ids) && ids.length > 0) {
      const { error } = await supabase.from("sms_logs").delete().in("id", ids);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, count: ids.length });
    }

    return NextResponse.json({ error: "No log IDs provided for deletion" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete SMS logs" },
      { status: 500 }
    );
  }
}

