import { createClient } from "@deco/workers-runtime/client";
import { TOOL_IDS } from "../../../common/types/constants";
import type {
  ZipCodeRequest,
  ZipCodeResponse,
  CitySearchRequest,
  CitySearchResponse,
  WeatherForecastRequest,
  WeatherForecastResponse,
  IntelligentWorkflowRequest,
  IntelligentDecisorResponse,
} from "../../../common/schemas";

type ToolsMCP = {
  // ZIP Code lookup tool
  [TOOL_IDS.ZIP_CODE_LOOKUP]: (
    input: ZipCodeRequest
  ) => Promise<ZipCodeResponse>;

  // City search tool
  [TOOL_IDS.CITY_SEARCH]: (
    input: CitySearchRequest
  ) => Promise<CitySearchResponse>;

  // Weather forecast tool (returns English field names for API communication)
  [TOOL_IDS.WEATHER_FORECAST]: (
    input: WeatherForecastRequest
  ) => Promise<WeatherForecastResponse>;

  // Intelligent decisor tool
  [TOOL_IDS.INTELLIGENT_DECISOR]: (
    input: IntelligentWorkflowRequest
  ) => Promise<IntelligentDecisorResponse>;
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
