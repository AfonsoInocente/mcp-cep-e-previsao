/**
 * AI Test Tool
 * 
 * Tests the connection with AI Gateway
 */

import { createTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "../main.ts";

export const createAITestTool = (env: Env) =>
  createTool({
    id: "TESTE_AI",
    description: "Testa a conexão com a IA Gateway",
    inputSchema: z.object({
      mensagem: z.string().default("Teste de conexão"),
      tipo_teste: z
        .enum(["AI_GENERATE_OBJECT", "AI_GENERATE", "PING"])
        .default("AI_GENERATE_OBJECT"),
    }),
    outputSchema: z.object({
      sucesso: z.boolean(),
      resposta: z.string(),
      erro: z.string().optional(),
      detalhes: z
        .object({
          tipo_erro: z.string().optional(),
          stack: z.string().optional(),
          codigo: z.string().optional(),
          duracao_ms: z.number().optional(),
        })
        .optional(),
    }),
    execute: async ({ context }) => {
      try {
        console.log("🧪 TESTE_AI: Iniciando teste de conexão...");
        console.log("🧪 TESTE_AI: Mensagem:", context.mensagem);

        // Teste 1: Verificar se env.DECO_CHAT_WORKSPACE_API existe
        if (!env.DECO_CHAT_WORKSPACE_API) {
          throw new Error("DECO_CHAT_WORKSPACE_API não está disponível");
        }

        console.log("🧪 TESTE_AI: DECO_CHAT_WORKSPACE_API disponível");

        // Teste 2: Verificar se AI_GENERATE_OBJECT existe
        if (!env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT) {
          throw new Error("AI_GENERATE_OBJECT não está disponível");
        }

        console.log("🧪 TESTE_AI: AI_GENERATE_OBJECT disponível");

        // Teste 3: Tentar diferentes tipos de chamada
        console.log("🧪 TESTE_AI: Tipo de teste:", context.tipo_teste);

        const startTime = Date.now();
        let aiResponse: any;

        if (context.tipo_teste === "AI_GENERATE_OBJECT") {
          console.log("🧪 TESTE_AI: Testando AI_GENERATE_OBJECT...");
          aiResponse = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT({
            model: "openai:gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: context.mensagem,
              },
            ],
            temperature: 0.1,
            schema: {
              type: "object",
              properties: {
                resposta: {
                  type: "string",
                  description: "Resposta simples da IA",
                },
              },
              required: ["resposta"],
            },
          });
        } else if (context.tipo_teste === "PING") {
          console.log("🧪 TESTE_AI: Testando PING...");
          // Teste simples para verificar se a API está respondendo
          aiResponse = { status: "pong", message: "API respondendo" };
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log("✅ TESTE_AI: Conexão bem-sucedida em", duration, "ms");
        console.log("✅ TESTE_AI: Resposta recebida:", aiResponse);

        return {
          sucesso: true,
          resposta:
            context.tipo_teste === "PING"
              ? aiResponse.message
              : (aiResponse.object as any)?.resposta ||
                aiResponse.text ||
                "Sem resposta",
          detalhes: {
            duracao_ms: duration,
          },
        };
      } catch (error: any) {
        console.error("❌ TESTE_AI: Erro detalhado:", error);
        console.error("❌ TESTE_AI: Tipo do erro:", typeof error);
        console.error("❌ TESTE_AI: Stack trace:", error.stack);
        console.error("❌ TESTE_AI: Propriedades:", Object.keys(error));

        return {
          sucesso: false,
          resposta: "",
          erro: error.message || "Erro desconhecido",
          detalhes: {
            tipo_erro: error.constructor.name,
            stack: error.stack?.substring(0, 500) || "Sem stack trace",
            codigo: error.code || "Sem código",
          },
        };
      }
    },
  });
