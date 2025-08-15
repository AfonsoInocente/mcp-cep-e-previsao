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
import { createTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "./main.ts";
import {
  CEPErrorManager,
  CEPError,
  LocalidadeErrorManager,
  LocalidadeError,
  PrevisaoErrorManager,
  PrevisaoError,
} from "./error-manager.ts";

export const createConsultarCEPTool = (env: Env) =>
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
          neighborhood: data.neighborhood,
          street: data.street,
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

export const createBuscarLocalidadeTool = (env: Env) =>
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

export const createPrevisaoTempoTool = (env: Env) =>
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

export const tools = [
  createConsultarCEPTool,
  createBuscarLocalidadeTool,
  createPrevisaoTempoTool,
];
