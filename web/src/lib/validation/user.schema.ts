import { z } from "zod";

export const userAddSchema = z.object({
  email: z.string().trim().min(1, "Enter a valid email address.").email("Enter a valid email address."),
  role: z.enum(["admin", "viewer"]).optional().default("viewer"),
  // Omitted => defaultModulesForRole(role). Values are validated against MODULES in lib/users/service.ts.
  modules: z.array(z.string().trim().max(32)).max(10).optional(),
});

export const userModulesSchema = z.object({
  modules: z.array(z.string().trim().max(32)).max(10),
});
