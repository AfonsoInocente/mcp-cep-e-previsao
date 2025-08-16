/**
 * Manual Analysis Fallback
 *
 * Intelligent manual fallback function for analyzing user input when AI fails
 */

import type { Env } from "../main.ts";
import { ACTIONS } from "../../common/consts/constants.ts";
import {
  WEATHER_KEYWORDS,
  NON_CITY_WORDS,
  ZIPCODE_KEYWORDS,
} from "../../common/consts";
import {
  isValidCityName,
  extractBestCityName,
  hasWeatherKeyword,
  extractZipCode,
} from "../../common/utils";

export const manualAnalysisFallback = async (userInput: string, env: Env) => {
  console.log("🔧 FALLBACK: Starting manual analysis for:", userInput);

  // 1. Check if it's a direct ZIP code (simplified approach)
  const extractedZipCode = extractZipCode(userInput);
  if (extractedZipCode) {
    console.log("🔧 FALLBACK: ZIP code identified:", extractedZipCode);

    // Check if there's mention of weather/climate/forecast
    console.log(
      "🔧 FALLBACK: Checking weather keywords for ZIP code:",
      userInput
    );
    const hasWeather = hasWeatherKeyword(userInput);
    console.log("🔧 FALLBACK: Has weather keywords:", hasWeather);

    if (hasWeather) {
      console.log("🔧 FALLBACK: ZIP code + weather detected");
      return {
        action: ACTIONS.CONSULT_ZIP_CODE_AND_WEATHER,
        extractedZipCode: extractedZipCode,
        extractedCity: undefined,
        justification: "CEP identificado com menção ao clima",
        friendlyMessage: `Vou buscar o endereço e a previsão do tempo para o CEP ${extractedZipCode}! 😊`,
        foundCities: undefined,
      };
    } else {
      return {
        action: ACTIONS.CONSULT_ZIP_CODE,
        extractedZipCode: extractedZipCode,
        extractedCity: undefined,
        justification: "CEP identificado na entrada",
        friendlyMessage: "Vou buscar as informações do endereço para você! 😊",
        foundCities: undefined,
      };
    }
  }

  // 2. Check weather/climate keywords (usando função utilitária)
  console.log("🔧 FALLBACK: Checking weather keywords in:", userInput);
  const hasWeatherKeywords = hasWeatherKeyword(userInput);
  console.log("🔧 FALLBACK: Has weather keywords:", hasWeatherKeywords);

  // 3. Check ZIP code/address keywords
  const hasZipCodeKeywords = ZIPCODE_KEYWORDS.some((keyword) =>
    userInput.toLowerCase().includes(keyword)
  );

  // 4. Check if it looks like just a city name OR extract city from phrases
  const justCity = userInput.match(/^([A-Za-zÀ-ÿ\s]+?)$/);
  const looksLikeCity =
    justCity &&
    isValidCityName(justCity[1].trim()) &&
    justCity[1].trim().split(/\s+/).length <= 3;

  // 5. Try to extract city from phrases like "forecast for [city]"
  let extractedCity = undefined;
  if (hasWeatherKeywords || hasZipCodeKeywords) {
    console.log("🔧 FALLBACK: Trying to extract city from phrase:", userInput);

    // First, try to extract using the improved function
    extractedCity = extractBestCityName(userInput);
    if (extractedCity) {
      console.log(
        "🔧 FALLBACK: City extracted using improved function:",
        extractedCity
      );
    } else {
      // Fallback to regex patterns
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
          console.log(
            "🔧 FALLBACK: City extracted from phrase:",
            extractedCity
          );
          break;
        }
      }
    }
  }

  // 6. If it looks like a city OR if we extracted city from a phrase, validate using API
  if ((looksLikeCity && !hasZipCodeKeywords) || extractedCity) {
    const cityName = extractedCity || (justCity ? justCity[1].trim() : "");
    console.log("🔧 FALLBACK: City detected/extracted, validating:", cityName);

    // Use the new validation function
    if (!isValidCityName(cityName)) {
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
        `${env.BRASIL_API_BASE_URL}${env.BRASIL_API_CITY_SEARCH}/${encodeURIComponent(cityName)}`,
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

  // 8. Check for direct city + weather queries (like "previsao ibitinga")
  if (hasWeatherKeywords && !extractedZipCode) {
    // Try to extract city name from the input
    const words = userInput.split(/\s+/);
    const possibleCities = words.filter(
      (word) =>
        word.length > 2 &&
        /^[A-Za-zÀ-ÿ]+$/.test(word) &&
        isValidCityName(word) &&
        !(ZIPCODE_KEYWORDS as readonly string[]).includes(word.toLowerCase())
    );

    if (possibleCities.length > 0) {
      const cityName = possibleCities[possibleCities.length - 1]; // Get the last valid city name
      console.log(
        "🔧 FALLBACK: Direct city + weather query detected:",
        cityName
      );
      return {
        action: ACTIONS.CONSULT_WEATHER_DIRECT,
        extractedZipCode: undefined,
        extractedCity: cityName,
        justification: "Direct city + weather query detected",
        friendlyMessage: `Vou buscar a previsão do tempo para ${cityName}! 😊`,
        foundCities: undefined,
      };
    }
  }

  // 8. If has ZIP code keywords but no specific ZIP code
  if (hasZipCodeKeywords && !extractedZipCode) {
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
