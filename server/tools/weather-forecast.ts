/**
 * Weather Forecast Tool
 * 
 * Consults weather forecast for a city using CPTEC API from Brasil API
 */

import { createTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "../main.ts";
import { PrevisaoErrorManager, PrevisaoError } from "../error-manager.ts";

export const createWeatherForecastTool = (env: Env) =>
  createTool({
    id: "PREVISAO_TEMPO",
    description:
      "Consulta previsão do tempo para uma cidade usando a API CPTEC da Brasil API",
    inputSchema: z.object({
      codigoCidade: z
        .number()
        .min(1, "Código da cidade deve ser um número positivo"),
    }),
    outputSchema: z.object({
      cidade: z.string(),
      estado: z.string(),
      atualizado_em: z.string(),
      clima: z.array(
        z.object({
          data: z.string(),
          condicao: z.string(),
          condicao_desc: z.string(),
          min: z.number(),
          max: z.number(),
          indice_uv: z.number(),
        })
      ),
    }),
    execute: async ({ context }) => {
      const { codigoCidade } = context;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

        const response = await fetch(
          `https://brasilapi.com.br/api/cptec/v1/clima/previsao/${codigoCidade}`,
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
          cidade: data.cidade,
          estado: data.estado,
          atualizado_em: data.atualizado_em,
          clima: data.clima.map((item: any) => ({
            data: item.data,
            condicao: item.condicao,
            condicao_desc: item.condicao_desc,
            min: item.min,
            max: item.max,
            indice_uv: item.indice_uv,
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
