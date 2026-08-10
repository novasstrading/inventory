"use client";

import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";
import { downloadCsv } from "@/lib/csv";
import type { Asset, Category, Employee } from "@/lib/types";
import { AssetDetailSheet } from "./asset-detail-sheet";
import { AssetFormDialog } from "./asset-form-dialog";
import { TransferDialog } from "./transfer-dialog";

const PAGE_SIZES = [15, 30, 50, 100];

export function AssetsView({ isAdmin }: { isAdmin: boolean }) {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [search, setSearch] = React.useState("");
  const [filterCategory, setFilterCategory] = React.useState("");
  const [filterType, setFilterType] = React.useState<"" | "hardware" | "software">("");
  const [filterStatus, setFilterStatus] = React.useState<"active" | "removed" | "">("active");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingAsset, setEditingAsset] = React.useState<Asset | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailAsset, setDetailAsset] = React.useState<Asset | null>(null);
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [transferTarget, setTransferTarget] = React.useState<Asset | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const [assetsData, catData, empData] = await Promise.all([
        apiFetch<{ assets: Asset[] }>("/api/assets"),
        apiFetch<{ categories: Category[] }>("/api/categories"),
        apiFetch<{ employees: Employee[] }>("/api/employees"),
      ]);
      setAssets(assetsData.assets);
      setCategories(catData.categories);
      setEmployees(empData.employees);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const employeeName = React.useCallback(
    (id: string | null) => (id ? employees.find((e) => e.id === id)?.name ?? "" : ""),
    [employees],
  );

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    return assets.filter((a) => {
      if (filterType && a.type !== filterType) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      if (filterCategory && a.category !== filterCategory) return false;
      if (q) {
        const hay = [a.code, a.name, a.serial, a.brandModel, employeeName(a.employeeId), a.location, a.category, a.specs]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [assets, search, filterType, filterStatus, filterCategory, employeeName]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = React.useMemo(
    () => ({
      hardware: assets.filter((a) => a.type === "hardware" && a.status === "active").length,
      software: assets.filter((a) => a.type === "software" && a.status === "active").length,
      removed: assets.filter((a) => a.status === "removed").length,
      employees: employees.filter((e) => e.status === "active").length,
    }),
    [assets, employees],
  );

  function openAdd() {
    setEditingAsset(null);
    setFormOpen(true);
  }
  function openEdit(a: Asset) {
    setEditingAsset(a);
    setDetailOpen(false);
    setFormOpen(true);
  }
  function openDetail(a: Asset) {
    setDetailAsset(a);
    setDetailOpen(true);
  }
  function openTransfer(a: Asset) {
    setTransferTarget(a);
    setDetailOpen(false);
    setTransferOpen(true);
  }

  function exportCsv() {
    const cols: Array<keyof Asset> = [
      "code",
      "type",
      "category",
      "name",
      "brandModel",
      "serial",
      "specs",
      "vendor",
      "purchaseDate",
      "valueAmount",
      "valueCurrency",
      "valueType",
      "location",
      "status",
    ];
    const header = [...cols, "holder"];
    const rows = filtered.map((a) => [...cols.map((c) => String(a[c] ?? "")), employeeName(a.employeeId) || "Office"]);
    downloadCsv(`nova-assets-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  }

  if (loading) {
    return <Card className="p-10 text-center text-muted-foreground">Loading…</Card>;
  }

  return (
    <div>
      <div className="mb-4.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Hardware" value={stats.hardware} accent="bg-navy" color="text-navy" />
        <StatTile label="Software" value={stats.software} accent="bg-[#5A3E9B]" color="text-[#5A3E9B]" />
        <StatTile label="Removed" value={stats.removed} accent="bg-danger" color="text-danger" />
        <StatTile label="Employees" value={stats.employees} accent="bg-gold" color="text-gold" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="min-w-[190px] flex-1">
          <Input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search code, name, serial, holder…"
          />
        </div>
        <Select
          value={filterCategory}
          onChange={(e) => {
            setPage(1);
            setFilterCategory(e.target.value);
          }}
          className="w-auto min-w-[150px]"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </Select>
        <Segmented
          value={filterType}
          onChange={(v) => {
            setPage(1);
            setFilterType(v);
          }}
          options={[
            { value: "", label: "All" },
            { value: "hardware", label: "HW" },
            { value: "software", label: "SW" },
          ]}
        />
        <Segmented
          value={filterStatus}
          onChange={(v) => {
            setPage(1);
            setFilterStatus(v);
          }}
          options={[
            { value: "active", label: "Active" },
            { value: "removed", label: "Removed" },
            { value: "", label: "All" },
          ]}
        />
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <Button variant="ghost" size="sm" onClick={exportCsv}>
            ↓ CSV
          </Button>
          {isAdmin && (
            <Button variant="gold" onClick={openAdd}>
              + Add asset
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="hidden sm:table-cell">Holder</TableHead>
                <TableHead className="hidden sm:table-cell">Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageSlice.map((a) => (
                <TableRow key={a.id} className={a.status === "removed" ? "opacity-50" : ""}>
                  <TableCell>
                    {a.code ? (
                      <span className="font-mono text-xs font-bold tracking-wide text-navy">{a.code}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <button className="font-semibold text-ink hover:text-navy hover:underline" onClick={() => openDetail(a)}>
                      {a.name}
                    </button>
                    {a.brandModel && <div className="mt-0.5 text-[11.5px] text-muted-foreground">{a.brandModel}</div>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={a.type}>{a.category}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {a.employeeId ? employeeName(a.employeeId) || "—" : <Badge variant="neutral">Office</Badge>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{a.location || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <Badge variant={a.status}>{a.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="xs" onClick={() => openDetail(a)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {pageSlice.length === 0 && (
          <div className="p-16 text-center text-muted-foreground">
            <div className="mb-3 text-4xl opacity-50">📦</div>
            No assets match. Try different filters, or add one.
          </div>
        )}
      </Card>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          <span>Rows:</span>
          <Select
            value={String(pageSize)}
            onChange={(e) => {
              setPage(1);
              setPageSize(Number(e.target.value));
            }}
            className="h-8 w-auto py-1"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          <span>
            {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)} of{" "}
            {filtered.length}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button variant="default" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                ‹
              </Button>
              <span className="px-1">
                {currentPage} / {totalPages}
              </span>
              <Button variant="default" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
                ›
              </Button>
            </div>
          )}
        </div>
      </div>

      <AssetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        asset={editingAsset}
        categories={categories}
        employees={employees}
        onSaved={refresh}
      />
      <AssetDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        asset={detailAsset}
        employees={employees}
        isAdmin={isAdmin}
        onEdit={openEdit}
        onTransfer={openTransfer}
        onChanged={refresh}
      />
      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} asset={transferTarget} employees={employees} onDone={refresh} />
    </div>
  );
}

function StatTile({ label, value, accent, color }: { label: string; value: number; accent: string; color: string }) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className={`absolute inset-y-0 left-0 w-[3px] ${accent}`} />
      <div className={`text-[26px] font-extrabold leading-none tracking-tight ${color}`}>{value}</div>
      <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
    </Card>
  );
}
