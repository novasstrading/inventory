"use client";

import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";
import { defaultModulesForRole, type ModuleKey } from "@/lib/auth/modules";

type AdminUser = { id: string; email: string; role: "admin" | "viewer"; protected: boolean; modules: ModuleKey[] };

export function AccessView() {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"admin" | "viewer">("viewer");
  // Follows the role's default until the admin touches the checkbox explicitly.
  const [websiteAccess, setWebsiteAccess] = React.useState(defaultModulesForRole("viewer").includes("website"));
  const [websiteTouched, setWebsiteTouched] = React.useState(false);
  const [savingModules, setSavingModules] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [removing, setRemoving] = React.useState<AdminUser | null>(null);
  const [removeBusy, setRemoveBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const data = await apiFetch<{ users: AdminUser[] }>("/api/admin/users");
      setUsers(data.users);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  function changeRole(next: "admin" | "viewer") {
    setRole(next);
    if (!websiteTouched) setWebsiteAccess(defaultModulesForRole(next).includes("website"));
  }

  async function addUser() {
    if (!email.trim()) return toast.error("Enter an email.");
    setAdding(true);
    try {
      const modules: ModuleKey[] = websiteAccess ? ["website", "assets"] : ["assets"];
      await apiFetch("/api/admin/users", { body: { email, role, modules } });
      toast.success("User added & notified.");
      setEmail("");
      resetAddForm();
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add user.");
    } finally {
      setAdding(false);
    }
  }

  function resetAddForm() {
    setRole("viewer");
    setWebsiteTouched(false);
    setWebsiteAccess(defaultModulesForRole("viewer").includes("website"));
  }

  async function toggleWebsite(user: AdminUser, enabled: boolean) {
    const previous = user.modules;
    const next: ModuleKey[] = enabled
      ? (["website", "assets"] as const).filter((m) => m === "website" || previous.includes(m))
      : previous.filter((m) => m !== "website");
    // Optimistic: flip the checkbox now, roll back if the server refuses.
    setUsers((list) => list.map((u) => (u.id === user.id ? { ...u, modules: next } : u)));
    setSavingModules(user.id);
    try {
      await apiFetch(`/api/admin/users/${user.id}/modules`, { method: "PATCH", body: { modules: next } });
      toast.success(enabled ? "Website editor access granted." : "Website editor access removed.");
    } catch (e) {
      setUsers((list) => list.map((u) => (u.id === user.id ? { ...u, modules: previous } : u)));
      toast.error(e instanceof Error ? e.message : "Could not update access.");
    } finally {
      setSavingModules(null);
    }
  }

  async function removeUser() {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await apiFetch(`/api/admin/users/${removing.id}/remove`, { method: "POST" });
      toast.success("User removed.");
      setRemoving(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove user.");
    } finally {
      setRemoveBusy(false);
    }
  }

  if (loading) {
    return <Card className="p-10 text-center text-muted-foreground">Loading…</Card>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-bold">Access &amp; roles</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-center">Website editor</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role}>{u.role}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <input
                    type="checkbox"
                    className="size-4 cursor-pointer accent-navy disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Website editor access for ${u.email}`}
                    title={u.protected ? "Server admins always have website editor access" : undefined}
                    checked={u.modules.includes("website")}
                    disabled={u.protected || savingModules === u.id}
                    onChange={(e) => toggleWebsite(u, e.target.checked)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {u.protected ? (
                    <span className="text-xs text-muted-foreground">server admin</span>
                  ) : (
                    <Button variant="danger" size="xs" onClick={() => setRemoving(u)}>
                      Remove
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-6 border-t border-border pt-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Add a user</div>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@novasstrading.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Role</label>
              <Select value={role} onChange={(e) => changeRole(e.target.value as "admin" | "viewer")}>
                <option value="viewer">Viewer — read only</option>
                <option value="admin">Admin — full access</option>
              </Select>
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-[13px] text-ink-2">
            <input
              type="checkbox"
              className="size-4 cursor-pointer accent-navy"
              checked={websiteAccess}
              onChange={(e) => {
                setWebsiteTouched(true);
                setWebsiteAccess(e.target.checked);
              }}
            />
            Website editor access
          </label>
          <Button variant="primary" className="mt-3 w-full" disabled={adding} onClick={addUser}>
            {adding ? "Adding…" : "Add & notify by email"}
          </Button>
          <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
            <b>Viewer:</b> browse, search, export, print stickers.
            <br />
            <b>Admin:</b> everything plus add/edit/remove, documents, employees &amp; users.
            <br />
            <b>Website editor:</b> can also sign in to the website content editor.
          </p>
        </div>
      </Card>
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove access?"
        description={
          removing ? (
            <>
              Remove access for <b className="text-foreground">{removing.email}</b>? They&apos;ll be notified and
              signed out.
            </>
          ) : null
        }
        confirmLabel="Remove"
        loading={removeBusy}
        onConfirm={removeUser}
      />
    </div>
  );
}
