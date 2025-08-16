/**
 * Utilitários para validação e extração de palavras-chave de clima/tempo
 */

import { WEATHER_KEYWORDS } from "../consts/weather-keywords.ts";

/**
 * Regex para detectar palavras-chave de clima/tempo
 */
export const WEATHER_KEYWORDS_REGEX = new RegExp(
  WEATHER_KEYWORDS.join("|"),
  "i"
);

/**
 * Verifica se uma string contém palavras-chave de clima/tempo
 */
export const hasWeatherKeyword = (input: string): boolean => {
  const lowerInput = input.toLowerCase();
  
  // Verifica usando regex
  if (WEATHER_KEYWORDS_REGEX.test(lowerInput)) {
    return true;
  }
  
  // Verifica palavras específicas que podem estar no final da string
  const weatherWords = [
    "previsão", "previsao", "previsões", "previsoes", "tempo", "clima", "temperatura", 
    "chuva", "sol", "vento", "nublado", "ensolarado", "ensolarada",
    "quente", "frio", "fria", "umidade", "pressão", "pressao", "calor",
    "fresco", "fresca", "gelado", "gelada", "chuvoso", "chuvosa",
    "ventoso", "ventosa", "nebuloso", "nebulosa", "escuro", "escura"
  ];
  
  return weatherWords.some(word => lowerInput.includes(word));
};

/**
 * Extrai palavras-chave de clima/tempo de uma string
 */
export const extractWeatherKeywords = (input: string): string[] => {
  const foundKeywords: string[] = [];
  const lowerInput = input.toLowerCase();

  for (const keyword of WEATHER_KEYWORDS) {
    if (lowerInput.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    }
  }

  return foundKeywords;
};

/**
 * Verifica se uma string é uma consulta relacionada ao clima/tempo
 */
export const isWeatherQuery = (input: string): boolean => {
  const lowerInput = input.toLowerCase();

  // Verifica se contém palavras-chave de clima/tempo
  if (hasWeatherKeyword(lowerInput)) {
    return true;
  }

  // Verifica se contém palavras relacionadas a consulta de clima
  const weatherQueryWords = [
    "como",
    "está",
    "estao",
    "estão",
    "tempo",
    "clima",
    "previsão",
    "previsao",
    "temperatura",
    "chuva",
    "sol",
    "vento",
    "umidade",
    "pressão",
    "pressao",
  ];

  return weatherQueryWords.some((word) => lowerInput.includes(word));
};

/**
 * Extrai informações de clima de uma string
 */
export const extractWeatherInfo = (
  input: string
): {
  hasWeatherKeywords: boolean;
  weatherKeywords: string[];
  isWeatherQuery: boolean;
} => {
  const weatherKeywords = extractWeatherKeywords(input);

  return {
    hasWeatherKeywords: weatherKeywords.length > 0,
    weatherKeywords,
    isWeatherQuery: isWeatherQuery(input),
  };
};
