"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}

export function LoginForm({
  nextPath,
  setupRequired,
}: {
  nextPath: string;
  setupRequired: boolean;
}) {
  const [state, formAction] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="principal@academy.local" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
      </div>
      {setupRequired ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Add your Supabase URL and anon key to `.env.local` before signing in.
        </p>
      ) : (
        <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
          <p className="font-semibold mb-1">Academy Admin Credentials:</p>
          <div className="space-y-0.5 font-mono text-[11px]">
            <div>Email: <span className="font-bold">principal@unique.com</span></div>
            <div>Password: <span className="font-bold">Password123!</span></div>
          </div>
        </div>
      )}
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
