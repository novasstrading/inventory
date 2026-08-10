import { z } from "zod";

export const userAddSchema = z.object({
  email: z.string().trim().min(1, "Enter a valid email address.").email("Enter a valid email address."),
  role: z.enum(["admin", "viewer"]).optional().default("viewer"),
});
