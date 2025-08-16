import { z } from "zod";
import { AnalysisBaseSchema, InsightsBaseSchema } from "./base-schemas.ts";

/**
 * Data analysis response schema
 */
export const DataAnalysisResponseSchema = z.object({
  analysis: AnalysisBaseSchema,
  insights: InsightsBaseSchema,
});

export type DataAnalysisResponse = z.infer<typeof DataAnalysisResponseSchema>;
