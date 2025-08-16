/**
 * This is where you define your tools.
 *
 * Tools are the functions that will be available on your
 * MCP server. They can be called from any other Deco app
 * or from your front-end code via typed RPC. This is the
 * recommended way to build your Web App.
 *
 * @see https://docs.deco.page/en/guides/creating-tools/
 */

/**
 * Index of all system tools
 *
 * This file centralizes exports of all tools
 * to facilitate imports in other modules
 */

// Import all tools
import { createZipCodeLookupTool } from "./zipcode-lookup.ts";
import { createCitySearchTool } from "./city-search.ts";
import { createWeatherForecastTool } from "./weather-forecast.ts";
import { createDataAnalysisTool } from "./data-analysis.ts";
import { createIntelligentDecisorTool } from "./intelligent-decisor.ts";
import { createAITestTool } from "./ai-test.ts";

// Re-export all tools for individual imports
export { createZipCodeLookupTool } from "./zipcode-lookup.ts";
export { createCitySearchTool } from "./city-search.ts";
export { createWeatherForecastTool } from "./weather-forecast.ts";
export { createDataAnalysisTool } from "./data-analysis.ts";
export { createIntelligentDecisorTool } from "./intelligent-decisor.ts";
export { createAITestTool } from "./ai-test.ts";

// Array de exportação das tools
export const tools = [
  createZipCodeLookupTool,
  createCitySearchTool,
  createWeatherForecastTool,
  createDataAnalysisTool,
  createIntelligentDecisorTool,
  createAITestTool,
];
