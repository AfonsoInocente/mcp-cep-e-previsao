/**
 * Data Analysis Tool
 * 
 * Analyzes ZIP code and weather forecast data using AI to provide insights and recommendations
 */

import { createTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "../main.ts";

export const createDataAnalysisTool = (env: Env) =>
  createTool({
    id: "ANALISAR_DADOS_COM_AI",
    description:
      "Analisa dados de CEP e previsão do tempo usando IA para fornecer insights e recomendações",
    inputSchema: z.object({
      cep: z.string(),
      state: z.string(),
      city: z.string(),
      neighborhood: z.string().optional(),
      street: z.string().optional(),
      clima: z
        .array(
          z.object({
            data: z.string(),
            condicao: z.string(),
            condicao_desc: z.string(),
            min: z.number(),
            max: z.number(),
            indice_uv: z.number(),
          })
        )
        .optional(),
    }),
    outputSchema: z.object({
      analise: z.object({
        resumo_local: z.string(),
        caracteristicas_clima: z.string(),
        recomendacoes: z.array(z.string()),
        curiosidades: z.array(z.string()),
        alertas: z.array(z.string()).optional(),
      }),
      insights: z.object({
        tipo_clima: z.string(),
        intensidade_uv: z.string(),
        variacao_temperatura: z.string(),
        qualidade_ar_estimada: z.string(),
      }),
    }),
    execute: async ({ context }) => {
      const { cep, state, city, neighborhood, street, clima } = context;

      console.log(
        `ANALISAR_DADOS_COM_AI: Iniciando análise para ${city}, ${state}`
      );

      // Schema para a resposta da IA
      const AI_ANALYSIS_SCHEMA = {
        type: "object",
        properties: {
          analise: {
            type: "object",
            properties: {
              resumo_local: {
                type: "string",
                description:
                  "Breve descrição da localidade e suas características principais",
              },
              caracteristicas_clima: {
                type: "string",
                description: "Análise das características climáticas da região",
              },
              recomendacoes: {
                type: "array",
                items: { type: "string" },
                description:
                  "Lista de recomendações práticas baseadas no clima e localização",
              },
              curiosidades: {
                type: "array",
                items: { type: "string" },
                description:
                  "Curiosidades interessantes sobre a região ou clima",
              },
              alertas: {
                type: "array",
                items: { type: "string" },
                description:
                  "Alertas importantes sobre condições climáticas extremas (se houver)",
              },
            },
            required: [
              "resumo_local",
              "caracteristicas_clima",
              "recomendacoes",
              "curiosidades",
            ],
          },
          insights: {
            type: "object",
            properties: {
              tipo_clima: {
                type: "string",
                description: "Classificação do tipo de clima predominante",
              },
              intensidade_uv: {
                type: "string",
                description:
                  "Avaliação da intensidade UV (baixa, moderada, alta, muito alta)",
              },
              variacao_temperatura: {
                type: "string",
                description:
                  "Análise da variação de temperatura (estável, variável, extrema)",
              },
              qualidade_ar_estimada: {
                type: "string",
                description:
                  "Estimativa da qualidade do ar baseada na localização e condições",
              },
            },
            required: [
              "tipo_clima",
              "intensidade_uv",
              "variacao_temperatura",
              "qualidade_ar_estimada",
            ],
          },
        },
        required: ["analise", "insights"],
      };

      try {
        // Prepara os dados para a IA
        const dadosParaAnalise = {
          localizacao: {
            cep,
            estado: state,
            cidade: city,
            bairro: neighborhood || "Não informado",
            rua: street || "Não informado",
          },
          clima: clima || [],
        };

        // Calcula algumas métricas básicas para ajudar a IA
        let metricasClima: any = {};
        if (clima && clima.length > 0) {
          const temperaturas = clima.map((d) => ({ min: d.min, max: d.max }));
          const mediaMin =
            temperaturas.reduce((sum, t) => sum + t.min, 0) /
            temperaturas.length;
          const mediaMax =
            temperaturas.reduce((sum, t) => sum + t.max, 0) /
            temperaturas.length;
          const maxUV = Math.max(...clima.map((d) => d.indice_uv));

          metricasClima = {
            temperatura_media_minima: Math.round(mediaMin),
            temperatura_media_maxima: Math.round(mediaMax),
            variacao_media: Math.round(mediaMax - mediaMin),
            indice_uv_maximo: maxUV,
            dias_analisados: clima.length,
          };
        }

        let prompt =
          "Analise os seguintes dados de localização e clima para fornecer insights úteis:\n\n";
        prompt += "DADOS DA LOCALIZAÇÃO:\n";
        prompt += `- CEP: ${cep}\n`;
        prompt += `- Estado: ${state}\n`;
        prompt += `- Cidade: ${city}\n`;
        prompt += `- Bairro: ${neighborhood || "Não informado"}\n`;
        prompt += `- Rua: ${street || "Não informado"}\n\n`;

        if (clima && clima.length > 0) {
          prompt += `DADOS DO CLIMA (${clima.length} dias):\n`;
          clima.forEach((dia, index) => {
            prompt += `\nDia ${index + 1} (${dia.data}):\n`;
            prompt += `- Condição: ${dia.condicao_desc}\n`;
            prompt += `- Temperatura: ${dia.min}°C a ${dia.max}°C\n`;
            prompt += `- Índice UV: ${dia.indice_uv}\n`;
          });

          prompt += "\nMÉTRICAS CALCULADAS:\n";
          prompt += `- Temperatura média mínima: ${metricasClima.temperatura_media_minima || "N/A"}°C\n`;
          prompt += `- Temperatura média máxima: ${metricasClima.temperatura_media_maxima || "N/A"}°C\n`;
          prompt += `- Variação média: ${metricasClima.variacao_media || "N/A"}°C\n`;
          prompt += `- Índice UV máximo: ${metricasClima.indice_uv_maximo || "N/A"}\n`;
          prompt += `- Dias analisados: ${metricasClima.dias_analisados || 0}\n\n`;

          prompt +=
            "Por favor, forneça uma análise completa e útil baseada nestes dados, incluindo:\n";
          prompt += "1. Resumo da localidade e suas características\n";
          prompt += "2. Análise do clima e padrões observados\n";
          prompt += "3. Recomendações práticas para moradores ou visitantes\n";
          prompt += "4. Curiosidades interessantes sobre a região\n";
          prompt += "5. Alertas sobre condições climáticas (se aplicável)\n";
          prompt +=
            "6. Insights técnicos sobre o clima e qualidade ambiental\n\n";
          prompt +=
            "Seja específico, útil e mantenha um tom amigável e informativo.";
        } else {
          prompt += "DADOS DO CLIMA: Não disponíveis para análise";
        }

        console.log("ANALISAR_DADOS_COM_AI: Enviando dados para IA");

        const aiResponse = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT(
          {
            model: "openai:gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "Você é um especialista em análise climática e geográfica brasileira. Forneça análises precisas, úteis e baseadas em dados reais.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            schema: AI_ANALYSIS_SCHEMA,
          }
        );

        console.log("ANALISAR_DADOS_COM_AI: Resposta da IA recebida");

        if (!aiResponse.object) {
          throw new Error("Falha ao gerar análise com IA");
        }

        return aiResponse.object as {
          analise: {
            resumo_local: string;
            caracteristicas_clima: string;
            recomendacoes: string[];
            curiosidades: string[];
            alertas?: string[];
          };
          insights: {
            tipo_clima: string;
            intensidade_uv: string;
            variacao_temperatura: string;
            qualidade_ar_estimada: string;
          };
        };
      } catch (error) {
        console.log("ANALISAR_DADOS_COM_AI: Erro na análise:", error);

        // Retorna uma análise básica em caso de erro
        return {
          analise: {
            resumo_local: `Localidade: ${city}, ${state}`,
            caracteristicas_clima:
              clima && clima.length > 0
                ? "Dados climáticos disponíveis para análise"
                : "Dados climáticos não disponíveis",
            recomendacoes: [
              "Consulte dados climáticos atualizados antes de planejar atividades ao ar livre",
              "Mantenha-se informado sobre as condições meteorológicas locais",
            ],
            curiosidades: [
              `${city} está localizada no estado de ${state}`,
              "O clima brasileiro é conhecido por sua diversidade",
            ],
            alertas: [],
          },
          insights: {
            tipo_clima: "Não determinado",
            intensidade_uv: "Não determinado",
            variacao_temperatura: "Não determinado",
            qualidade_ar_estimada: "Não determinado",
          },
        };
      }
    },
  });
