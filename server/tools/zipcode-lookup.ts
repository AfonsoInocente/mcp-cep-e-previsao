/**
 * ZipCode Lookup Tool
 *
 * Consults address information through ZIP code using Brasil API
 */

import { createTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "../main.ts";
import { CEPErrorManager, CEPError } from "../error-manager.ts";
import { ACTIONS, TOOL_IDS } from "../../common/consts/constants.ts";

import { ZipCodeRequestSchema } from "../../common/schemas/zipcode-request.ts";
import { ZipCodeResponseSchema } from "../../common/schemas/zipcode-response.ts";

export const createZipCodeLookupTool = (env: Env) =>
  createTool({
    id: TOOL_IDS.ZIP_CODE_LOOKUP,
    description:
      "Consulta informações de endereço através do CEP usando a Brasil API",
    inputSchema: ZipCodeRequestSchema,
    outputSchema: ZipCodeResponseSchema,
    execute: async ({ context }) => {
      const { zipcode } = context;

      console.log(
        `🔍 ${TOOL_IDS.ZIP_CODE_LOOKUP}: Iniciando consulta para CEP ${zipcode}`
      );

      try {
        const response = await fetch(
          `${env.BRASIL_API_BASE_URL}${env.BRASIL_API_ZIPCODE_LOOKUP}/${zipcode}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "User-Agent": "Deco-MCP-Server/1.0",
            },
          }
        );

        console.log(
          `📊 ${TOOL_IDS.ZIP_CODE_LOOKUP}: Status da resposta: ${response.status} ${response.statusText}`
        );

        if (!response.ok) {
          console.log(
            `❌ ${TOOL_IDS.ZIP_CODE_LOOKUP}: Erro na API - ${response.status} ${response.statusText}`
          );
          throw CEPErrorManager.handleAPIError(
            response.status,
            response.statusText
          );
        }

        const data = await response.json();
        console.log(`✅ ${TOOL_IDS.ZIP_CODE_LOOKUP}: Dados recebidos:`, data);

        // Validar se todos os campos obrigatórios estão presentes
        if (!data.cep || !data.state || !data.city) {
          console.log(
            `❌ ${TOOL_IDS.ZIP_CODE_LOOKUP}: Dados incompletos da API`
          );
          throw CEPErrorManager.createGenericError(
            "Dados incompletos da API",
            400
          );
        }

        const result = {
          zipcode: data.cep,
          state: data.state,
          city: data.city,
          neighborhood: data.neighborhood || "Não Informado",
          street: data.street || "Não Informado",
        };

        console.log(`✅ ${TOOL_IDS.ZIP_CODE_LOOKUP}: Resultado final:`, result);

        // Validar o resultado antes de retornar
        try {
          const validatedResult = ZipCodeResponseSchema.parse(result);
          console.log(
            `✅ ${TOOL_IDS.ZIP_CODE_LOOKUP}: Resultado validado com sucesso`
          );
          return validatedResult;
        } catch (validationError) {
          console.log(
            `❌ ${TOOL_IDS.ZIP_CODE_LOOKUP}: Erro na validação do resultado:`,
            validationError
          );
          throw CEPErrorManager.createGenericError(
            "Erro na validação dos dados",
            500
          );
        }
      } catch (error) {
        console.log(`💥 ${TOOL_IDS.ZIP_CODE_LOOKUP}: Erro capturado:`, error);

        if (error instanceof CEPError) {
          throw error;
        }

        console.log(
          `🔥 ${TOOL_IDS.ZIP_CODE_LOOKUP}: Erro genérico, criando server error`
        );
        throw CEPErrorManager.createServerError();
      }
    },
  });
