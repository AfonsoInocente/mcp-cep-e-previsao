/**
 * This is where you define your workflows.
 *
 * Workflows are a way to encode complex flows of steps
 * reusing your tools and with built-in observability
 * on the Deco project dashboard. They can also do much more!
 *
 * When exported, they will be available on the MCP server
 * via built-in tools for starting, resuming and cancelling
 * them.
 *
 * @see https://docs.deco.page/en/guides/building-workflows/
 */
import {
  createStepFromTool,
  createWorkflow,
} from "@deco/workers-runtime/mastra";
import { z } from "zod";
import { Env } from "./main";
import {
  createConsultarCEPTool,
  createBuscarLocalidadeTool,
  createPrevisaoTempoTool,
  createDecisorInteligenteTool,
} from "./tools";

const createConsultarCepEPrevisaoWorkflow = (env: Env) => {
  const consultarCEPStep = createStepFromTool(createConsultarCEPTool(env));
  const buscarLocalidadeStep = createStepFromTool(
    createBuscarLocalidadeTool(env)
  );
  const previsaoTempoStep = createStepFromTool(createPrevisaoTempoTool(env));

  return createWorkflow({
    id: "CONSULTAR_CEP_E_PREVISAO_WORKFLOW",
    inputSchema: z.object({
      cep: z.string().transform((val) => {
        const cleaned = val.replace(/\D/g, "");
        if (cleaned.length !== 8) {
          throw new Error("CEP deve conter exatamente 8 dígitos numéricos");
        }
        return cleaned;
      }),
    }),
    outputSchema: z.object({
      cep: z.string(),
      state: z.string(),
      city: z.string(),
      neighborhood: z.string(),
      street: z.string(),
      location_id: z.number().optional(),
      clima: z
        .array(
          z.object({
            condicao: z.string(),
            minima: z.number(),
            maxima: z.number(),
          })
        )
        .optional(),
    }),
  })
    .then(consultarCEPStep)
    .map(async ({ inputData }) => ({
      nomeCidade: inputData.city,
    }))
    .then(buscarLocalidadeStep)
    .map(async ({ inputData, getStepResult }) => {
      const cepData = getStepResult(consultarCEPStep);
      const localidades = inputData.localidades;

      // Busca a localidade que corresponde ao estado do CEP
      const localidadeEncontrada = localidades.find(
        (localidade: any) => localidade.estado === cepData.state
      );

      return {
        cep: cepData.cep,
        state: cepData.state,
        city: cepData.city,
        neighborhood: cepData.neighborhood,
        street: cepData.street,
        location_id: localidadeEncontrada?.id,
      };
    })
    .map(async ({ inputData, getStepResult }: any) => {
      const cepData = getStepResult(consultarCEPStep);
      const localidadeData = inputData;

      // Sempre prepara para buscar previsão do tempo se tem location_id
      if (localidadeData.location_id) {
        return {
          codigoCidade: localidadeData.location_id,
        };
      }

      return {
        cep: cepData.cep,
        state: cepData.state,
        city: cepData.city,
        neighborhood: cepData.neighborhood,
        street: cepData.street,
        location_id: undefined,
        clima: undefined,
      };
    })
    .then(previsaoTempoStep)
    .map(async ({ inputData, getStepResult }: any) => {
      const cepData = getStepResult(consultarCEPStep);
      const localidadeData = getStepResult(buscarLocalidadeStep);

      // Sempre retorna os dados básicos do CEP
      const result = {
        cep: cepData.cep,
        state: cepData.state,
        city: cepData.city,
        neighborhood: cepData.neighborhood,
        street: cepData.street,
        location_id: localidadeData.location_id,
        clima: undefined,
      };

      // Se tem dados de previsão, adiciona o clima
      if (inputData && inputData.clima && Array.isArray(inputData.clima)) {
        const climaFormatado = inputData.clima.map((item: any) => ({
          condicao: item.condicao_desc,
          minima: item.min,
          maxima: item.max,
        }));
        result.clima = climaFormatado;
      }

      return result;
    })
    .commit();
};

const createWorkflowPrincipalInteligente = (env: Env) => {
  const decisorStep = createStepFromTool(createDecisorInteligenteTool(env));

  return createWorkflow({
    id: "WORKFLOW_PRINCIPAL_INTELIGENTE",
    inputSchema: z.object({
      entrada_usuario: z.string().min(1, "Entrada do usuário é obrigatória"),
    }),
    outputSchema: z.object({
      mensagem_inicial: z.string(),
      acao_executada: z.string(),
      mensagem_final: z.string(),
    }),
  })
    .then(decisorStep)
    .map(async ({ inputData }) => {
      return {
        mensagem_inicial: inputData.mensagem_amigavel,
        acao_executada: inputData.acao,
        mensagem_final: `✅ Análise concluída! ${inputData.mensagem_amigavel}`,
      };
    })
    .commit();
};

export const workflows = [
  createConsultarCepEPrevisaoWorkflow,
  createWorkflowPrincipalInteligente,
];
