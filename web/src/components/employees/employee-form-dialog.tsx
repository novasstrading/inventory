"use client";

import * as React from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { withBasePath } from "@/lib/base-path";
import type { Employee } from "@/lib/types";

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onSaved: () => Promise<void> | void;
}) {
  const isEdit = !!employee;
  const [name, setName] = React.useState(employee?.name ?? "");
  const [designation, setDesignation] = React.useState(employee?.designation ?? "");
  const [contact, setContact] = React.useState(employee?.contact ?? "");
  const [email, setEmail] = React.useState(employee?.email ?? "");
  const [saving, setSaving] = React.useState(false);
  const [photoNonce, setPhotoNonce] = React.useState(0);

  React.useEffect(() => {
    if (!open) return;
    setName(employee?.name ?? "");
    setDesignation(employee?.designation ?? "");
    setContact(employee?.contact ?? "");
    setEmail(employee?.email ?? "");
  }, [open, employee]);

  async function save() {
    if (!name.trim()) return toast.error("Name is required.");
    setSaving(true);
    try {
      const payload = { name, designation, contact, email };
      if (isEdit) {
        await apiFetch(`/api/employees/${employee.id}`, { method: "PATCH", body: payload });
        toast.success("Employee updated.");
      } else {
        await apiFetch("/api/employees", { body: payload });
        toast.success("Employee added.");
      }
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file: File) {
    if (!employee) return;
    if (!file.size) return toast.error("Empty file.");
    const fd = new FormData();
    fd.append("photo", file, file.name);
    try {
      await fetch(withBasePath(`/api/employees/${employee.id}/photo`), { method: "POST", body: fd }).then(async (r) => {
        const data = await r.json();
        if (!data.ok) throw new Error(data.error ?? "Upload failed.");
      });
      setPhotoNonce((n) => n + 1);
      toast.success("Photo updated.");
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload photo.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit employee" : "Add employee"}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {isEdit && (
            <div className="mb-4.5 flex items-center gap-3.5">
              <Avatar name={employee.name} photoUrl={employee.photoKey ? `/api/employees/${employee.id}/photo?v=${photoNonce}` : null} size="lg" />
              <label className="cursor-pointer rounded-md border border-input px-3 py-1.5 text-sm font-semibold text-navy hover:bg-muted">
                📷 Change photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
                />
              </label>
            </div>
          )}
          <div className="mb-3">
            <Label>Full name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ornab Hasan" />
          </div>
          <div className="mb-3">
            <Label>Designation</Label>
            <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Merchandiser" />
          </div>
          <div className="mb-3">
            <Label>Contact (optional)</Label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone number" />
          </div>
          <div className="mb-3">
            <Label>Email (any provider)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </div>
          {!isEdit && <div className="text-xs text-muted-foreground">You can add a photo after creating the employee.</div>}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={saving} onClick={save}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
