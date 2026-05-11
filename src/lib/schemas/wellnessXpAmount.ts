import { z } from "zod";

export const wellnessXpAmountSchema = z.number().int().min(0).max(25);
