/**
 * Constantes para palavras-chave relacionadas a CEP/endereço
 * Inclui variações em português e inglês
 */

export const ZIPCODE_KEYWORDS = [
  // Português
  "cep",
  "endereço",
  "endereco",
  "rua",
  "avenida",
  "bairro",
  "cidade",
  "estado",
  "localização",
  "localizacao",
  "local",
  "loc",
  
  // Inglês
  "zip",
  "postal",
  "code",
  "address",
  "street",
  "avenue",
  "neighborhood",
  "city",
  "state",
  "location",
  "loc",
] as const;

/**
 * Regex para detectar palavras-chave de CEP/endereço
 */
export const ZIPCODE_KEYWORDS_REGEX = new RegExp(ZIPCODE_KEYWORDS.join("|"), "i");

/**
 * Verifica se uma string contém palavras-chave de CEP/endereço
 */
export const hasZipCodeKeyword = (input: string): boolean => {
  return ZIPCODE_KEYWORDS_REGEX.test(input);
};

/**
 * Extrai palavras-chave de CEP/endereço de uma string
 */
export const extractZipCodeKeywords = (input: string): string[] => {
  const foundKeywords: string[] = [];
  const lowerInput = input.toLowerCase();
  
  for (const keyword of ZIPCODE_KEYWORDS) {
    if (lowerInput.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    }
  }
  
  return foundKeywords;
};
