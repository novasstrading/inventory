import { z } from "zod";

export const requestCodeSchema = z.object({
  email: z.string().trim().min(1, "Enter a valid email address."),
});

export const verifyCodeSchema = z.object({
  email: z.string().trim().min(1, "Enter a valid email address."),
  code: z.string().trim().length(6, "Enter all 6 digits."),
});
