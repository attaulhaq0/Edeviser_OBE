import type { SubCLOFormData } from "@/lib/schemas/subCLO";

/**
 * Pure builders for the sub_clos write payloads.
 *
 * QA regression guard (2026-09-02): the UI collected `code`/`weight` but the
 * hook stripped them before insert/update, so the database never stored a
 * weight and the manager's total showed 0%. These builders make the
 * weight/code persistence explicit and unit-testable.
 */

export interface SubCLOInsertPayload {
  title: string;
  description: string | null;
  clo_id: string;
  code: string;
  weight: number;
}

export function buildSubCLOInsertPayload(
  data: SubCLOFormData
): SubCLOInsertPayload {
  return {
    title: data.title,
    description: data.description ?? null,
    clo_id: data.parent_outcome_id,
    code: data.code,
    weight: data.weight,
  };
}

export function buildSubCLOUpdatePayload(
  data: Partial<SubCLOFormData>
): Partial<SubCLOInsertPayload> {
  const update: Partial<SubCLOInsertPayload> = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.description !== undefined) update.description = data.description;
  if (data.code !== undefined) update.code = data.code;
  if (data.weight !== undefined) update.weight = data.weight;
  return update;
}
