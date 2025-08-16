// API Response types
export interface ZipCodeData {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
}

export interface CityData {
  id: number;
  nome: string;
  estado: string;
}

export interface WeatherData {
  clima: Array<{
    condicao_desc: string;
    min: number;
    max: number;
  }>;
}

export interface LocalidadeResponse {
  localidades: CityData[];
}

export interface IntelligentDecision {
  acao: string;
  mensagem_amigavel: string;
  cep_extraido?: string;
  cidade_extraida?: string;
  cidades_encontradas?: string[];
}
