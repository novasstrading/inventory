"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetBody, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Asset, Employee } from "@/lib/types";

function Kv({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words text-ink-2">{value}</dd>
    </>
  );
}

export function EmployeeDetailSheet({
  open,
  onOpenChange,
  employee,
  assets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  assets: Asset[];
}) {
  if (!employee) return null;
  const held = assets.filter((a) => a.employeeId === employee.id && a.status === "active");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader className="border-b-0 bg-[linear-gradient(135deg,var(--navy)_0%,var(--navy-2)_100%)]">
          <div className="flex-1" />
          <SheetClose className="text-white/70 hover:bg-white/10 hover:text-white" />
        </SheetHeader>
        <div className="bg-[linear-gradient(135deg,var(--navy)_0%,var(--navy-2)_100%)] px-5 pb-5 pt-1 text-white">
          <div className="flex items-center gap-3">
            <Avatar name={employee.name} photoUrl={employee.photoKey ? `/api/employees/${employee.id}/photo` : null} size="lg" />
            <div>
              <SheetTitle className="text-white">{employee.name}</SheetTitle>
              {employee.designation && <div className="mt-0.5 text-[13px] text-white/70">{employee.designation}</div>}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={employee.status === "active" ? "active" : "released"}>{employee.status}</Badge>
          </div>
        </div>
        <SheetBody>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Contact</div>
          <dl className="grid grid-cols-[100px_1fr] gap-x-3.5 gap-y-2 text-[13.5px]">
            <Kv label="Contact" value={employee.contact} />
            <Kv label="Email" value={employee.email} />
            {employee.status === "released" && employee.releasedNote && <Kv label="Release note" value={employee.releasedNote} />}
          </dl>

          <div className="mt-5 border-t border-line-2 pt-4">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Assigned assets
              </div>
              <span className="text-[11.5px] text-muted-foreground">{held.length}</span>
            </div>
            {held.length === 0 ? (
              <div className="text-[13px] text-muted-foreground">Not currently holding any assets.</div>
            ) : (
              <ul className="list-none p-0">
                {held.map((a) => (
                  <li key={a.id} className="border-b border-line-2 py-2.5 text-[13.5px] last:border-0">
                    <div className="flex items-center gap-2">
                      {a.code && <span className="font-mono text-[11.5px] font-bold text-navy">{a.code}</span>}
                      <Badge variant={a.type}>{a.category}</Badge>
                    </div>
                    <div className="mt-0.5 font-semibold text-ink">{a.name}</div>
                    {a.location && <div className="mt-0.5 text-[11.5px] text-muted-foreground">{a.location}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
