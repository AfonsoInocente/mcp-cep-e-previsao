import { createClient } from "@deco/workers-runtime/client";
import { TOOL_IDS } from "../../../common/types/constants";
import type {
  ZipCodeInput,
  ZipCodeWeather,
  CitySearchInput,
  CitySearchOutput,
  WeatherForecastInput,
  WeatherForecastOutput,
  IntelligentWorkflowInput,
  IntelligentDecisorOutput,
} from "../../../common/schemas/zipcode-weather";

type ToolsMCP = {
  // ZIP Code lookup tool
  [TOOL_IDS.ZIP_CODE_LOOKUP]: (input: ZipCodeInput) => Promise<ZipCodeWeather>;

  // City search tool
  [TOOL_IDS.CITY_SEARCH]: (input: CitySearchInput) => Promise<CitySearchOutput>;

  // Weather forecast tool (returns English field names for API communication)
  [TOOL_IDS.WEATHER_FORECAST]: (
    input: WeatherForecastInput
  ) => Promise<WeatherForecastOutput>;

  // Intelligent decisor tool
  [TOOL_IDS.INTELLIGENT_DECISOR]: (
    input: IntelligentWorkflowInput
  ) => Promise<IntelligentDecisorOutput>;
};

/**
 * RPC Client for communicating with the MCP Server
 *
 * This client provides type-safe communication between the frontend (React)
 * and the backend (MCP Server). It uses the schemas defined in zipcode-weather.ts
 * to ensure type safety and consistency across the application.
 *
 * Usage examples:
 * - client.ZIP_CODE_LOOKUP({ zipcode: "01310-100" })
 * - client.SEARCH_LOCALITY({ cityName: "São Paulo" })
 * - client.WEATHER_FORECAST({ cityCode: 3550308 })
 * - client.INTELLIGENT_DECISOR({ userInput: "Como está o tempo em São Paulo?" })
 */
export const client = createClient<ToolsMCP>();
