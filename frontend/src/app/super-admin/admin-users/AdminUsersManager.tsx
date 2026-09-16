"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { createAdminUser, deactivateAdminUser } from "../actions";

interface AdminUser {
  id: number;
  tenant_id: number | null;
  name: string;
  email: string;
  username: string;
  role: "super_admin" | "tenant_admin";
  is_active: boolean;
}

interface TenantOption {
  id: number;
  name: string;
}

export function AdminUsersManager({ users, tenants }: { users: AdminUser[]; tenants: TenantOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);

  function handleCreate(formData: FormData) {
    const role = formData.get("role") as "super_admin" | "tenant_admin";
    const tenantId = formData.get("tenant_id");
    startTransition(async () => {
      await createAdminUser({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        username: String(formData.get("username") ?? ""),
        password: String(formData.get("password") ?? ""),
        role,
        tenant_id: role === "tenant_admin" && tenantId ? Number(tenantId) : null,
      });
      setCreating(false);
      router.refresh();
    });
  }

  function handleDeactivate(id: number) {
    if (!confirm("Deactivate this admin user?")) return;
    startTransition(async () => {
      await deactivateAdminUser(id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Users</h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> New Admin User
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">{u.username}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">
                  {u.tenant_id ? tenants.find((t) => t.id === u.tenant_id)?.name ?? u.tenant_id : "—"}
                </td>
                <td className="px-4 py-3">{u.is_active ? "Active" : "Inactive"}</td>
                <td className="px-4 py-3 text-right">
                  {u.is_active && (
                    <button
                      onClick={() => handleDeactivate(u.id)}
                      disabled={pending}
                      className="rounded p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">New Admin User</h2>
              <button onClick={() => setCreating(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form action={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input name="name" required className="w-full rounded-md border px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <input name="email" type="email" required className="w-full rounded-md border px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Username</label>
                <input name="username" required className="w-full rounded-md border px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  className="w-full rounded-md border px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Role</label>
                <select name="role" className="w-full rounded-md border px-3 py-2">
                  <option value="tenant_admin">Tenant Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Tenant (for Tenant Admin)</label>
                <select name="tenant_id" className="w-full rounded-md border px-3 py-2">
                  <option value="">—</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-md bg-primary px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Creating..." : "Create Admin User"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
