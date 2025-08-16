/**
 * ZipCode Lookup Tool
 *
 * Consults address information through ZIP code using Brasil API
 */

import { createTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "../main.ts";
import { CEPErrorManager, CEPError } from "../error-manager.ts";

export const createZipCodeLookupTool = (env: Env) =>
  createTool({
    id: "CONSULTAR_CEP",
    description:
      "Consulta informações de endereço através do CEP usando a Brasil API",
    inputSchema: z.object({
      cep: z.string().transform((val) => {
        const cleaned = val.replace(/\D/g, "");

        if (cleaned.length !== 8) {
          throw new Error("CEP deve conter exatamente 8 dígitos numéricos");
        }

        return cleaned;
      }),
    }),
    outputSchema: z.object({
      cep: z.string(),
      state: z.string(),
      city: z.string(),
      neighborhood: z.string(),
      street: z.string(),
    }),
    execute: async ({ context }) => {
      const { cep } = context;

      console.log(`🔍 CONSULTAR_CEP: Iniciando consulta para CEP ${cep}`);

      try {
        const response = await fetch(
          `https://brasilapi.com.br/api/cep/v1/${cep}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "User-Agent": "Deco-MCP-Server/1.0",
            },
          }
        );

        console.log(
          `📊 CONSULTAR_CEP: Status da resposta: ${response.status} ${response.statusText}`
        );

        if (!response.ok) {
          console.log(
            `❌ CONSULTAR_CEP: Erro na API - ${response.status} ${response.statusText}`
          );
          throw CEPErrorManager.handleAPIError(
            response.status,
            response.statusText
          );
        }

        const data = await response.json();
        console.log(`✅ CONSULTAR_CEP: Dados recebidos:`, data);

        const result = {
          cep: data.cep,
          state: data.state,
          city: data.city,
          neighborhood: data.neighborhood || "Não Informado",
          street: data.street || "Não Informado",
        };

        console.log(`✅ CONSULTAR_CEP: Resultado final:`, result);
        return result;
      } catch (error) {
        console.log(`💥 CONSULTAR_CEP: Erro capturado:`, error);

        if (error instanceof CEPError) {
          throw error;
        }

        console.log(`🔥 CONSULTAR_CEP: Erro genérico, criando server error`);
        throw CEPErrorManager.createServerError();
      }
    },
  });
