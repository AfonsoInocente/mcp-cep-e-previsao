/**
 * This is where you define your workflows.
 *
 * Workflows are a way to encode complex flows of steps
 * reusing your tools and with built-in observability
 * on the Deco project dashboard. They can also do much more!
 *
 * When exported, they will be available on the MCP server
 * via built-in tools for starting, resuming and cancelling
 * them.
 *
 * @see https://docs.deco.page/en/guides/building-workflows/
 */
import {
  createStepFromTool,
  createWorkflow,
} from "@deco/workers-runtime/mastra";
import { z } from "zod";
import { Env } from "./main";
import {
  createZipCodeLookupTool,
  createCitySearchTool,
  createWeatherForecastTool,
  createIntelligentDecisorTool,
} from "./tools/index.ts";
import {
  ZipCodeInputSchema,
  ZipCodeWeatherSchema,
  IntelligentWorkflowInputSchema,
  IntelligentWorkflowOutputSchema,
} from "../common/schemas/index.ts";

const createZipCodeAndWeatherWorkflow = (env: Env) => {
  const zipCodeStep = createStepFromTool(createZipCodeLookupTool(env));
  const citySearchStep = createStepFromTool(createCitySearchTool(env));
  const weatherStep = createStepFromTool(createWeatherForecastTool(env));

  return createWorkflow({
    id: "ZIP_CODE_AND_WEATHER_WORKFLOW",
    inputSchema: ZipCodeInputSchema,
    outputSchema: ZipCodeWeatherSchema,
  })
    .then(zipCodeStep)
    .map(async ({ inputData }) => ({
      nomeCidade: inputData.city,
    }))
    .then(citySearchStep)
    .map(async ({ inputData, getStepResult }) => {
      const zipCodeData = getStepResult(zipCodeStep);
      const locales = inputData.locations;

      // Busca a localidade que corresponde ao estado do CEP
      const foundedLocation = locales.find(
        (locale: any) => locale.estado === zipCodeData.state
      );

      return {
        zipcode: zipCodeData.zipcode,
        state: zipCodeData.state,
        city: zipCodeData.city,
        neighborhood: zipCodeData.neighborhood,
        street: zipCodeData.street,
        location_id: foundedLocation?.id,
      };
    })
    .map(async ({ inputData, getStepResult }: any) => {
      const zipCodeData = getStepResult(zipCodeStep);
      const localeData = inputData;

      // Sempre prepara para buscar previsão do tempo se tem location_id
      if (localeData.location_id) {
        return {
          cityCode: localeData.location_id,
        };
      }

      return {
        zipcode: zipCodeData.zipcode,
        state: zipCodeData.state,
        city: zipCodeData.city,
        neighborhood: zipCodeData.neighborhood,
        street: zipCodeData.street,
        location_id: undefined,
        weather: undefined,
      };
    })
    .then(weatherStep)
    .map(async ({ inputData, getStepResult }: any) => {
      const zipCodeData = getStepResult(zipCodeStep);
      const localeData = getStepResult(citySearchStep);

      // Sempre retorna os dados básicos do ZIP code
      const result = {
        zipcode: zipCodeData.zipcode,
        state: zipCodeData.state,
        city: zipCodeData.city,
        neighborhood: zipCodeData.neighborhood,
        street: zipCodeData.street,
        location_id: localeData.location_id,
        weather: undefined,
      };

      // Se tem dados de previsão, adiciona o weather
      if (inputData && inputData.clima && Array.isArray(inputData.clima)) {
        const formattedWeather = inputData.clima.map((item: any) => ({
          condition: item.condicao_desc,
          minimum: item.min,
          maximum: item.max,
        }));
        result.weather = formattedWeather;
      }

      return result;
    })
    .commit();
};

const createIntelligentMainWorkflow = (env: Env) => {
  const decisionStep = createStepFromTool(createIntelligentDecisorTool(env));

  return createWorkflow({
    id: "INTELLIGENT_MAIN_WORKFLOW",
    inputSchema: IntelligentWorkflowInputSchema,
    outputSchema: IntelligentWorkflowOutputSchema,
  })
    .then(decisionStep as any)
    .map(async ({ inputData }) => {
      return {
        initialMessage: inputData.mensagem_amigavel,
        executedAction: inputData.acao,
        finalMessage: `✅ Analysis completed! ${inputData.mensagem_amigavel}`,
      };
    })
    .commit();
};

export const workflows = [
  createZipCodeAndWeatherWorkflow,
  createIntelligentMainWorkflow,
];
