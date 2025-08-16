import { client } from "./rpc";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  ACTIONS,
  TOOL_IDS,
} from "../../../common/types";
import { WEATHER_KEYWORDS, NON_CITY_WORDS } from "../../../common/consts";
import type {
  ZipCodeResponse,
  CitySearchResponse,
  CityLocation,
  WeatherCondition,
} from "../../../common/schemas";
import type { IntelligentDecision } from "../../../common/types";

/**
 * Error handling utilities
 *
 * This function handles errors from the server API calls and converts them
 * to user-friendly messages. It first checks for error codes from the server
 * error structure, then falls back to message-based error detection.
 *
 * The error handling is centralized and uses the ERROR_MESSAGES from the
 * common types to ensure consistency across the application.
 */
const handleApiError = (error: any): string => {
  // Check if error has a code property (from server errors)
  if (error?.code) {
    const errorCode = error.code as keyof typeof ERROR_CODES;
    if (ERROR_MESSAGES[errorCode]) {
      return ERROR_MESSAGES[errorCode];
    }
  }

  // Fallback to message-based error handling
  if (
    error?.message?.includes("CEP inexistente") ||
    error?.message?.includes("CEP_NOT_FOUND")
  ) {
    return ERROR_MESSAGES[ERROR_CODES.CEP_NOT_FOUND];
  } else if (
    error?.message?.includes("CEP inexistente ou inválido") ||
    error?.message?.includes("CEP_INVALID")
  ) {
    return ERROR_MESSAGES[ERROR_CODES.CEP_INVALID];
  } else if (
    error?.message?.includes("Timeout") ||
    error?.message?.includes("timeout")
  ) {
    return ERROR_MESSAGES[ERROR_CODES.TIMEOUT];
  } else if (
    error?.message?.includes("Não há previsões") ||
    error?.message?.includes("NO_FORECAST")
  ) {
    return ERROR_MESSAGES[ERROR_CODES.NO_FORECAST];
  } else if (
    error?.message?.includes("Network connection lost") ||
    error?.message?.includes("network")
  ) {
    return ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR];
  } else if (
    error?.message?.includes("cidade não encontrada") ||
    error?.message?.includes("CITY_NOT_FOUND")
  ) {
    return ERROR_MESSAGES[ERROR_CODES.LOCALIDADE_NOT_FOUND];
  } else if (
    error?.message?.includes("sistema fora do ar") ||
    error?.message?.includes("SERVICE_UNAVAILABLE")
  ) {
    return ERROR_MESSAGES[ERROR_CODES.SERVICE_UNAVAILABLE];
  } else {
    return ERROR_MESSAGES[ERROR_CODES.GENERIC_ERROR];
  }
};

/**
 * Utility functions for data processing
 */
const extractZipCode = (input: string): string | null => {
  // Padrões mais abrangentes para extrair CEP
  const zipCodePatterns = [
    // CEP com hífen
    /\d{5}-\d{3}/,
    // CEP sem hífen
    /\d{8}/,
    // CEP com espaços ou outros separadores
    /\d{5}[-\s]?\d{3}/,
  ];

  for (const pattern of zipCodePatterns) {
    const match = input.match(pattern);
    if (match) {
      // Remove todos os caracteres não numéricos
      return match[0].replace(/\D/g, "");
    }
  }

  return null;
};

