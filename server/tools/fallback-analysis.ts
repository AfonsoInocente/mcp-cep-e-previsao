/**
 * Manual Analysis Fallback
 *
 * Intelligent manual fallback function for analyzing user input when AI fails
 */

import type { Env } from "../main.ts";
import { ACTIONS } from "../../common/consts/constants.ts";
import { WEATHER_KEYWORDS, NON_CITY_WORDS } from "../../common/consts";

export const manualAnalysisFallback = async (userInput: string, env: Env) => {
  console.log("🔧 FALLBACK: Starting manual analysis for:", userInput);

  // 1. Check if it's a direct ZIP code
  const zipCodeMatch = userInput.match(/\d{5}-?\d{3}/);
  if (zipCodeMatch) {
    console.log("🔧 FALLBACK: ZIP code identified:", zipCodeMatch[0]);

    // Check if there's mention of weather/climate/forecast
    const hasWeather = /weather|climate|forecast|temperature|rain|sun/i.test(
      userInput
    );

    if (hasWeather) {
      console.log("🔧 FALLBACK: ZIP code + weather detected");
      return {
        action: ACTIONS.CONSULT_ZIP_CODE_AND_WEATHER,
        extractedZipCode: zipCodeMatch[0].replace(/\D/g, ""),
        extractedCity: undefined,
        justification: "CEP identificado com menção ao clima",
        friendlyMessage: `Vou buscar o endereço e a previsão do tempo para o CEP ${zipCodeMatch[0]}! 😊`,
        foundCities: undefined,
      };
    } else {
      return {
        action: ACTIONS.CONSULT_ZIP_CODE,
        extractedZipCode: zipCodeMatch[0].replace(/\D/g, ""),
        extractedCity: undefined,
        justification: "CEP identificado na entrada",
        friendlyMessage: "Vou buscar as informações do endereço para você! 😊",
        foundCities: undefined,
      };
    }
  }

  // 2. Check weather/climate keywords (usando constante importada)

  const weatherRegex = new RegExp(WEATHER_KEYWORDS.join("|"), "i");
  const hasWeatherKeywords = weatherRegex.test(userInput);

  // 3. Check ZIP code/address keywords
  const zipCodeKeywords =
    /zip|address|street|neighborhood|city|loc|local|location/i;
  const hasZipCodeKeywords = zipCodeKeywords.test(userInput);

  // 4. Check if it looks like just a city name OR extract city from phrases
  const justCity = userInput.match(/^([A-Za-zÀ-ÿ\s]+?)$/);
  const looksLikeCity =
    justCity &&
    justCity[1].trim().split(/\s+/).length <= 3 &&
    /^[A-Za-zÀ-ÿ\s]+$/.test(justCity[1].trim()) &&
    justCity[1].trim().length > 2;

  // 5. Try to extract city from phrases like "forecast for [city]"
  let extractedCity = undefined;
  if (hasWeatherKeywords || hasZipCodeKeywords) {
    console.log("🔧 FALLBACK: Trying to extract city from phrase:", userInput);

    // Patterns to extract city from phrases
    const cityPatterns = [
      // Patterns with intermediate words (for, in, of, em, para, de)
      new RegExp(
        `(?:${WEATHER_KEYWORDS.join("|")})\\s+(?:do\\s+)?(?:tempo|clima)?\\s+(?:for|in|of|em|para|de)\\s+([A-Za-zÀ-ÿ\\s]+?)(?:\\?|$|,|\\.)`,
        "i"
      ),
      new RegExp(
        `(?:${WEATHER_KEYWORDS.join("|")})\\s+(?:for|in|of|em|para|de)\\s+([A-Za-zÀ-ÿ\\s]+?)(?:\\?|$|,|\\.)`,
        "i"
      ),

      // Direct patterns (without intermediate words)
      new RegExp(
        `(?:${WEATHER_KEYWORDS.join("|")})\\s+(?:do\\s+)?(?:tempo|clima)?\\s+([A-Za-zÀ-ÿ\\s]+?)(?:\\?|$|,|\\.)`,
        "i"
      ),
      new RegExp(
        `(?:${WEATHER_KEYWORDS.join("|")})\\s+([A-Za-zÀ-ÿ\\s]+?)(?:\\?|$|,|\\.)`,
        "i"
      ),

      // Specific patterns for weather queries
      /(?:how\s+is\s+the?\s*weather\s+in)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$|,|\.)/i,
      /(?:temperature\s+in)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$|,|\.)/i,
      /(?:weather\s+in)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$|,|\.)/i,

      // Patterns for address queries
      /(?:address)\s+(?:of|from)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$|,|\.)/i,
      /(?:street|neighborhood)\s+(?:of|from)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$|,|\.)/i,
    ];

    for (let i = 0; i < cityPatterns.length; i++) {
      const pattern = cityPatterns[i];
      const match = userInput.match(pattern);
      console.log(
        `🔧 FALLBACK: Testing pattern ${i + 1}:`,
        pattern.source,
        "Result:",
        match
      );
      if (match && match[1]) {
        extractedCity = match[1].trim();
        console.log("🔧 FALLBACK: City extracted from phrase:", extractedCity);
        break;
      }
    }
  }

  // 6. If it looks like a city OR if we extracted city from a phrase, validate using API
  if ((looksLikeCity && !hasZipCodeKeywords) || extractedCity) {
    const cityName = extractedCity || (justCity ? justCity[1].trim() : "");
    console.log("🔧 FALLBACK: City detected/extracted, validating:", cityName);

    // Check if the extracted city makes sense (doesn't contain words that aren't cities)
    const cityWords = cityName.toLowerCase().split(/\s+/);

    const hasNonCityWords = cityWords.some((word) =>
      (NON_CITY_WORDS as readonly string[]).includes(word)
    );

    if (hasNonCityWords) {
      console.log(
        "🔧 FALLBACK: City contains words that aren't cities:",
        cityName
      );
      return {
        action: ACTIONS.OUT_OF_SCOPE,
        extractedZipCode: undefined,
        extractedCity: undefined,
        justification: "Consulta não relacionada a CEP ou clima",
        friendlyMessage:
          "Desculpe, só posso ajudar com consultas de CEP e previsão do tempo. Pode me perguntar sobre endereços ou clima? 😊",
        foundCities: undefined,
      };
    }

    try {
      // Use API directly to validate the city
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds

      const response = await fetch(
        `https://brasilapi.com.br/api/cptec/v1/cidade/${encodeURIComponent(cityName)}`,
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
        console.log("🔧 FALLBACK: City not found in API:", cityName);
        return {
          action: ACTIONS.CITY_NOT_FOUND,
          extractedZipCode: undefined,
          extractedCity: cityName,
          justification: "City not found in database",
          friendlyMessage: `Desculpe, não consegui encontrar a cidade "${cityName}" no banco de dados. Pode verificar o nome ou tentar uma cidade próxima? 😊`,
          foundCities: [],
        };
      }

      const data = await response.json();
      const locations = data.map((location: any) => ({
        id: location.id,
        name: location.nome,
        state: location.estado,
      }));

      if (locations.length === 0) {
        console.log("🔧 FALLBACK: City not found:", cityName);
        return {
          action: ACTIONS.CITY_NOT_FOUND,
          extractedZipCode: undefined,
          extractedCity: cityName,
          justification: "City not found in database",
          friendlyMessage: `Desculpe, não consegui encontrar a cidade "${cityName}" no banco de dados. Pode verificar o nome ou tentar uma cidade próxima? 😊`,
          foundCities: [],
        };
      } else if (locations.length === 1) {
        console.log("🔧 FALLBACK: Single city found:", locations[0]);
        return {
          action: ACTIONS.CONSULT_WEATHER_DIRECT,
          extractedZipCode: undefined,
          extractedCity: cityName,
          justification: "Single city identified and validated",
          friendlyMessage: `Vou buscar a previsão do tempo para ${cityName}! 😊`,
          foundCities: undefined,
        };
      } else {
        console.log("🔧 FALLBACK: Multiple cities found:", locations);
        return {
          action: ACTIONS.MULTIPLE_CITIES,
          extractedZipCode: undefined,
          extractedCity: cityName,
          justification: "Multiple cities found with the same name",
          friendlyMessage: `Encontrei várias cidades com o nome "${cityName}". Qual você quer? 😊`,
          foundCities: locations,
        };
      }
    } catch (error) {
      console.log("🔧 FALLBACK: Error validating city:", error);
      // If validation fails, assume it's a valid city
      return {
        action: ACTIONS.CONSULT_WEATHER_DIRECT,
        extractedZipCode: undefined,
        extractedCity: cityName,
        justification: "City identified in input (validation failed)",
        friendlyMessage: `Vou buscar a previsão do tempo para ${cityName}! 😊`,
        foundCities: undefined,
      };
    }
  }

  // 7. If has weather keywords but no specific city
  if (hasWeatherKeywords && !looksLikeCity && !extractedCity) {
    console.log("🔧 FALLBACK: Weather keywords detected, requesting city");
    return {
      action: ACTIONS.REQUEST_LOCATION,
      extractedZipCode: undefined,
      extractedCity: undefined,
      justification: "Weather query detected, but city not specified",
      friendlyMessage: "Previsão do tempo para qual CEP ou cidade? 😊",
      foundCities: undefined,
    };
  }

  // 8. If has ZIP code keywords but no specific ZIP code
  if (hasZipCodeKeywords && !zipCodeMatch) {
    console.log("🔧 FALLBACK: ZIP code keywords detected, requesting ZIP code");
    return {
      action: ACTIONS.REQUEST_ZIP_CODE,
      extractedZipCode: undefined,
      extractedCity: undefined,
      justification: "Consulta de endereço detectada, mas CEP não especificado",
      friendlyMessage: "Qual CEP você gostaria de consultar o endereço? 😊",
      foundCities: undefined,
    };
  }

  // 9. If couldn't identify anything specific
  console.log("🔧 FALLBACK: Could not identify intention");
  return {
    action: ACTIONS.REQUEST_LOCATION,
    extractedZipCode: undefined,
    extractedCity: undefined,
    justification: "Não foi possível identificar a intenção da consulta",
    friendlyMessage:
      "Pode me dizer o que você gostaria de saber? CEP, endereço ou previsão do tempo? 😊",
    foundCities: undefined,
  };
};
