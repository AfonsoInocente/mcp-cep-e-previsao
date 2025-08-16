/**
 * Manual Analysis Fallback
 *
 * Intelligent manual fallback function for analyzing user input when AI fails
 */

import type { Env } from "../main.ts";

export const manualAnalysisFallback = async (
  entrada_usuario: string,
  env: Env
) => {
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
