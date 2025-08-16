/**
 * City Search Tool
 *
 * Searches for cities/locations by name using CPTEC API from Brasil API
 */

import { createTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "../main.ts";
import { LocalidadeErrorManager, LocalidadeError } from "../error-manager.ts";

export const createCitySearchTool = (env: Env) =>
  createTool({
    id: "BUSCAR_LOCALIDADE",
    description:
      "Busca localidades (cidades) através do nome usando a API CPTEC da Brasil API",
    inputSchema: z.object({
      nomeCidade: z
        .string()
        .min(2, "Nome da cidade deve ter pelo menos 2 caracteres"),
    }),
    outputSchema: z.object({
      localidades: z.array(
        z.object({
          id: z.number(),
          nome: z.string(),
          estado: z.string(),
        })
      ),
    }),
    execute: async ({ context }) => {
      const { nomeCidade } = context;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

        const response = await fetch(
          `https://brasilapi.com.br/api/cptec/v1/cidade/${encodeURIComponent(nomeCidade)}`,
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
          localidades: data.map((localidade: any) => ({
            id: localidade.id,
            nome: localidade.nome,
            estado: localidade.estado,
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
