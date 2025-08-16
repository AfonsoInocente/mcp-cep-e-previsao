/**
 * Intelligent Decisor Tool
 *
 * Analyzes user input and decides whether to consult only ZIP code or perform complete flow with weather forecast
 */

import { createTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "../main.ts";
import { manualAnalysisFallback } from "./fallback-analysis.ts";

export const createIntelligentDecisorTool = (env: Env) =>
  createTool({
    id: "DECISOR_INTELIGENTE",
    description:
      "Analisa a entrada do usuário e decide se deve consultar apenas CEP ou fazer o fluxo completo com previsão do tempo",
    inputSchema: z.object({
      entrada_usuario: z.string().min(1, "Entrada do usuário é obrigatória"),
    }),
    outputSchema: z.object({
      acao: z.enum([
        "CONSULTAR_CEP",
        "CONSULTAR_CEP_E_PREVISAO",
        "CONSULTAR_PREVISAO_DIRETA",
        "CONSULTA_FORA_ESCOPO",
        "SOLICITAR_CEP",
        "SOLICITAR_LOCAL",
        "MULTIPLAS_CIDADES",
        "CIDADE_NAO_ENCONTRADA",
      ]),
      cep_extraido: z.string().optional(),
      cidade_extraida: z.string().optional(),
      justificativa: z.string(),
      mensagem_amigavel: z.string(),
      cidades_encontradas: z.array(z.any()).optional(),
    }),
    execute: async ({ context }) => {
      const { entrada_usuario } = context;

      console.log(
        `DECISOR_INTELIGENTE: Analisando entrada: "${entrada_usuario}"`
      );

      // Schema para a decisão da IA
      const DECISION_SCHEMA = {
        type: "object",
        properties: {
          acao: {
            type: "string",
            enum: [
              "CONSULTAR_CEP",
              "CONSULTAR_CEP_E_PREVISAO",
              "CONSULTAR_PREVISAO_DIRETA",
            ],
            description:
              "Ação a ser executada: CONSULTAR_CEP para apenas consultar CEP, CONSULTAR_CEP_E_PREVISAO para consultar CEP e previsão do tempo, CONSULTAR_PREVISAO_DIRETA para consultar previsão diretamente por cidade",
          },
          cep_extraido: {
            type: "string",
            description:
              "CEP extraído da entrada do usuário (formato: 00000000, sem hífen)",
          },
          cidade_extraida: {
            type: "string",
            description:
              "Cidade extraída da entrada do usuário (se mencionada, sem acentos desnecessários)",
          },
          justificativa: {
            type: "string",
            description: "Justificativa técnica para a decisão tomada",
          },
          mensagem_amigavel: {
            type: "string",
            description:
              "Mensagem amigável para o usuário explicando o que será feito",
          },
          precisa_cep: {
            type: "boolean",
            description:
              "Se a consulta precisa de um CEP válido para funcionar",
          },
          pode_fallback: {
            type: "boolean",
            description:
              "Se pode usar fallback quando CEP/cidade não for encontrado",
          },
        },
        required: [
          "acao",
          "justificativa",
          "mensagem_amigavel",
          "precisa_cep",
          "pode_fallback",
        ],
      };

      try {
        let prompt =
          "Analise a seguinte entrada do usuário e decida qual ação tomar:\n\n";
        prompt += `ENTRADA DO USUÁRIO: "${entrada_usuario}"\n\n`;
        prompt += "POSSÍVEIS AÇÕES:\n";
        prompt +=
          "1. CONSULTAR_CEP: Quando o usuário quer apenas informações de endereço (CEP, rua, bairro, cidade, estado)\n";
        prompt +=
          "2. CONSULTAR_CEP_E_PREVISAO: Quando o usuário quer informações de endereço E previsão do tempo\n\n";
        prompt += "CRITÉRIOS PARA DECISÃO:\n";
        prompt +=
          "- Se a entrada contém apenas CEP ou endereço → CONSULTAR_CEP\n";
        prompt +=
          '- Se a entrada menciona "clima", "tempo", "previsão", "temperatura", "chuva", "sol" E tem CEP → CONSULTAR_CEP_E_PREVISAO\n';
        prompt +=
          "- Se a entrada pergunta sobre condições meteorológicas E tem CEP → CONSULTAR_CEP_E_PREVISAO\n";
        prompt +=
          "- Se a entrada é sobre localização/endereço apenas → CONSULTAR_CEP\n";
        prompt +=
          "- Se a entrada tem CEP E qualquer menção a clima/tempo → CONSULTAR_CEP_E_PREVISAO\n\n";
        prompt += "EXEMPLOS:\n";
        prompt += '- "CEP 01310-100" → CONSULTAR_CEP\n';
        prompt +=
          '- "Quero saber o endereço do CEP 01310-100" → CONSULTAR_CEP\n';
        prompt +=
          '- "Como está o clima no CEP 01310-100?" → CONSULTAR_CEP_E_PREVISAO\n';
        prompt +=
          '- "Previsão do tempo para 01310-100" → CONSULTAR_CEP_E_PREVISAO\n';
        prompt +=
          '- "CEP 01310-100 com previsão do tempo" → CONSULTAR_CEP_E_PREVISAO\n';
        prompt +=
          '- "Quero o endereço e clima do CEP 20040-007" → CONSULTAR_CEP_E_PREVISAO\n';
        prompt +=
          '- "Como está o clima em São Paulo?" → CONSULTAR_PREVISAO_DIRETA\n';
        prompt += '- "Temperatura em São Paulo" → CONSULTAR_PREVISAO_DIRETA\n';
        prompt +=
          '- "Previsão do tempo para São Paulo" → CONSULTAR_PREVISAO_DIRETA\n';
        prompt +=
          '- "Qual é a melhor marca de carro?" → CONSULTA_FORA_ESCOPO\n';
        prompt += '- "Como fazer bolo?" → CONSULTA_FORA_ESCOPO\n';
        prompt += '- "História do Brasil" → CONSULTA_FORA_ESCOPO\n';
        prompt += '- "Quero saber o endereço" → SOLICITAR_CEP\n';
        prompt += '- "Previsão do tempo" → SOLICITAR_LOCAL\n';
        prompt += '- "São Paulo" → CONSULTAR_PREVISAO_DIRETA\n';
        prompt += '- "Rio de Janeiro" → CONSULTAR_PREVISAO_DIRETA\n';
        prompt += '- "Belo Horizonte" → CONSULTAR_PREVISAO_DIRETA\n\n';
        prompt += "TAREFAS:\n";
        prompt +=
          "1. Identifique se há um CEP na entrada (formato: 00000-000 ou 00000000)\n";
        prompt += "2. Identifique se há menção a cidade/localidade\n";
        prompt +=
          "3. Determine a intenção do usuário (endereço apenas ou endereço + clima)\n";
        prompt += "4. Extraia o CEP se presente\n";
        prompt += "5. Extraia a cidade se mencionada\n";
        prompt += "6. Forneça uma justificativa clara\n";
        prompt +=
          "7. Crie uma mensagem amigável explicando o que será feito\n\n";
        prompt += "Seja preciso e amigável na análise.";

        console.log("DECISOR_INTELIGENTE: Enviando para análise da IA");

        const aiResponse = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT(
          {
            model: "openai:gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "Você é um assistente especializado em análise de intenções do usuário para consultas de CEP e previsão do tempo. Seja preciso e amigável.",
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
          "DECISOR_INTELIGENTE: Decisão recebida:",
          aiResponse.object
        );

        if (!aiResponse.object) {
          throw new Error("Falha ao analisar entrada do usuário");
        }

        return aiResponse.object as {
          acao: "CONSULTAR_CEP" | "CONSULTAR_CEP_E_PREVISAO";
          cep_extraido?: string;
          cidade_extraida?: string;
          justificativa: string;
          mensagem_amigavel: string;
        };
      } catch (error) {
        console.log("DECISOR_INTELIGENTE: Erro na análise:", error);

        // Fallback inteligente usando IA para análise da entrada
        console.log("🤖 Usando IA para análise inteligente da entrada...");

        const ANALISE_ENTRADA_SCHEMA = {
          type: "object",
          properties: {
            tipo_consulta: {
              type: "string",
              enum: ["CEP", "PREVISAO", "CEP_E_PREVISAO", "FORA_ESCOPO"],
              description: "Tipo de consulta identificada",
            },
            cep_identificado: {
              type: "string",
              description: "CEP extraído da entrada (se houver)",
            },
            cidade_identificada: {
              type: "string",
              description: "Cidade extraída da entrada (se houver)",
            },
            acao_recomendada: {
              type: "string",
              enum: [
                "CONSULTAR_CEP",
                "CONSULTAR_PREVISAO_DIRETA",
                "CONSULTAR_CEP_E_PREVISAO",
                "SOLICITAR_CEP",
                "SOLICITAR_LOCAL",
                "CONSULTA_FORA_ESCOPO",
              ],
              description: "Ação recomendada baseada na análise",
            },
            justificativa: {
              type: "string",
              description: "Justificativa da análise",
            },
            mensagem_amigavel: {
              type: "string",
              description: "Mensagem amigável para o usuário",
            },
          },
          required: [
            "tipo_consulta",
            "acao_recomendada",
            "justificativa",
            "mensagem_amigavel",
          ],
        };

        const promptAnalise = `Analise a seguinte entrada do usuário e identifique:

ENTRADA: "${entrada_usuario}"

TAREFAS:
1. Identifique se há um CEP (formato: 00000-000 ou 00000000)
2. Identifique se há menção a uma cidade/localidade
3. Determine se é consulta de:
   - Apenas CEP (endereço)
   - Apenas previsão do tempo
   - CEP + previsão do tempo
   - Fora do escopo (não relacionado a CEP ou clima)

EXEMPLOS:
- "01310-100" → CONSULTAR_CEP
- "São Paulo" → CONSULTAR_PREVISAO_DIRETA
- "Rio de Janeiro" → CONSULTAR_PREVISAO_DIRETA
- "Como está o clima em São Paulo?" → CONSULTAR_PREVISAO_DIRETA
- "CEP 01310-100" → CONSULTAR_CEP
- "Previsão do tempo para 01310-100" → CONSULTAR_CEP_E_PREVISAO
- "Quero saber o endereço" → SOLICITAR_CEP
- "Previsão do tempo" → SOLICITAR_LOCAL
- "Qual a melhor marca de carro?" → CONSULTA_FORA_ESCOPO

Seja preciso e amigável na análise.`;

        try {
          console.log("🤖 DECISOR_INTELIGENTE: Chamando IA para análise...");
          const analiseIA =
            await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT({
              model: "openai:gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content:
                    "Você é um assistente especializado em análise de consultas de CEP e previsão do tempo. Seja preciso e amigável.",
                },
                {
                  role: "user",
                  content: promptAnalise,
                },
              ],
              temperature: 0.1,
              schema: ANALISE_ENTRADA_SCHEMA,
            });

          if (analiseIA.object) {
            console.log("✅ Análise IA recebida:", analiseIA.object);

            // Verificar se a IA extraiu dados que fazem sentido
            const cidadeIA = analiseIA.object.cidade_identificada;
            const cepIA = analiseIA.object.cep_identificado;

            // Se a IA extraiu uma cidade que contém palavras-chave (como "previsão"), usar fallback
            console.log(
              "🔍 DECISOR_INTELIGENTE: Validando cidade extraída pela IA:",
              cidadeIA
            );
            if (
              cidadeIA &&
              typeof cidadeIA === "string" &&
              (cidadeIA.toLowerCase().includes("previsão") ||
                cidadeIA.toLowerCase().includes("previsao") ||
                cidadeIA.toLowerCase().includes("clima") ||
                cidadeIA.toLowerCase().includes("tempo") ||
                cidadeIA.toLowerCase().includes("em") ||
                cidadeIA.toLowerCase().includes("para") ||
                cidadeIA.toLowerCase().includes("de"))
            ) {
              console.log(
                "⚠️ IA extraiu cidade inválida:",
                cidadeIA,
                "- usando fallback manual"
              );
              return await manualAnalysisFallback(entrada_usuario, env);
            } else {
              console.log("✅ IA extraiu cidade válida:", cidadeIA);
            }

            return {
              acao: analiseIA.object.acao_recomendada as any,
              cep_extraido: cepIA as string | undefined,
              cidade_extraida: cidadeIA as string | undefined,
              justificativa: analiseIA.object.justificativa as string,
              mensagem_amigavel: analiseIA.object.mensagem_amigavel as string,
              cidades_encontradas: undefined,
            };
          } else {
            console.log(
              "⚠️ Análise IA não retornou objeto válido, usando fallback manual"
            );
            return await manualAnalysisFallback(entrada_usuario, env);
          }
        } catch (error) {
          console.log("⚠️ Erro na análise IA, usando fallback manual:", error);

          // Fallback inteligente manual
          return await manualAnalysisFallback(entrada_usuario, env);
        }
      }
    },
  });
