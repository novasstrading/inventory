"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";
import { downloadCsv } from "@/lib/csv";
import type { Asset, Category, Employee, Location } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AssetCard } from "./asset-card";
import { AssetDetailSheet } from "./asset-detail-sheet";
import { AssetFormDialog } from "./asset-form-dialog";
import { TransferDialog } from "./transfer-dialog";

const PAGE_SIZES = [15, 30, 50, 100];

export function AssetsView({ isAdmin }: { isAdmin: boolean }) {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
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
      const [assetsData, catData, empData, locData] = await Promise.all([
        apiFetch<{ assets: Asset[] }>("/api/assets"),
        apiFetch<{ categories: Category[] }>("/api/categories"),
        apiFetch<{ employees: Employee[] }>("/api/employees"),
        apiFetch<{ locations: Location[] }>("/api/locations"),
      ]);
      setAssets(assetsData.assets);
      setCategories(catData.categories);
      setEmployees(empData.employees);
      setLocations(locData.locations);
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

  function clearFilters() {
    setSearch("");
    setFilterCategory("");
    setFilterType("");
    setFilterStatus("active");
    setPage(1);
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
    return (
      <div>
        <div className="mb-4.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[74px]" />
          ))}
        </div>
        <div className="mb-4 flex flex-wrap gap-2.5">
          <Skeleton className="h-10 min-w-[190px] flex-1" />
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[140px]" />
        </div>
        <Card className="overflow-hidden">
          <div className="divide-y divide-line-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const emptyStateBlock =
    assets.length === 0 ? (
      <EmptyState
        title="No assets yet"
        description="Get started by adding your first hardware or software asset to the inventory."
        action={
          isAdmin && (
            <Button variant="gold" onClick={openAdd}>
              + Add your first asset
            </Button>
          )
        }
      />
    ) : (
      <EmptyState
        title="No matches"
        description="No assets match the current search and filters. Try adjusting or clearing them."
        action={
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      />
    );

  return (
    <div>
      <div className="mb-4.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Hardware" value={stats.hardware} accent="bg-navy" color="text-navy" />
        <StatTile label="Software" value={stats.software} accent="bg-[#5A3E9B]" color="text-[#5A3E9B]" />
        <StatTile label="Removed" value={stats.removed} accent="bg-danger" color="text-danger" />
        <StatTile label="Employees" value={stats.employees} accent="bg-gold" color="text-gold" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-panel/60 p-2.5 shadow-[0_1px_2px_rgba(16,26,38,.04)]">
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

      <AnimatePresence mode="wait">
        <motion.div
          key={filtered.length}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="mb-2.5 text-[11.5px] font-medium text-muted-foreground"
        >
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
        </motion.div>
      </AnimatePresence>

      {/* mobile: card list */}
      <div className="flex flex-col gap-2.5 sm:hidden">
        {pageSlice.map((a) => (
          <AssetCard key={a.id} asset={a} holderName={employeeName(a.employeeId)} onOpen={() => openDetail(a)} />
        ))}
        {pageSlice.length === 0 && <Card>{emptyStateBlock}</Card>}
      </div>

      {/* desktop: table — header is intentionally NOT sticky. The horizontal-
          scroll wrapper below needs overflow-x-auto, and per the CSS overflow
          spec, setting overflow-x to anything but visible forces overflow-y to
          also compute as non-visible — silently turning that div into the
          sticky positioning container for any position:sticky descendant. It
          never actually scrolls vertically, so the thead's sticky offset came
          out wrong and it rendered overlapping the first row. Confirmed via a
          minimal reproduction before and after removing sticky. */}
      <Card className="hidden sm:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-panel">
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
                <TableRow key={a.id} className={cn("transition-colors hover:bg-muted/50", a.status === "removed" && "opacity-50")}>
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
        {pageSlice.length === 0 && emptyStateBlock}
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
        locations={locations}
        onLocationsChanged={refresh}
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
      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        asset={transferTarget}
        employees={employees}
        locations={locations}
        onLocationsChanged={refresh}
        onDone={refresh}
      />
    </div>
  );
}

function StatTile({ label, value, accent, color }: { label: string; value: number; accent: string; color: string }) {
  return (
    <Card hoverable className="relative overflow-hidden p-4">
      <div className={`absolute inset-y-0 left-0 w-[3px] ${accent}`} />
      <div className={`text-[26px] font-extrabold leading-none tracking-tight ${color}`}>{value}</div>
      <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
    </Card>
  );
}
