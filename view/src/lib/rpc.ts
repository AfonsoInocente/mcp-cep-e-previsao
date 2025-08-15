import { createClient } from "@deco/workers-runtime/client";

type ToolsMCP = {
  CONSULTAR_CEP: (input: { cep: string }) => Promise<{
    cep: string;
    state: string;
    city: string;
    neighborhood: string;
    street: string;
  }>;
  BUSCAR_LOCALIDADE: (input: { nomeCidade: string }) => Promise<{
    localidades: Array<{
      id: number;
      nome: string;
      estado: string;
    }>;
  }>;
  PREVISAO_TEMPO: (input: { codigoCidade: number }) => Promise<{
    cidade: string;
    estado: string;
    atualizado_em: string;
    clima: Array<{
      data: string;
      condicao: string;
      condicao_desc: string;
      min: number;
      max: number;
      indice_uv: number;
    }>;
  }>;
};

// Usar o cliente padrão do Deco que deve detectar automaticamente o endpoint
export const client = createClient<ToolsMCP>();