const extractCity = (input: string): string | null => {
  // Usa a constante importada de weatherKeywords

  // Padrões mais abrangentes para extrair cidade
  const cityPatterns = [
    // Padrões com palavras intermediárias
    new RegExp(
      `(?:${WEATHER_KEYWORDS.join("|")})\\s+(?:do\\s+)?(?:tempo|clima)?\\s+(?:em|para|de)\\s+)([A-Za-zÀ-ÿ\\s]+?)(?:\\?|$|,|\\.)`,
      "i"
    ),
    /(?:em|para|de)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$|,|\.)/i,

    // Padrões diretos (sem palavras intermediárias)
    new RegExp(
      `(?:${WEATHER_KEYWORDS.join("|")})\\s+(?:do\\s+)?(?:tempo|clima)?\\s+)([A-Za-zÀ-ÿ\\s]+?)(?:\\?|$|,|\\.)`,
      "i"
    ),
    new RegExp(
      `(?:${WEATHER_KEYWORDS.join("|")})\\s+)([A-Za-zÀ-ÿ\\s]+?)(?:\\?|$|,|\\.)`,
      "i"
    ),
  ];

  for (const pattern of cityPatterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      const city = match[1].trim();
      // Verifica se a cidade extraída faz sentido (não contém palavras que não são cidades)
      const cityWords = city.toLowerCase().split(/\s+/);
      const hasNonCityWords = cityWords.some((word) =>
        (NON_CITY_WORDS as readonly string[]).includes(word)
      );

      if (!hasNonCityWords && city.length > 2) {
        return city;
      }
    }
  }

  // Fallback: extrai a última palavra que parece ser uma cidade
  const words = input.split(/\s+/);
  const possibleCities = words.filter(
    (word) => word.length > 2 && /^[A-Za-zÀ-ÿ]+$/.test(word)
  );
  return possibleCities.length > 0
    ? possibleCities[possibleCities.length - 1]
    : null;
};

/**
 * API service functions
 */
const apiService = {
  async getZipCodeData(cep: string): Promise<ZipCodeResponse> {
    console.log("📞 Chamando ZIP_CODE_LOOKUP para:", cep);
    const zipcodeData = await (client as any)[TOOL_IDS.ZIP_CODE_LOOKUP]({
      zipcode: cep,
    });
    console.log("✅ CEP consultado:", zipcodeData);
    return zipcodeData;
  },

  async getCityData(cityName: string): Promise<CitySearchResponse> {
    console.log("🏙️ Chamando SEARCH_LOCALITY para cidade:", cityName);
    const localeData = await (client as any)[TOOL_IDS.CITY_SEARCH]({
      cityName: cityName,
    });
    console.log("✅ Localidades encontradas:", localeData.locations.length);
    return localeData;
  },

  async getWeatherData(cityId: number): Promise<{
    weather: WeatherCondition[];
  }> {
    console.log("🌤️ Chamando WEATHER_FORECAST para cidade ID:", cityId);
    const forecastData = await (client as any)[TOOL_IDS.WEATHER_FORECAST]({
      cityCode: cityId,
    });
    console.log("✅ Previsão obtida:", forecastData.weather.length, "dias");
    return forecastData;
  },

  async getIntelligentDecision(
    userInput: string
  ): Promise<IntelligentDecision> {
    console.log(`🧠 Chamando ${TOOL_IDS.INTELLIGENT_DECISOR}...`);
    const decision = await (client as any)[TOOL_IDS.INTELLIGENT_DECISOR]({
      userInput: userInput,
    });
    console.log("✅ Decisão recebida:", decision);
    return decision;
  },
};

/**
 * Hooks for ZIP code and weather operations
 */

