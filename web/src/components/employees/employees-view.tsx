"use client";

import * as React from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";
import type { Asset, Employee } from "@/lib/types";
import { EmployeeDetailSheet } from "./employee-detail-sheet";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { ReleaseEmployeeDialog } from "./release-employee-dialog";

export function EmployeesView({ isAdmin }: { isAdmin: boolean }) {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Employee | null>(null);
  const [releaseOpen, setReleaseOpen] = React.useState(false);
  const [releasing, setReleasing] = React.useState<Employee | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailEmployee, setDetailEmployee] = React.useState<Employee | null>(null);
  const [reinstating, setReinstating] = React.useState<Employee | null>(null);
  const [reinstateBusy, setReinstateBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const [empData, assetData] = await Promise.all([
        apiFetch<{ employees: Employee[] }>("/api/employees"),
        apiFetch<{ assets: Asset[] }>("/api/assets"),
      ]);
      setEmployees(empData.employees);
      setAssets(assetData.assets);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load employees.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const heldCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of assets) {
      if (a.employeeId && a.status === "active") counts[a.employeeId] = (counts[a.employeeId] ?? 0) + 1;
    }
    return counts;
  }, [assets]);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter((e) => [e.name, e.designation, e.email, e.contact].join(" ").toLowerCase().includes(q));
  }, [employees, search]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(e: Employee) {
    setEditing(e);
    setFormOpen(true);
  }
  function openRelease(e: Employee) {
    setReleasing(e);
    setReleaseOpen(true);
  }
  function openDetail(e: Employee) {
    setDetailEmployee(e);
    setDetailOpen(true);
  }

  async function reinstate() {
    if (!reinstating) return;
    setReinstateBusy(true);
    try {
      await apiFetch(`/api/employees/${reinstating.id}/reinstate`, { method: "POST" });
      toast.success("Employee reinstated.");
      setReinstating(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reinstate.");
    } finally {
      setReinstateBusy(false);
    }
  }

  if (loading) {
    return <Card className="p-10 text-center text-muted-foreground">Loading…</Card>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="min-w-[190px] flex-1">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees…" />
        </div>
        {isAdmin && (
          <Button variant="gold" onClick={openAdd}>
            + Add employee
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="hidden sm:table-cell">Designation</TableHead>
                <TableHead className="hidden sm:table-cell">Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => {
                const held = heldCounts[e.id] ?? 0;
                const needsAttention = e.status === "released" && held > 0;
                return (
                  <TableRow key={e.id}>
                    <TableCell>
                      <button className="flex items-center gap-2.5 text-left" onClick={() => openDetail(e)}>
                        <Avatar name={e.name} photoUrl={e.photoKey ? `/api/employees/${e.id}/photo` : null} />
                        <div>
                          <div className="font-semibold text-ink hover:text-navy hover:underline">{e.name}</div>
                          {held > 0 && !needsAttention && (
                            <div className="mt-0.5 text-[11px] text-muted-foreground">
                              Holding {held} asset{held === 1 ? "" : "s"}
                            </div>
                          )}
                          {needsAttention && (
                            <div className="mt-0.5 text-[11px] font-semibold text-danger">
                              {held} asset{held === 1 ? "" : "s"} need reassignment
                            </div>
                          )}
                        </div>
                      </button>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{e.designation || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="hidden sm:table-cell">{e.contact || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{e.email || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "active" ? "active" : "released"}>{e.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdmin && (
                        <div className="flex justify-end gap-1.5">
                          <Button variant="ghost" size="xs" onClick={() => openEdit(e)}>
                            Edit
                          </Button>
                          {e.status === "active" ? (
                            <Button variant="danger" size="xs" onClick={() => openRelease(e)}>
                              Release
                            </Button>
                          ) : (
                            <Button size="xs" onClick={() => setReinstating(e)}>
                              Reinstate
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {filtered.length === 0 && (
          <div className="p-16 text-center text-muted-foreground">
            <div className="mb-3 text-4xl opacity-50">👤</div>
            No employees yet. Add your team members here.
          </div>
        )}
      </Card>

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} employee={editing} onSaved={refresh} />
      <ReleaseEmployeeDialog
        open={releaseOpen}
        onOpenChange={setReleaseOpen}
        employee={releasing}
        heldAssets={releasing ? assets.filter((a) => a.employeeId === releasing.id && a.status === "active") : []}
        employees={employees}
        onDone={refresh}
      />
      <EmployeeDetailSheet open={detailOpen} onOpenChange={setDetailOpen} employee={detailEmployee} assets={assets} />
      <ConfirmDialog
        open={!!reinstating}
        onOpenChange={(o) => !o && setReinstating(null)}
        title="Reinstate this employee?"
        description={
          reinstating ? (
            <>
              <b className="text-foreground">{reinstating.name}</b> will show as active again and can be assigned
              assets.
            </>
          ) : null
        }
        confirmLabel="Reinstate"
        variant="primary"
        loading={reinstateBusy}
        onConfirm={reinstate}
      />
    </div>
  );
}
