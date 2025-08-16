// Import the HttpError class to extract its type
import { HttpError } from "../errors/base/HttpError";

// Error types based on the server error structure
export type HttpErrorData = Pick<HttpError, "message" | "status" | "messages">;

// Error codes used in the application (matching server error codes)
export const ERROR_CODES = {
  // CEP related errors
  CEP_NOT_FOUND: "CEP_NOT_FOUND",
  CEP_INVALID: "CEP_INVALID",

  // City related errors
  LOCALIDADE_NOT_FOUND: "LOCALIDADE_NOT_FOUND",
  LOCALIDADE_INVALID: "LOCALIDADE_INVALID",

  // Weather related errors
  PREVISAO_NOT_FOUND: "PREVISAO_NOT_FOUND",
  PREVISAO_INVALID: "PREVISAO_INVALID",
  NO_FORECAST: "NO_FORECAST",

  // Network and server errors
  TIMEOUT: "TIMEOUT",
  SERVER_ERROR: "SERVER_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  NETWORK_ERROR: "NETWORK_ERROR",

  // Generic errors
  GENERIC_ERROR: "GENERIC_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// Error messages mapping for user-friendly display
export const ERROR_MESSAGES = {
  [ERROR_CODES.CEP_NOT_FOUND]:
    "❌ CEP não encontrado. Verifique se o CEP está correto e tente novamente.",
  [ERROR_CODES.CEP_INVALID]:
    "❌ CEP inválido. Digite apenas números (exemplo: 01310-100).",
  [ERROR_CODES.LOCALIDADE_NOT_FOUND]:
    "🏙️ Localidade não encontrada. Verifique o nome da cidade e tente novamente.",
  [ERROR_CODES.LOCALIDADE_INVALID]:
    "🏙️ Nome da cidade inválido. Verifique e tente novamente.",
  [ERROR_CODES.PREVISAO_NOT_FOUND]:
    "🌤️ Previsão não encontrada para esta cidade.",
  [ERROR_CODES.PREVISAO_INVALID]: "🌤️ Código da cidade inválido para previsão.",
  [ERROR_CODES.NO_FORECAST]:
    "🌤️ Previsão do tempo não disponível para esta cidade no momento. Tente outra cidade ou CEP.",
  [ERROR_CODES.TIMEOUT]:
    "⏰ Tempo limite excedido. Nossos servidores estão ocupados, tente novamente em alguns segundos.",
  [ERROR_CODES.SERVER_ERROR]:
    "🔧 Erro interno do servidor. Tente novamente em alguns minutos.",
  [ERROR_CODES.SERVICE_UNAVAILABLE]:
    "🔧 Nossos serviços estão temporariamente indisponíveis. Tente novamente em alguns minutos.",
  [ERROR_CODES.NETWORK_ERROR]:
    "🌐 Problema de conexão. Verifique sua internet e tente novamente.",
  [ERROR_CODES.GENERIC_ERROR]:
    "❌ Erro inesperado. Tente novamente ou entre em contato com o suporte.",
} as const;
