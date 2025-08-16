import { z } from "zod";
import { ACTIONS } from "../consts/constants.ts";

/**
 * ZIP code input schema with validation
 */
export const ZipCodeInputSchema = z.object({
  zipcode: z.string().transform((val) => {
    const cleaned = val.replace(/\D/g, "");
    if (cleaned.length !== 8) {
      throw new Error("ZIP code must contain exactly 8 numeric digits");
    }
    return cleaned;
  }),
});

export type ZipCodeInput = z.infer<typeof ZipCodeInputSchema>;

/**
 * City search input schema
 */
export const CitySearchInputSchema = z.object({
  cityName: z
    .string()
    .min(2, "Nome da cidade deve ter pelo menos 2 caracteres"),
});

export type CitySearchInput = z.infer<typeof CitySearchInputSchema>;

/**
 * City location schema
 */
export const CityLocationSchema = z.object({
  id: z.number(),
  name: z.string(),
  state: z.string(),
});

export type CityLocation = z.infer<typeof CityLocationSchema>;

/**
 * City search output schema
 */
export const CitySearchOutputSchema = z.object({
  locations: z.array(CityLocationSchema),
});

export type CitySearchOutput = z.infer<typeof CitySearchOutputSchema>;

/**
 * Base weather condition schema
 */
export const BaseWeatherConditionSchema = z.object({
  condition: z.string(),
  minimum: z.number(),
  maximum: z.number(),
});

export type BaseWeatherCondition = z.infer<typeof BaseWeatherConditionSchema>;

/**
 * Extended weather condition schema for data analysis
 * Extends base weather condition with additional fields
 */
export const ExtendedWeatherConditionSchema = BaseWeatherConditionSchema.extend(
  {
    date: z.string(),
    conditionDescription: z.string(),
    uvIndex: z.number(),
  }
);

export type ExtendedWeatherCondition = z.infer<
  typeof ExtendedWeatherConditionSchema
>;

/**
 * Weather condition schema (alias for base)
 */
export const WeatherConditionSchema = BaseWeatherConditionSchema;
export type WeatherCondition = BaseWeatherCondition;

/**
 * Location base schema
 */
export const LocationBaseSchema = z.object({
  state: z.string(),
  city: z.string(),
});

export type LocationBase = z.infer<typeof LocationBaseSchema>;

/**
 * ZIP code and weather response schema
 */
export const ZipCodeWeatherSchema = z.object({
  zipcode: z.string(),
  ...LocationBaseSchema.shape, // reuse location base schema
  neighborhood: z.string(),
  street: z.string(),
  location_id: z.number().optional(),
  weather: z.array(WeatherConditionSchema).optional(),
});

export type ZipCodeWeather = z.infer<typeof ZipCodeWeatherSchema>;

/**
 * Data analysis input schema
 */
export const DataAnalysisInputSchema = z.object({
  zipcode: z.string(),
  ...LocationBaseSchema.shape, // reuse location base schema
  neighborhood: z.string().optional(),
  street: z.string().optional(),
  weather: z.array(ExtendedWeatherConditionSchema).optional(),
});

export type DataAnalysisInput = z.infer<typeof DataAnalysisInputSchema>;

/**
 * Analysis base schema
 */
export const AnalysisBaseSchema = z.object({
  locationSummary: z.string(),
  climateCharacteristics: z.string(),
  recommendations: z.array(z.string()),
  curiosities: z.array(z.string()),
  alerts: z.array(z.string()).optional(),
});

export type AnalysisBase = z.infer<typeof AnalysisBaseSchema>;

/**
 * Insights base schema
 */
export const InsightsBaseSchema = z.object({
  climateType: z.string(),
  uvIntensity: z.string(),
  temperatureVariation: z.string(),
  estimatedAirQuality: z.string(),
});

export type InsightsBase = z.infer<typeof InsightsBaseSchema>;

/**
 * Data analysis output schema
 */
export const DataAnalysisOutputSchema = z.object({
  analysis: AnalysisBaseSchema,
  insights: InsightsBaseSchema,
});

export type DataAnalysisOutput = z.infer<typeof DataAnalysisOutputSchema>;

/**
 * Message base schema
 */
export const MessageBaseSchema = z.object({
  message: z.string(),
});

export type MessageBase = z.infer<typeof MessageBaseSchema>;

/**
 * Intelligent workflow input schema
 */
export const IntelligentWorkflowInputSchema = z.object({
  userInput: z.string().min(1, "User input is required"),
});

export type IntelligentWorkflowInput = z.infer<
  typeof IntelligentWorkflowInputSchema
>;

/**
 * Intelligent workflow output schema
 */
export const IntelligentWorkflowOutputSchema = z.object({
  initialMessage: z.string(),
  executedAction: z.string(),
  finalMessage: z.string(),
});

export type IntelligentWorkflowOutput = z.infer<
  typeof IntelligentWorkflowOutputSchema
>;

/**
 * Action enum for intelligent decisor
 * Uses constants from constants.ts to avoid duplication
 */
export const ActionEnum = z.enum([
  ACTIONS.CONSULT_ZIP_CODE,
  ACTIONS.CONSULT_ZIP_CODE_AND_WEATHER,
  ACTIONS.CONSULT_WEATHER_DIRECT,
  ACTIONS.OUT_OF_SCOPE,
  ACTIONS.REQUEST_ZIP_CODE,
  ACTIONS.REQUEST_LOCATION,
  ACTIONS.MULTIPLE_CITIES,
  ACTIONS.CITY_NOT_FOUND,
]);

export type Action = z.infer<typeof ActionEnum>;

/**
 * Intelligent decisor tool output schema
 */
export const IntelligentDecisorOutputSchema = z.object({
  action: ActionEnum,
  extractedZipCode: z.string().optional(),
  extractedCity: z.string().optional(),
  justification: z.string(),
  friendlyMessage: z.string(),
  foundCities: z.array(CityLocationSchema).optional(), // reuse city location schema
});

export type IntelligentDecisorOutput = z.infer<
  typeof IntelligentDecisorOutputSchema
>;

/**
 * Weather forecast input schema
 */
export const WeatherForecastInputSchema = z.object({
  cityCode: z.number().min(1, "Código da cidade deve ser um número positivo"),
});

export type WeatherForecastInput = z.infer<typeof WeatherForecastInputSchema>;

/**
 * Weather forecast output schema
 * Note: This schema keeps BrasilAPI response fields in Portuguese
 * but converts them to English for internal API communication
 */
export const WeatherForecastOutputSchema = z.object({
  ...LocationBaseSchema.shape, // reuse location base schema
  updatedAt: z.string(), // converted from 'atualizado_em'
  weather: z.array(ExtendedWeatherConditionSchema), // reuse extended weather condition
});

export type WeatherForecastOutput = z.infer<typeof WeatherForecastOutputSchema>;
