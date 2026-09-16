"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";

export interface LoginState {
  status: "idle" | "error";
  message?: string;
}

const BASE_URL = process.env.INTERNAL_API_URL;

export async function adminLogin(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });

  if (!res.ok) {
    return { status: "error", message: "Invalid username or password." };
  }

  const data = (await res.json()) as { access_token: string; role: string; tenant_id: number | null };
  await setSessionCookie(data.access_token, data.role, data.tenant_id);

  if (data.role === "super_admin") {
    redirect("/super-admin/tenants");
  }
  redirect("/admin/dashboard");
}

export async function adminLogout() {
  await clearSessionCookie();
  redirect("/admin/login");
}
