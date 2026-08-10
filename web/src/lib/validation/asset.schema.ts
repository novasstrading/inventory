import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

export const assetCreateSchema = z.object({
  category: z.string().trim().min(1, "Category is required."),
  name: z.string().trim().min(1, "Name is required.").max(200),
  brandModel: optionalText(200),
  serial: optionalText(150),
  specs: optionalText(500),
  vendor: optionalText(150),
  purchaseDate: optionalText(20),
  valueAmount: optionalText(20),
  valueCurrency: z.enum(["BDT", "USD"]).optional().default("BDT"),
  valueType: z.enum(["one_time", "monthly", "yearly"]).optional().default("one_time"),
  employeeId: optionalText(26),
  location: optionalText(200),
  notes: optionalText(2000),
});
export type AssetCreateInput = z.infer<typeof assetCreateSchema>;

export const assetUpdateSchema = assetCreateSchema
  .omit({ category: true })
  .partial()
  .extend({ id: z.string().min(1) });
export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>;

export const assetRemoveSchema = z.object({
  id: z.string().min(1),
  restore: z.boolean().optional().default(false),
});

export const assetTransferSchema = z.object({
  id: z.string().min(1),
  employeeId: optionalText(26),
  toLocation: optionalText(200),
  notes: optionalText(500),
});
export type AssetTransferInput = z.infer<typeof assetTransferSchema>;
