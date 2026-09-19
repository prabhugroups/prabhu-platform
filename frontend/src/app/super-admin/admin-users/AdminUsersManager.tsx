"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createAdminUser, deactivateAdminUser } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [role, setRole] = useState<"tenant_admin" | "super_admin">("tenant_admin");
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null);

  function handleCreate(formData: FormData) {
    const submittedRole = formData.get("role") as "super_admin" | "tenant_admin";
    const tenantId = formData.get("tenant_id");
    startTransition(async () => {
      await createAdminUser({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        username: String(formData.get("username") ?? ""),
        password: String(formData.get("password") ?? ""),
        role: submittedRole,
        tenant_id: submittedRole === "tenant_admin" && tenantId ? Number(tenantId) : null,
      });
      toast.success("Admin user created.");
      setCreating(false);
      setRole("tenant_admin");
      router.refresh();
    });
  }

  function handleDeactivate() {
    if (!deactivateTarget) return;
    const id = deactivateTarget.id;
    startTransition(async () => {
      await deactivateAdminUser(id);
      toast.success("Admin user deactivated.");
      setDeactivateTarget(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Users</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus /> New Admin User
        </Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.username}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>{u.tenant_id ? (tenants.find((t) => t.id === u.tenant_id)?.name ?? u.tenant_id) : "—"}</TableCell>
                <TableCell>
                  {u.is_active ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {u.is_active && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeactivateTarget(u)}
                      disabled={pending}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open) setRole("tenant_admin");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Admin User</DialogTitle>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Select name="role" value={role} onValueChange={(v) => setRole(v as "tenant_admin" | "super_admin")}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role === "tenant_admin" && (
              <div className="space-y-1.5">
                <Label htmlFor="tenant_id">Tenant</Label>
                <Select name="tenant_id">
                  <SelectTrigger id="tenant_id" className="w-full">
                    <SelectValue placeholder="Select a tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={pending} className="w-full">
                {pending && <Loader2 className="animate-spin" />}
                {pending ? "Creating..." : "Create Admin User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {deactivateTarget && (
        <AlertDialog open onOpenChange={(open) => !open && setDeactivateTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate this admin user?</AlertDialogTitle>
              <AlertDialogDescription>They will no longer be able to sign in.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeactivate}
                disabled={pending}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {pending && <Loader2 className="animate-spin" />}
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
