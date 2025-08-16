import { z } from "zod";
import { LocationBaseSchema } from "./base-schemas.ts";
import { ExtendedWeatherConditionSchema } from "./weather-response.ts";

/**
 * Data analysis request schema
 */
export const DataAnalysisRequestSchema = z.object({
  zipcode: z.string(),
  ...LocationBaseSchema.shape, // reuse location base schema
  neighborhood: z.string().optional(),
  street: z.string().optional(),
  weather: z.array(ExtendedWeatherConditionSchema).optional(),
});

export type DataAnalysisRequest = z.infer<typeof DataAnalysisRequestSchema>;
