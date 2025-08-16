/**
 * Intelligent Decisor Tool
 *
 * Analyzes user input and decides whether to consult only ZIP code or perform complete flow with weather forecast
 */

import { createTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "../main.ts";
import { manualAnalysisFallback } from "./fallback-analysis.ts";
import {
  ACTIONS,
  QUERY_TYPES,
  TOOL_IDS,
} from "../../common/types/constants.ts";
import {
  IntelligentWorkflowInputSchema,
  IntelligentDecisorOutputSchema,
} from "../../common/schemas/zipcode-weather.ts";

export const createIntelligentDecisorTool = (env: Env) =>
  createTool({
    id: TOOL_IDS.INTELLIGENT_DECISOR,
    description:
      "Analisa a entrada do usuário e decide se deve consultar apenas o CEP ou executar o fluxo completo com previsão do tempo",
    inputSchema: IntelligentWorkflowInputSchema,
    outputSchema: IntelligentDecisorOutputSchema,
    execute: async ({ context }) => {
      const { userInput } = context;

      console.log(
        `${TOOL_IDS.INTELLIGENT_DECISOR}: Analyzing input: "${userInput}"`
      );

      // Schema for AI decision
      const DECISION_SCHEMA = {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: [
              ACTIONS.CONSULT_ZIP_CODE,
              ACTIONS.CONSULT_ZIP_CODE_AND_WEATHER,
              ACTIONS.CONSULT_WEATHER_DIRECT,
            ],
            description:
              "Ação a ser executada: CONSULT_ZIP_CODE para consultar apenas CEP, CONSULT_ZIP_CODE_AND_WEATHER para consultar CEP e previsão do tempo, CONSULT_WEATHER_DIRECT para consultar previsão diretamente por cidade",
          },
          extractedZipCode: {
            type: "string",
            description:
              "CEP extraído da entrada do usuário (formato: 00000000, sem hífen)",
          },
          extractedCity: {
            type: "string",
            description:
              "Cidade extraída da entrada do usuário (se mencionada, sem acentos desnecessários)",
          },
          justification: {
            type: "string",
            description: "Justificativa técnica para a decisão tomada",
          },
          friendlyMessage: {
            type: "string",
            description:
              "Mensagem amigável para o usuário explicando o que será feito",
          },
          needsZipCode: {
            type: "boolean",
            description:
              "Se a consulta precisa de um CEP válido para funcionar",
          },
          canFallback: {
            type: "boolean",
            description:
              "Se pode usar fallback quando CEP/cidade não for encontrado",
          },
        },
        required: [
          "action",
          "justification",
          "friendlyMessage",
          "needsZipCode",
          "canFallback",
        ],
      };

      try {
        let prompt =
          "Analise a seguinte entrada do usuário e decida qual ação tomar:\n\n";
        prompt += `ENTRADA DO USUÁRIO: "${userInput}"\n\n`;
        prompt += "AÇÕES POSSÍVEIS:\n";
        prompt +=
          "1. CONSULT_ZIP_CODE: Quando o usuário quer apenas informações de endereço (CEP, rua, bairro, cidade, estado)\n";
        prompt +=
          "2. CONSULT_ZIP_CODE_AND_WEATHER: Quando o usuário quer informações de endereço E previsão do tempo\n";
        prompt +=
          "3. CONSULT_WEATHER_DIRECT: Quando o usuário quer previsão do tempo diretamente por cidade\n\n";
        prompt += "CRITÉRIOS DE DECISÃO:\n";
        prompt +=
          "- Se a entrada contém apenas CEP ou endereço → CONSULT_ZIP_CODE\n";
        prompt +=
          '- Se a entrada menciona "tempo", "clima", "previsão", "temperatura", "chuva", "sol" E tem CEP → CONSULT_ZIP_CODE_AND_WEATHER\n';
        prompt +=
          "- Se a entrada pergunta sobre condições climáticas E tem CEP → CONSULT_ZIP_CODE_AND_WEATHER\n";
        prompt +=
          "- Se a entrada é apenas sobre localização/endereço → CONSULT_ZIP_CODE\n";
        prompt +=
          "- Se a entrada tem CEP E qualquer menção de tempo/clima → CONSULT_ZIP_CODE_AND_WEATHER\n";
        prompt +=
          "- Se a entrada menciona apenas cidade para previsão do tempo → CONSULT_WEATHER_DIRECT\n\n";
        prompt += "EXEMPLOS:\n";
        prompt += '- "CEP 01310-100" → CONSULT_ZIP_CODE\n';
        prompt +=
          '- "Quero saber o endereço do CEP 01310-100" → CONSULT_ZIP_CODE\n';
        prompt +=
          '- "Como está o tempo no CEP 01310-100?" → CONSULT_ZIP_CODE_AND_WEATHER\n';
        prompt +=
          '- "Previsão do tempo para 01310-100" → CONSULT_ZIP_CODE_AND_WEATHER\n';
        prompt +=
          '- "CEP 01310-100 com previsão do tempo" → CONSULT_ZIP_CODE_AND_WEATHER\n';
        prompt +=
          '- "Quero o endereço e o tempo para o CEP 20040-007" → CONSULT_ZIP_CODE_AND_WEATHER\n';
        prompt +=
          '- "Como está o tempo em São Paulo?" → CONSULT_WEATHER_DIRECT\n';
        prompt += '- "Temperatura em São Paulo" → CONSULT_WEATHER_DIRECT\n';
        prompt +=
          '- "Previsão do tempo para São Paulo" → CONSULT_WEATHER_DIRECT\n';
        prompt += '- "Qual é a melhor marca de carro?" → OUT_OF_SCOPE\n';
        prompt += '- "Como fazer um bolo?" → OUT_OF_SCOPE\n';
        prompt += '- "História do Brasil" → OUT_OF_SCOPE\n';
        prompt += '- "Quero saber o endereço" → REQUEST_ZIP_CODE\n';
        prompt += '- "Previsão do tempo" → REQUEST_LOCATION\n';
        prompt += '- "São Paulo" → CONSULT_WEATHER_DIRECT\n';
        prompt += '- "Rio de Janeiro" → CONSULT_WEATHER_DIRECT\n';
        prompt += '- "Belo Horizonte" → CONSULT_WEATHER_DIRECT\n\n';
        prompt += "TAREFAS:\n";
        prompt +=
          "1. Identifique se há um CEP na entrada (formato: 00000-000 ou 00000000)\n";
        prompt += "2. Identifique se há menção de cidade/localização\n";
        prompt +=
          "3. Determine a intenção do usuário (apenas endereço ou endereço + tempo)\n";
        prompt += "4. Extraia o CEP se presente\n";
        prompt += "5. Extraia a cidade se mencionada\n";
        prompt += "6. Forneça justificativa clara\n";
        prompt +=
          "7. Crie uma mensagem amigável explicando o que será feito\n\n";
        prompt += "Seja preciso e amigável na análise.";

        console.log(`${TOOL_IDS.INTELLIGENT_DECISOR}: Sending for AI analysis`);

        const aiResponse = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT(
          {
            model: "openai:gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "Você é um assistente especializado em analisar intenções do usuário para consultas de CEP e previsão do tempo. Seja preciso e amigável.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.3,
            schema: DECISION_SCHEMA,
          }
        );

        console.log(
          `${TOOL_IDS.INTELLIGENT_DECISOR}: Decision received:`,
          aiResponse.object
        );

        if (!aiResponse.object) {
          throw new Error("Falha ao analisar a entrada do usuário");
        }

        return aiResponse.object as {
          action: (typeof ACTIONS)[keyof typeof ACTIONS];
          extractedZipCode?: string;
          extractedCity?: string;
          justification: string;
          friendlyMessage: string;
        };
      } catch (error) {
        console.log(
          `${TOOL_IDS.INTELLIGENT_DECISOR}: Error in analysis:`,
          error
        );

        // Intelligent fallback using AI for input analysis
        console.log("🤖 Using AI for intelligent input analysis...");

        const INPUT_ANALYSIS_SCHEMA = {
          type: "object",
          properties: {
            queryType: {
              type: "string",
              enum: [
                QUERY_TYPES.ZIP_CODE,
                QUERY_TYPES.FORECAST,
                QUERY_TYPES.ZIP_CODE_AND_FORECAST,
                QUERY_TYPES.OUT_OF_SCOPE,
              ],
              description: "Tipo de consulta identificada",
            },
            identifiedZipCode: {
              type: "string",
              description: "CEP extraído da entrada (se houver)",
            },
            identifiedCity: {
              type: "string",
              description: "Cidade extraída da entrada (se houver)",
            },
            recommendedAction: {
              type: "string",
              enum: [
                ACTIONS.CONSULT_ZIP_CODE,
                ACTIONS.CONSULT_WEATHER_DIRECT,
                ACTIONS.CONSULT_ZIP_CODE_AND_WEATHER,
                ACTIONS.REQUEST_ZIP_CODE,
                ACTIONS.REQUEST_LOCATION,
                ACTIONS.OUT_OF_SCOPE,
              ],
              description: "Ação recomendada baseada na análise",
            },
            justification: {
              type: "string",
              description: "Justificativa da análise",
            },
            friendlyMessage: {
              type: "string",
              description: "Mensagem amigável para o usuário",
            },
          },
          required: [
            "queryType",
            "recommendedAction",
            "justification",
            "friendlyMessage",
          ],
        };

        const analysisPrompt = `Analise a seguinte entrada do usuário e identifique:

ENTRADA: "${userInput}"

TAREFAS:
1. Identifique se há um CEP (formato: 00000-000 ou 00000000)
2. Identifique se há menção de uma cidade/localização
3. Determine se é uma consulta para:
   - Apenas CEP (endereço)
   - Apenas previsão do tempo
   - CEP + previsão do tempo
   - Fora do escopo (não relacionado a CEP ou tempo)

EXEMPLOS:
- "01310-100" → CONSULT_ZIP_CODE
- "São Paulo" → CONSULT_WEATHER_DIRECT
- "Rio de Janeiro" → CONSULT_WEATHER_DIRECT
- "Como está o tempo em São Paulo?" → CONSULT_WEATHER_DIRECT
- "CEP 01310-100" → CONSULT_ZIP_CODE
- "Previsão do tempo para 01310-100" → CONSULT_ZIP_CODE_AND_WEATHER
- "Quero saber o endereço" → REQUEST_ZIP_CODE
- "Previsão do tempo" → REQUEST_LOCATION
- "Qual é a melhor marca de carro?" → OUT_OF_SCOPE

Seja preciso e amigável na análise.`;

        try {
          console.log(
            `🤖 ${TOOL_IDS.INTELLIGENT_DECISOR}: Calling AI for analysis...`
          );
          const aiAnalysis =
            await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT({
              model: "openai:gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content:
                    "Você é um assistente especializado em analisar consultas de CEP e previsão do tempo. Seja preciso e amigável.",
                },
                {
                  role: "user",
                  content: analysisPrompt,
                },
              ],
              temperature: 0.1,
              schema: INPUT_ANALYSIS_SCHEMA,
            });

          if (aiAnalysis.object) {
            console.log("✅ AI analysis received:", aiAnalysis.object);

            // Check if AI extracted data that makes sense
            const aiCity = aiAnalysis.object.identifiedCity;
            const aiZipCode = aiAnalysis.object.identifiedZipCode;

            // If AI extracted a city that contains keywords (like "forecast"), use fallback
            console.log(
              `🔍 ${TOOL_IDS.INTELLIGENT_DECISOR}: Validating city extracted by AI:`,
              aiCity
            );
            if (
              aiCity &&
              typeof aiCity === "string" &&
              (aiCity.toLowerCase().includes("forecast") ||
                aiCity.toLowerCase().includes("weather") ||
                aiCity.toLowerCase().includes("climate") ||
                aiCity.toLowerCase().includes("temperature") ||
                aiCity.toLowerCase().includes("in") ||
                aiCity.toLowerCase().includes("for") ||
                aiCity.toLowerCase().includes("of"))
            ) {
              console.log(
                "⚠️ AI extracted invalid city:",
                aiCity,
                "- using manual fallback"
              );
              return await manualAnalysisFallback(userInput, env);
            } else {
              console.log("✅ AI extracted valid city:", aiCity);
            }

            return {
              action: aiAnalysis.object.recommendedAction as any,
              extractedZipCode: aiZipCode as string | undefined,
              extractedCity: aiCity as string | undefined,
              justification: aiAnalysis.object.justification as string,
              friendlyMessage: aiAnalysis.object.friendlyMessage as string,
              foundCities: undefined,
            };
          } else {
            console.log(
              "⚠️ AI analysis did not return valid object, using manual fallback"
            );
            return await manualAnalysisFallback(userInput, env);
          }
        } catch (error) {
          console.log("⚠️ Error in AI analysis, using manual fallback:", error);

          // Intelligent manual fallback
          return await manualAnalysisFallback(userInput, env);
        }
      }
    },
  });
