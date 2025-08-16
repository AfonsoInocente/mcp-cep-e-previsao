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

export const createAnalisarDadosComAITool = (env: Env) =>
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

// Função de fallback manual inteligente
const analiseManualFallback = async (entrada_usuario: string, env: Env) => {
  console.log("🔧 FALLBACK: Iniciando análise manual para:", entrada_usuario);

  // 1. Verificar se é um CEP direto
  const cepMatch = entrada_usuario.match(/\d{5}-?\d{3}/);
  if (cepMatch) {
    console.log("🔧 FALLBACK: CEP identificado:", cepMatch[0]);

    // Verificar se há menção a clima/tempo/previsão
    const temClima =
      /clima|tempo|previsão|previsao|temperatura|chuva|sol/i.test(
        entrada_usuario
      );

    if (temClima) {
      console.log("🔧 FALLBACK: CEP + clima detectado");
      return {
        acao: "CONSULTAR_CEP_E_PREVISAO" as const,
        cep_extraido: cepMatch[0].replace(/\D/g, ""),
        cidade_extraida: undefined,
        justificativa: "CEP identificado com menção a clima/tempo",
        mensagem_amigavel: `Vou buscar o endereço e a previsão do tempo para o CEP ${cepMatch[0]}! 😊`,
      };
    } else {
      return {
        acao: "CONSULTAR_CEP" as const,
        cep_extraido: cepMatch[0].replace(/\D/g, ""),
        cidade_extraida: undefined,
        justificativa: "CEP identificado na entrada",
        mensagem_amigavel:
          "Vou buscar as informações do endereço para você! 😊",
        cidades_encontradas: undefined,
      };
    }
  }

  // 2. Verificar palavras-chave de clima/tempo
  const palavrasClima =
    /tempo|clima|temperatura|chuva|sol|calor|frio|weather|previsão|previsao/i;
  const temPalavrasClima = palavrasClima.test(entrada_usuario);

  // 3. Verificar palavras-chave de CEP/endereço
  const palavrasCEP =
    /cep|endereço|endereco|rua|bairro|cidade|city|loc|local|localidade/i;
  const temPalavrasCEP = palavrasCEP.test(entrada_usuario);

  // 4. Verificar se parece ser apenas o nome de uma cidade OU extrair cidade de frases
  const apenasCidade = entrada_usuario.match(/^([A-Za-zÀ-ÿ\s]+?)$/);
  const pareceCidade =
    apenasCidade &&
    apenasCidade[1].trim().split(/\s+/).length <= 3 &&
    /^[A-Za-zÀ-ÿ\s]+$/.test(apenasCidade[1].trim()) &&
    apenasCidade[1].trim().length > 2;

  // 5. Tentar extrair cidade de frases como "previsão para [cidade]"
  let cidadeExtraida = undefined;
  if (temPalavrasClima || temPalavrasCEP) {
    console.log(
      "🔧 FALLBACK: Tentando extrair cidade de frase:",
      entrada_usuario
    );

    // Padrões para extrair cidade de frases
    const padroesCidade = [
      // Padrões com palavras intermediárias (para, em, de)
      /(?:previsão|previsao|clima|tempo|temperatura|cep|endereço|endereco|rua|bairro|cidade|city|loc|local|localidade)\s+(?:para|em|de)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$|,|\.)/i,

      // Padrões diretos (sem palavras intermediárias)
      /(?:previsão|previsao|clima|tempo|temperatura|cep|endereço|endereco|rua|bairro|cidade|city|loc|local|localidade)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$|,|\.)/i,

      // Padrões específicos para consultas de clima
      /(?:como\s+está\s+o?\s*clima\s+em)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$|,|\.)/i,
      /(?:temperatura\s+em)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$|,|\.)/i,
      /(?:clima\s+em)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$|,|\.)/i,

      // Padrões para consultas de endereço
      /(?:endereço|endereco)\s+(?:de|do|da)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$|,|\.)/i,
      /(?:rua|bairro)\s+(?:de|do|da)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$|,|\.)/i,
    ];

    for (let i = 0; i < padroesCidade.length; i++) {
      const padrao = padroesCidade[i];
      const match = entrada_usuario.match(padrao);
      console.log(
        `🔧 FALLBACK: Testando padrão ${i + 1}:`,
        padrao.source,
        "Resultado:",
        match
      );
      if (match && match[1]) {
        cidadeExtraida = match[1].trim();
        console.log("🔧 FALLBACK: Cidade extraída de frase:", cidadeExtraida);
        break;
      }
    }
  }

  // 6. Se parece ser uma cidade OU se extraímos cidade de uma frase, validar usando a API
  if ((pareceCidade && !temPalavrasCEP) || cidadeExtraida) {
    const nomeCidade =
      cidadeExtraida || (apenasCidade ? apenasCidade[1].trim() : "");
    console.log(
      "🔧 FALLBACK: Cidade detectada/extraída, validando:",
      nomeCidade
    );

    // Verificar se a cidade extraída faz sentido (não contém palavras que não são cidades)
    const palavrasNaoCidade = [
      "massa",
      "pizza",
      "comida",
      "receita",
      "carro",
      "moto",
      "casa",
      "trabalho",
      "escola",
      "hospital",
      "banco",
      "loja",
      "mercado",
      "restaurante",
    ];
    const palavrasCidade = nomeCidade.toLowerCase().split(/\s+/);

    const temPalavrasNaoCidade = palavrasCidade.some((palavra) =>
      palavrasNaoCidade.includes(palavra)
    );

    if (temPalavrasNaoCidade) {
      console.log(
        "🔧 FALLBACK: Cidade contém palavras que não são cidades:",
        nomeCidade
      );
      return {
        acao: "CONSULTA_FORA_ESCOPO" as const,
        cep_extraido: undefined,
        cidade_extraida: undefined,
        justificativa: "Consulta não relacionada a CEP ou clima",
        mensagem_amigavel:
          "Desculpe, só posso ajudar com consultas de CEP e previsão do tempo. Pode me perguntar sobre endereços ou clima? 😊",
        cidades_encontradas: undefined,
      };
    }

    try {
      // Usar a API diretamente para validar a cidade
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
        console.log("🔧 FALLBACK: Cidade não encontrada na API:", nomeCidade);
        return {
          acao: "CIDADE_NAO_ENCONTRADA" as const,
          cep_extraido: undefined,
          cidade_extraida: nomeCidade,
          justificativa: "Cidade não encontrada na base de dados",
          mensagem_amigavel: `Desculpe, não encontrei a cidade "${nomeCidade}" na base de dados. Pode verificar o nome ou tentar uma cidade próxima? 😊`,
          cidades_encontradas: [],
        };
      }

      const data = await response.json();
      const localidades = data.map((localidade: any) => ({
        id: localidade.id,
        nome: localidade.nome,
        estado: localidade.estado,
      }));

      if (localidades.length === 0) {
        console.log("🔧 FALLBACK: Cidade não encontrada:", nomeCidade);
        return {
          acao: "CIDADE_NAO_ENCONTRADA" as const,
          cep_extraido: undefined,
          cidade_extraida: nomeCidade,
          justificativa: "Cidade não encontrada na base de dados",
          mensagem_amigavel: `Desculpe, não encontrei a cidade "${nomeCidade}" na base de dados. Pode verificar o nome ou tentar uma cidade próxima? 😊`,
          cidades_encontradas: [],
        };
      } else if (localidades.length === 1) {
        console.log("🔧 FALLBACK: Cidade única encontrada:", localidades[0]);
        return {
          acao: "CONSULTAR_PREVISAO_DIRETA" as const,
          cep_extraido: undefined,
          cidade_extraida: nomeCidade,
          justificativa: "Cidade única identificada e validada",
          mensagem_amigavel: `Vou buscar a previsão do tempo para ${nomeCidade}! 😊`,
          cidades_encontradas: undefined,
        };
      } else {
        console.log("🔧 FALLBACK: Múltiplas cidades encontradas:", localidades);
        return {
          acao: "MULTIPLAS_CIDADES" as const,
          cep_extraido: undefined,
          cidade_extraida: nomeCidade,
          justificativa: "Múltiplas cidades encontradas com o mesmo nome",
          mensagem_amigavel: `Encontrei várias cidades com o nome "${nomeCidade}". Qual você quer? 😊`,
          cidades_encontradas: localidades,
        };
      }
    } catch (error) {
      console.log("🔧 FALLBACK: Erro ao validar cidade:", error);
      // Se der erro na validação, assume que é uma cidade válida
      return {
        acao: "CONSULTAR_PREVISAO_DIRETA" as const,
        cep_extraido: undefined,
        cidade_extraida: nomeCidade,
        justificativa: "Cidade identificada na entrada (validação falhou)",
        mensagem_amigavel: `Vou buscar a previsão do tempo para ${nomeCidade}! 😊`,
        cidades_encontradas: undefined,
      };
    }
  }

  // 7. Se tem palavras de clima mas não tem cidade específica
  if (temPalavrasClima && !pareceCidade && !cidadeExtraida) {
    console.log(
      "🔧 FALLBACK: Palavras de clima detectadas, solicitando cidade"
    );
    return {
      acao: "SOLICITAR_LOCAL" as const,
      cep_extraido: undefined,
      cidade_extraida: undefined,
      justificativa: "Consulta de clima detectada, mas cidade não especificada",
      mensagem_amigavel: "Previsão do tempo de qual CEP ou cidade? 😊",
      cidades_encontradas: undefined,
    };
  }

  // 8. Se tem palavras de CEP mas não tem CEP específico
  if (temPalavrasCEP && !cepMatch) {
    console.log("🔧 FALLBACK: Palavras de CEP detectadas, solicitando CEP");
    return {
      acao: "SOLICITAR_CEP" as const,
      cep_extraido: undefined,
      cidade_extraida: undefined,
      justificativa: "Consulta de endereço detectada, mas CEP não especificado",
      mensagem_amigavel: "De qual CEP você gostaria de saber o endereço? 😊",
      cidades_encontradas: undefined,
    };
  }

  // 9. Se não conseguiu identificar nada específico
  console.log("🔧 FALLBACK: Não foi possível identificar a intenção");
  return {
    acao: "SOLICITAR_LOCAL" as const,
    cep_extraido: undefined,
    cidade_extraida: undefined,
    justificativa: "Não foi possível identificar a intenção da consulta",
    mensagem_amigavel:
      "Pode me dizer o que você gostaria de saber? CEP, endereço ou previsão do tempo? 😊",
    cidades_encontradas: undefined,
  };
};

const createDecisorInteligenteTool = (env: Env) =>
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
              return await analiseManualFallback(entrada_usuario, env);
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
            return await analiseManualFallback(entrada_usuario, env);
          }
        } catch (error) {
          console.log("⚠️ Erro na análise IA, usando fallback manual:", error);

          // Fallback inteligente manual
          return await analiseManualFallback(entrada_usuario, env);
        }
      }
    },
  });

const createTesteAITool = (env: Env) =>
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

export const tools = [
  createConsultarCEPTool,
  createBuscarLocalidadeTool,
  createPrevisaoTempoTool,
  createAnalisarDadosComAITool,
  createDecisorInteligenteTool,
  createTesteAITool,
];

export { createDecisorInteligenteTool };