// Hook for ZIP code lookup only
export const useZipCodeLookup = () => {
  return useMutation({
    mutationFn: async (cep: string) => {
      try {
        return await apiService.getZipCodeData(cep);
      } catch (error: any) {
        throw new Error(handleApiError(error));
      }
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
};

// Hook for weather forecast by city
export const useWeatherForecast = () => {
  return useMutation({
    mutationFn: async (cityName: string) => {
      try {
        const cityData = await apiService.getCityData(cityName);

        if (!cityData.locations || cityData.locations.length === 0) {
          throw new Error(
            `CITY_NOT_FOUND: Cidade '${cityName}' não encontrada.`
          );
        }

        const selectedCity = cityData.locations[0];
        const weatherData = await apiService.getWeatherData(selectedCity.id);

        return {
          city: selectedCity,
          weather: weatherData,
        };
      } catch (error: any) {
        throw new Error(handleApiError(error));
      }
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
};

// Hook for complete ZIP code and weather lookup
export const useZipCodeAndWeather = () => {
  return useMutation({
    mutationFn: async (cep: string) => {
      try {
        console.log("🔍 Iniciando consulta completa para CEP:", cep);

        // 1. Get ZIP code data
        const zipCodeData = await apiService.getZipCodeData(cep);

        // 2. Get city data
        const cityData = await apiService.getCityData(zipCodeData.city);

        // 3. Find matching city by state
        const matchingCity = cityData.locations.find(
          (localidade: CityLocation) => localidade.state === zipCodeData.state
        );
        console.log("🎯 Cidade encontrada:", matchingCity);

        let weatherData = undefined;

        // 4. Get weather data if city found
        if (matchingCity) {
          try {
            weatherData = await apiService.getWeatherData(matchingCity.id);

            // Format weather data
            weatherData = weatherData.weather.map((item: WeatherCondition) => ({
              condition: item.condition,
              minimum: item.minimum,
              maximum: item.maximum,
            }));
          } catch (weatherError) {
            console.log("⚠️ Previsão do tempo não disponível:", weatherError);
          }
        } else {
          console.log(
            "⚠️ Nenhuma cidade encontrada para:",
            zipCodeData.city,
            zipCodeData.state
          );
        }

        // 5. Return complete result
        const result = {
          zipCode: zipCodeData.zipcode,
          state: zipCodeData.state,
          city: zipCodeData.city,
          neighborhood: zipCodeData.neighborhood,
          street: zipCodeData.street,
          locationId: matchingCity?.id,
          weather: weatherData,
        };

        console.log("🎉 Resultado final:", result);
        return result;
      } catch (error: any) {
        throw new Error(handleApiError(error));
      }
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
};

// Hook for intelligent system analysis
export const useIntelligentSystem = () => {
  return useMutation({
    mutationFn: async (userInput: { userInput: string }) => {
      try {
        console.log(
          "🔍 Iniciando análise inteligente para:",
          userInput.userInput
        );

        // 1. Get intelligent decision
        const decision = await apiService.getIntelligentDecision(
          userInput.userInput
        );

        // 2. Handle ZIP code only request
        if (decision.action === ACTIONS.CONSULT_ZIP_CODE) {
          const cep =
            decision.extractedZipCode || extractZipCode(userInput.userInput);
          if (!cep) {
            throw new Error(
              "CEP_INVALID: Nenhum CEP válido encontrado na consulta."
            );
          }

          const zipCodeData = await apiService.getZipCodeData(cep);

          return {
            initialMessage: decision.friendlyMessage,
            action: ACTIONS.CONSULT_ZIP_CODE,
            zipCodeData,
            weatherData: undefined,
            finalMessage: `✅ Aqui estão as informações do CEP ${zipCodeData.zipcode}. Precisa de mais alguma informação? 😊`,
          };
        }

        // 3. Handle ZIP code + weather request
        if (decision.action === ACTIONS.CONSULT_ZIP_CODE_AND_WEATHER) {
          const cep =
            decision.extractedZipCode || extractZipCode(userInput.userInput);
          if (!cep) {
            throw new Error(
              "CEP_INVALID: Nenhum CEP válido encontrado na consulta."
            );
          }

          const zipCodeData = await apiService.getZipCodeData(cep);
          const cityData = await apiService.getCityData(zipCodeData.city);

          if (!cityData.locations || cityData.locations.length === 0) {
            throw new Error(
              `CITY_NOT_FOUND: Cidade '${zipCodeData.city}' não encontrada.`
            );
          }

          // Tenta encontrar cidade correspondente por estado
          let matchingCity = cityData.locations.find(
            (localidade: CityLocation) => localidade.state === zipCodeData.state
          );

          // Se não encontrar por estado, pega a primeira cidade
          if (!matchingCity && cityData.locations.length > 0) {
            console.log(
              "⚠️ Cidade não encontrada por estado, usando primeira opção"
            );
            matchingCity = cityData.locations[0];
          }

          let weatherData = undefined;
          if (matchingCity) {
            try {
              weatherData = await apiService.getWeatherData(matchingCity.id);
            } catch (weatherError) {
              console.log(
                "⚠️ Previsão do tempo não disponível para esta cidade:",
                weatherError
              );
            }
          } else {
            console.log(
              "⚠️ Nenhuma cidade encontrada para buscar previsão do tempo"
            );
          }

          return {
            initialMessage: decision.friendlyMessage,
            action: ACTIONS.CONSULT_ZIP_CODE_AND_WEATHER,
            zipCodeData,
            weatherData,
            finalMessage: weatherData
              ? `✅ Pronto! Aqui estão as informações completas para o CEP ${zipCodeData.zipcode}. Espero que essas informações sejam úteis! 😊`
              : `✅ Aqui estão as informações do CEP ${zipCodeData.zipcode}. ⚠️ Previsão do tempo não disponível para esta cidade.`,
          };
        }

        // 4. Handle weather only request
        if (decision.action === ACTIONS.CONSULT_WEATHER_DIRECT) {
          const city =
            decision.extractedCity || extractCity(userInput.userInput);
          if (!city) {
            throw new Error(
              "CITY_NOT_FOUND: Nenhuma cidade encontrada na consulta."
            );
          }

          console.log("🏙️ Buscando cidade para previsão do tempo:", city);

          const cityData = await apiService.getCityData(city);

          if (!cityData.locations || cityData.locations.length === 0) {
            throw new Error(`CITY_NOT_FOUND: Cidade '${city}' não encontrada.`);
          }

          // Se há múltiplas cidades, retorna para o usuário escolher
          if (cityData.locations.length > 1) {
            console.log(
              "🏙️ Múltiplas cidades encontradas:",
              cityData.locations
            );
            return {
              initialMessage: decision.friendlyMessage,
              action: ACTIONS.MULTIPLE_CITIES,
              zipCodeData: undefined,
              weatherData: undefined,
              citiesFound: cityData.locations,
              finalMessage: decision.friendlyMessage,
            };
          }

          const selectedCity = cityData.locations[0];
          console.log("🌤️ Buscando previsão para cidade:", selectedCity.name);

          let weatherData;
          try {
            weatherData = await apiService.getWeatherData(selectedCity.id);
          } catch (weatherError) {
            console.log("⚠️ Erro ao buscar previsão do tempo:", weatherError);
            throw new Error(
              `Previsão do tempo não disponível para ${selectedCity.name}`
            );
          }

          return {
            initialMessage: decision.friendlyMessage,
            action: ACTIONS.CONSULT_WEATHER_DIRECT,
            zipCodeData: undefined,
            weatherData,
            finalMessage: `✅ Pronto! Aqui está a previsão do tempo para ${selectedCity.name}. Espero que essas informações sejam úteis! 😊`,
          };
        }

        // 5. Handle other actions
        const actionHandlers = {
          [ACTIONS.OUT_OF_SCOPE]: () => ({
            initialMessage: decision.friendlyMessage,
            action: ACTIONS.OUT_OF_SCOPE,
            zipCodeData: undefined,
            weatherData: undefined,
            finalMessage: decision.friendlyMessage,
          }),
          [ACTIONS.REQUEST_ZIP_CODE]: () => ({
            initialMessage: decision.friendlyMessage,
            action: ACTIONS.REQUEST_ZIP_CODE,
            zipCodeData: undefined,
            weatherData: undefined,
            finalMessage: decision.friendlyMessage,
          }),
          [ACTIONS.REQUEST_LOCATION]: () => ({
            initialMessage: decision.friendlyMessage,
            action: ACTIONS.REQUEST_LOCATION,
            zipCodeData: undefined,
            weatherData: undefined,
            finalMessage: decision.friendlyMessage,
          }),
          [ACTIONS.MULTIPLE_CITIES]: () => ({
            initialMessage: decision.friendlyMessage,
            action: ACTIONS.MULTIPLE_CITIES,
            zipCodeData: undefined,
            weatherData: undefined,
            citiesFound: decision.foundCities,
            finalMessage: decision.friendlyMessage,
          }),
          [ACTIONS.CITY_NOT_FOUND]: () => ({
            initialMessage: decision.friendlyMessage,
            action: ACTIONS.CITY_NOT_FOUND,
            zipCodeData: undefined,
            weatherData: undefined,
            finalMessage: "",
          }),
        };

        const handler =
          actionHandlers[decision.action as keyof typeof actionHandlers];
        if (handler) {
          return handler();
        }

        throw new Error("Ação não reconhecida pelo sistema");
      } catch (error: any) {
        console.error("Erro no sistema inteligente:", error);
        throw new Error(handleApiError(error));
      }
    },
    onError: (error: any) => {
      console.error("Erro no sistema inteligente:", error);
      toast.error(error.message);
    },
  });
};

// Legacy hook names for backward compatibility
export const useConsultarCepEPrevisao = useZipCodeAndWeather;
export const useSistemaInteligente = useIntelligentSystem;
