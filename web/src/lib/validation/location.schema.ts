import { z } from "zod";

export const locationCreateSchema = z.object({
  name: z.string().trim().min(1, "Location name is required.").max(200),
});
export type LocationCreateInput = z.infer<typeof locationCreateSchema>;
