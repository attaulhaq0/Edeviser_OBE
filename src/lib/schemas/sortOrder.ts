import { z } from "zod";

/**
 * E1.7 (platform-hardening-and-integration): sort-order fields must always
 * emit friendly messages instead of Zod defaults ("Invalid input: expected
 * number, received NaN"). Pair with `normalizeSortOrderInput` at the input
 * boundary so cleared/stepped fields never submit raw strings/NaN.
 */
export const sortOrderSchema = z
  .number({
    message: "Sort order must be a whole number of 0 or greater",
  })
  .int("Sort order must be a whole number")
  .min(0, "Sort order cannot be negative");

/** Normalizes a raw number-input value ("" / NaN / garbage) to 0. */
export const normalizeSortOrderInput = (value: unknown): number => {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export type SortOrderValue = z.infer<typeof sortOrderSchema>;
