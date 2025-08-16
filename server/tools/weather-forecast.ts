/**
 * Weather Forecast Tool
 *
 * Consults weather forecast for a city using CPTEC API from Brasil API
 */

import { createTool } from "@deco/workers-runtime/mastra";
import type { Env } from "../main.ts";
import { TOOL_IDS } from "../../common/types/constants.ts";
import { PrevisaoErrorManager, PrevisaoError } from "../error-manager.ts";
import {
  WeatherForecastInputSchema,
  WeatherForecastOutputSchema,
} from "../../common/schemas/zipcode-weather.ts";

export const createWeatherForecastTool = (env: Env) =>
  createTool({
    id: TOOL_IDS.WEATHER_FORECAST,
    description:
      "Consulta previsão do tempo para uma cidade usando a API CPTEC da Brasil API",
    inputSchema: WeatherForecastInputSchema,
    outputSchema: WeatherForecastOutputSchema,
    execute: async ({ context }) => {
      const { cityCode } = context;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

        const response = await fetch(
          `https://brasilapi.com.br/api/cptec/v1/clima/previsao/${cityCode}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "User-Agent": "Deco-MCP-Server/1.0",
            },
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          let responseBody;
          try {
            responseBody = await response.json();
          } catch {
            // Se não conseguir fazer parse do JSON, continua sem o responseBody
          }

          const error = PrevisaoErrorManager.handleAPIError(
            response.status,
            response.statusText,
            responseBody
          );
          throw error;
        }

        const data = await response.json();

        return {
          city: data.cidade, // convert from Portuguese to English
          state: data.estado, // convert from Portuguese to English
          updatedAt: data.atualizado_em, // convert from Portuguese to English
          weather: data.clima.map((item: any) => ({
            // convert from Portuguese to English
            date: item.data, // convert from Portuguese to English
            condition: item.condition,
            conditionDescription: item.condicao_desc, // convert from Portuguese to English
            minimum: item.min, // convert from Portuguese to English
            maximum: item.max, // convert from Portuguese to English
            uvIndex: item.indice_uv, // convert from Portuguese to English
          })),
        };
      } catch (error) {
        // Se já é um PrevisaoError, repassa diretamente
        if (error instanceof PrevisaoError) {
          throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
          throw PrevisaoErrorManager.createTimeoutError();
        }

        throw PrevisaoErrorManager.createServerError();
      }
    },
  });
