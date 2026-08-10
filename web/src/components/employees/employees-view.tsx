"use client";

import * as React from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";
import type { Employee } from "@/lib/types";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { ReleaseEmployeeDialog } from "./release-employee-dialog";

export function EmployeesView({ isAdmin }: { isAdmin: boolean }) {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Employee | null>(null);
  const [releaseOpen, setReleaseOpen] = React.useState(false);
  const [releasing, setReleasing] = React.useState<Employee | null>(null);
  const [heldCounts, setHeldCounts] = React.useState<Record<string, number>>({});

  const refresh = React.useCallback(async () => {
    try {
      const [empData, assetData] = await Promise.all([
        apiFetch<{ employees: Employee[] }>("/api/employees"),
        apiFetch<{ assets: Array<{ employeeId: string | null; status: string }> }>("/api/assets"),
      ]);
      setEmployees(empData.employees);
      const counts: Record<string, number> = {};
      for (const a of assetData.assets) {
        if (a.employeeId && a.status === "active") counts[a.employeeId] = (counts[a.employeeId] ?? 0) + 1;
      }
      setHeldCounts(counts);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load employees.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

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

  async function reinstate(e: Employee) {
    try {
      await apiFetch(`/api/employees/${e.id}/reinstate`, { method: "POST" });
      toast.success("Employee reinstated.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reinstate.");
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
                      <div className="flex items-center gap-2.5">
                        <Avatar name={e.name} photoUrl={e.photoKey ? `/api/employees/${e.id}/photo` : null} />
                        <div>
                          <div className="font-semibold">{e.name}</div>
                          {needsAttention && (
                            <div className="mt-0.5 text-[11px] font-semibold text-danger">
                              {held} asset{held === 1 ? "" : "s"} need reassignment
                            </div>
                          )}
                        </div>
                      </div>
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
                            <Button size="xs" onClick={() => reinstate(e)}>
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
        heldCount={releasing ? heldCounts[releasing.id] ?? 0 : 0}
        onDone={refresh}
      />
    </div>
  );
}
