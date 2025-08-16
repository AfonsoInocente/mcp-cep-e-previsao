/**
 * Constantes para palavras-chave relacionadas ao clima/tempo
 * Inclui variações com e sem acento para melhor reconhecimento
 */

export const WEATHER_KEYWORDS = [
  // Previsão
  "previsão",
  "previsao",
  "previsões",
  "previsoes",
  "prever",
  "previsto",
  // Tempo
  "tempo",
  // Clima
  "clima",
  "climatico",
  "climático",
  "climatica",
  "climática",
  // Temperatura
  "temperatura",
  "temperaturas",
  "quente",
  "frio",
  "fria",
  // Chuva
  "chuva",
  "chuvoso",
  "chuvosa",
  "chover",
  "chovendo",
  // Sol
  "sol",
  "ensolarado",
  "ensolarada",
  "solar",
  // Nublado
  "nublado",
  "nublada",
  "nuvem",
  "nuvens",
  // Vento
  "vento",
  "ventoso",
  "ventosa",
  "ventando",
  // Umidade
  "umidade",
  "umido",
  "úmido",
  "umida",
  "úmida",
  // Pressão
  "pressao",
  "pressão",
  "atmosferica",
  "atmosférica",
  // Meteorológico
  "meteorologico",
  "meteorológico",
  "meteorologica",
  "meteorológica",
  "meteorologia",
  // Inglês
  "forecast",
  "weather",
  "climate",
  "temperature",
  "rain",
  "sunny",
  "cloudy",
  "windy",
  "humid",
] as const;

/**
 * Palavras que não são nomes de cidades
 * Inclui palavras-chave de clima/tempo e outras palavras comuns que não são cidades
 */
export const NON_CITY_WORDS = [
  // Palavras-chave de clima/tempo
  ...WEATHER_KEYWORDS,
  // Palavras de contexto/gramática
  "como",
  "está",
  "para",
  "em",
  "de",
  "do",
  "da",
  "das",
  "dos",
  // Palavras em inglês que não são cidades
  "mass",
  "pizza",
  "food",
  "recipe",
  "car",
  "motorcycle",
  "house",
  "work",
  "school",
  "hospital",
  "bank",
  "store",
  "market",
  "restaurant",
] as const;

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
  return WEATHER_KEYWORDS_REGEX.test(input);
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
