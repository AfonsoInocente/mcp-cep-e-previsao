/**
 * Data Analysis Tool
 *
 * Analyzes ZIP code and weather forecast data using AI to provide insights and recommendations
 */

import { createTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "../main.ts";
import { TOOL_IDS } from "../../common/types/constants.ts";
import {
  DataAnalysisInputSchema,
  DataAnalysisOutputSchema,
} from "../../common/schemas/index.ts";

export const createDataAnalysisTool = (env: Env) =>
  createTool({
    id: TOOL_IDS.DATA_ANALYSIS,
    description:
      "Analisa dados de CEP e previsão do tempo usando IA para fornecer insights e recomendações",
    inputSchema: DataAnalysisInputSchema,
    outputSchema: DataAnalysisOutputSchema,
    execute: async ({ context }) => {
      const { zipcode, state, city, neighborhood, street, weather } = context;

      console.log(
        `${TOOL_IDS.DATA_ANALYSIS}: Iniciando análise para ${city}, ${state}`
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
            cep: zipcode,
            estado: state,
            cidade: city,
            bairro: neighborhood || "Não informado",
            rua: street || "Não informado",
          },
          clima: weather || [],
        };

        // Calcula algumas métricas básicas para ajudar a IA
        let metricasClima: any = {};
        if (weather && weather.length > 0) {
          const temperaturas = weather.map((d) => ({
            min: d.minimum,
            max: d.maximum,
          }));
          const mediaMin =
            temperaturas.reduce((sum, t) => sum + t.min, 0) /
            temperaturas.length;
          const mediaMax =
            temperaturas.reduce((sum, t) => sum + t.max, 0) /
            temperaturas.length;
          const maxUV = Math.max(...weather.map((d) => d.uvIndex));

          metricasClima = {
            temperatura_media_minima: Math.round(mediaMin),
            temperatura_media_maxima: Math.round(mediaMax),
            variacao_media: Math.round(mediaMax - mediaMin),
            indice_uv_maximo: maxUV,
            dias_analisados: weather.length,
          };
        }

        let prompt =
          "Analise os seguintes dados de localização e clima para fornecer insights úteis:\n\n";
        prompt += "DADOS DA LOCALIZAÇÃO:\n";
        prompt += `- CEP: ${zipcode}\n`;
        prompt += `- Estado: ${state}\n`;
        prompt += `- Cidade: ${city}\n`;
        prompt += `- Bairro: ${neighborhood || "Não informado"}\n`;
        prompt += `- Rua: ${street || "Não informado"}\n\n`;

        if (weather && weather.length > 0) {
          prompt += `DADOS DO CLIMA (${weather.length} dias):\n`;
          weather.forEach((dia, index) => {
            prompt += `\nDia ${index + 1} (${dia.date}):\n`;
            prompt += `- Condição: ${dia.conditionDescription}\n`;
            prompt += `- Temperatura: ${dia.minimum}°C a ${dia.maximum}°C\n`;
            prompt += `- Índice UV: ${dia.uvIndex}\n`;
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

        console.log(`${TOOL_IDS.DATA_ANALYSIS}: Enviando dados para IA`);

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

        console.log(`${TOOL_IDS.DATA_ANALYSIS}: Resposta da IA recebida`);

        if (!aiResponse.object) {
          throw new Error("Falha ao gerar análise com IA");
        }

        return aiResponse.object as {
          analysis: {
            locationSummary: string;
            climateCharacteristics: string;
            recommendations: string[];
            curiosities: string[];
            alerts?: string[];
          };
          insights: {
            climateType: string;
            uvIntensity: string;
            temperatureVariation: string;
            estimatedAirQuality: string;
          };
        };
      } catch (error) {
        console.log(`${TOOL_IDS.DATA_ANALYSIS}: Erro na análise:`, error);

        // Retorna uma análise básica em caso de erro
        return {
          analysis: {
            locationSummary: `Localidade: ${city}, ${state}`,
            climateCharacteristics:
              weather && weather.length > 0
                ? "Dados climáticos disponíveis para análise"
                : "Dados climáticos não disponíveis",
            recommendations: [
              "Consulte dados climáticos atualizados antes de planejar atividades ao ar livre",
              "Mantenha-se informado sobre as condições meteorológicas locais",
            ],
            curiosities: [
              `${city} está localizada no estado de ${state}`,
              "O clima brasileiro é conhecido por sua diversidade",
            ],
            alerts: [],
          },
          insights: {
            climateType: "Não determinado",
            uvIntensity: "Não determinado",
            temperatureVariation: "Não determinado",
            estimatedAirQuality: "Não determinado",
          },
        };
      }
    },
  });
