/**
 * Utilitários para extração e validação de CEP
 */

/**
 * Extrai apenas os números de uma string
 */
export const extractNumbers = (input: string): string => {
  return input.replace(/\D/g, "");
};

/**
 * Verifica se uma string contém um CEP válido (8 dígitos)
 */
export const hasValidZipCode = (input: string): boolean => {
  const numbers = extractNumbers(input);
  return numbers.length === 8;
};

/**
 * Extrai o CEP de uma string
 * Retorna o CEP limpo (apenas números) ou null se não encontrar
 */
export const extractZipCode = (input: string): string | null => {
  const numbers = extractNumbers(input);

  // Verifica se tem exatamente 8 dígitos
  if (numbers.length === 8) {
    console.log("🔍 ZIP code extracted:", numbers);
    return numbers;
  }

  // Se tem mais de 8 dígitos, tenta encontrar um padrão de CEP
  if (numbers.length > 8) {
    // Procura por padrões de CEP na string original
    const zipCodePatterns = [
      /\d{5}-\d{3}/, // 01310-100
      /\d{8}/, // 01310100
      /\d{5}\s+\d{3}/, // 01310 100
    ];

    for (const pattern of zipCodePatterns) {
      const match = input.match(pattern);
      if (match) {
        const cleanZipCode = match[0].replace(/\D/g, "");
        if (cleanZipCode.length === 8) {
          console.log("🔍 ZIP code extracted from pattern:", cleanZipCode);
          return cleanZipCode;
        }
      }
    }
  }

  return null;
};

/**
 * Formata um CEP para exibição (adiciona hífen)
 */
export const formatZipCode = (zipCode: string): string => {
  if (zipCode.length === 8) {
    return `${zipCode.slice(0, 5)}-${zipCode.slice(5)}`;
  }
  return zipCode;
};

/**
 * Valida se um CEP tem formato correto
 */
export const isValidZipCode = (zipCode: string): boolean => {
  const cleanZipCode = extractNumbers(zipCode);
  return cleanZipCode.length === 8 && /^\d{8}$/.test(cleanZipCode);
};
