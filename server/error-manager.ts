/**
 * Error class for CEP-related operations
 */
export class CEPError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "CEPError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Error class for Localidade (city search) operations
 */
export class LocalidadeError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "LocalidadeError";
    this.status = status;
    this.code = code;
  }
}

export class PrevisaoError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "PrevisaoError";
    this.status = status;
    this.code = code;
  }
}

export class CEPErrorManager {
  static createNotFoundError(message: string = "CEP inexistente"): CEPError {
    return new CEPError(message, 404, "CEP_NOT_FOUND");
  }

  static createBadRequestError(
    message: string = "CEP inexistente ou inválido"
  ): CEPError {
    return new CEPError(message, 400, "CEP_INVALID");
  }

  static createServerError(
    message: string = "Erro interno do servidor"
  ): CEPError {
    return new CEPError(message, 500, "SERVER_ERROR");
  }

  static createTimeoutError(message: string = "Timeout na consulta"): CEPError {
    return new CEPError(message, 408, "TIMEOUT");
  }

  static createGenericError(message: string, status: number = 500): CEPError {
    return new CEPError(message, status, "GENERIC_ERROR");
  }

  static handleAPIError(status: number, statusText: string): CEPError {
    switch (status) {
      case 404:
        return this.createNotFoundError();
      case 504: // Fiz dessa forma pois o BrasilAPI está retornando 504 para todos os CEPs que não existem
        return this.createBadRequestError();
      case 408:
        return this.createTimeoutError();
      case 500:
      case 502:
      case 503:
        return this.createServerError();
      default:
        return this.createGenericError(
          `Erro na consulta: ${status} ${statusText}`,
          status
        );
    }
  }
}

export class LocalidadeErrorManager {
  static createNotFoundError(
    message: string = "Localidade não encontrada"
  ): LocalidadeError {
    return new LocalidadeError(message, 404, "LOCALIDADE_NOT_FOUND");
  }

  static createBadRequestError(
    message: string = "Nome da cidade inválido"
  ): LocalidadeError {
    return new LocalidadeError(message, 400, "LOCALIDADE_INVALID");
  }

  static createServerError(
    message: string = "Erro interno do servidor"
  ): LocalidadeError {
    return new LocalidadeError(message, 500, "SERVER_ERROR");
  }

  static createTimeoutError(
    message: string = "Timeout na consulta"
  ): LocalidadeError {
    return new LocalidadeError(message, 408, "TIMEOUT");
  }

  static createGenericError(
    message: string,
    status: number = 500
  ): LocalidadeError {
    return new LocalidadeError(message, status, "GENERIC_ERROR");
  }

  static handleAPIError(status: number, statusText: string): LocalidadeError {
    switch (status) {
      case 404:
        return this.createNotFoundError();
      case 400:
        return this.createBadRequestError();
      case 408:
        return this.createTimeoutError();
      case 500:
      case 502:
      case 503:
        return this.createServerError();
      default:
        return this.createGenericError(
          `Erro na consulta: ${status} ${statusText}`,
          status
        );
    }
  }
}

/**
 * Error manager for weather forecast operations
 * Includes special handling for CPTEC API specific errors
 */
export class PrevisaoErrorManager {
  static createNotFoundError(
    message: string = "Previsão não encontrada"
  ): PrevisaoError {
    return new PrevisaoError(message, 404, "PREVISAO_NOT_FOUND");
  }

  static createBadRequestError(
    message: string = "Código da cidade inválido"
  ): PrevisaoError {
    return new PrevisaoError(message, 400, "PREVISAO_INVALID");
  }

  static createServerError(
    message: string = "Erro interno do servidor"
  ): PrevisaoError {
    return new PrevisaoError(message, 500, "SERVER_ERROR");
  }

  static createTimeoutError(
    message: string = "Timeout na consulta"
  ): PrevisaoError {
    return new PrevisaoError(message, 408, "TIMEOUT");
  }

  static createGenericError(
    message: string,
    status: number = 500
  ): PrevisaoError {
    return new PrevisaoError(message, status, "GENERIC_ERROR");
  }

  static handleAPIError(
    status: number,
    statusText: string,
    responseBody?: any
  ): PrevisaoError {
    switch (status) {
      case 404:
        return this.createNotFoundError();
      case 400:
        return this.createBadRequestError();
      case 408:
        return this.createTimeoutError();
      case 500:
        // Tratativa específica da API CPTEC: erro 500 com mensagem específica indica cidade sem previsão
        if (
          responseBody?.message === "Erro ao buscar previsões para a cidade"
        ) {
          return this.createBadRequestError(
            "Não há previsões definidas para essa cidade"
          );
        }
        return this.createServerError();
      case 502:
      case 503:
        return this.createServerError();
      default:
        return this.createGenericError(
          `Erro na consulta: ${status} ${statusText}`,
          status
        );
    }
  }
}
