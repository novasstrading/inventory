import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

export const employeeCreateSchema = z.object({
  name: z.string().trim().min(1, "Employee name is required.").max(150),
  designation: optionalText(150),
  contact: optionalText(150),
  email: optionalText(190),
});
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;

export const employeeUpdateSchema = employeeCreateSchema.partial().extend({ id: z.string().min(1) });
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;

export const employeeReleaseSchema = z.object({
  id: z.string().min(1),
  note: optionalText(500),
  // Destination for each asset currently assigned to this employee — every
  // held asset must be resolved to Office (empty employeeId) or another
  // employee before the release can complete.
  reassignments: z
    .array(z.object({ assetId: z.string().min(1), employeeId: optionalText(26) }))
    .optional()
    .default([]),
});
