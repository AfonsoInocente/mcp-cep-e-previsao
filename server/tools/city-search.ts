/**
 * City Search Tool
 *
 * Searches for cities/locations by name using CPTEC API from Brasil API
 */

import { createTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "../main.ts";
import { TOOL_IDS } from "../../common/consts/constants.ts";
import { LocalidadeErrorManager, LocalidadeError } from "../error-manager.ts";
import { CitySearchRequestSchema } from "../../common/schemas/city-request.ts";
import { CitySearchResponseSchema } from "../../common/schemas/city-response.ts";

export const createCitySearchTool = (env: Env) =>
  createTool({
    id: TOOL_IDS.CITY_SEARCH,
    description:
      "Busca localidades (cidades) através do nome usando a API CPTEC da Brasil API",
    inputSchema: CitySearchRequestSchema,
    outputSchema: CitySearchResponseSchema,
    execute: async ({ context }) => {
      const { cityName } = context;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

        const response = await fetch(
          `${env.BRASIL_API_BASE_URL}${env.BRASIL_API_CITY_SEARCH}/${encodeURIComponent(cityName)}`,
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
          const error = LocalidadeErrorManager.handleAPIError(
            response.status,
            response.statusText
          );
          throw error;
        }

        const data = await response.json();

        return {
          locations: data.map((localidade: any) => ({
            id: localidade.id,
            name: localidade.nome,
            state: localidade.estado,
          })),
        };
      } catch (error) {
        // Se já é um LocalidadeError, repassa diretamente
        if (error instanceof LocalidadeError) {
          throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
          throw LocalidadeErrorManager.createTimeoutError();
        }

        // Se é um erro de rede ou outro tipo, cria um erro de servidor
        throw LocalidadeErrorManager.createServerError();
      }
    },
  });
