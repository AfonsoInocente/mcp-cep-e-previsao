import { client } from "./rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * CEP e Previsão do Tempo hooks
 */

export const useConsultarCepEPrevisao = () => {
  return useMutation({
    mutationFn: async (cep: string) => {
      try {
        console.log("🔍 Iniciando consulta para CEP:", cep);

        // 1. Consultar CEP
        console.log("📞 Chamando CONSULTAR_CEP...");
        const cepData = await client.CONSULTAR_CEP({ cep });
        console.log("✅ CEP consultado:", cepData);

        // 2. Buscar localidade
        console.log("🏙️ Chamando BUSCAR_LOCALIDADE para cidade:", cepData.city);
        const localidadeData = await client.BUSCAR_LOCALIDADE({
          nomeCidade: cepData.city,
        });
        console.log(
          "✅ Localidades encontradas:",
          localidadeData.localidades.length
        );

        // 3. Encontrar localidade que corresponde ao estado
        const localidadeEncontrada = localidadeData.localidades.find(
          (localidade: any) => localidade.estado === cepData.state
        );
        console.log("🎯 Localidade encontrada:", localidadeEncontrada);

        let clima = undefined;

        // 4. Se encontrou localidade, buscar previsão do tempo
        if (localidadeEncontrada) {
          try {
            console.log(
              "🌤️ Chamando PREVISAO_TEMPO para cidade ID:",
              localidadeEncontrada.id
            );
            const previsaoData = await client.PREVISAO_TEMPO({
              codigoCidade: localidadeEncontrada.id,
            });
            console.log(
              "✅ Previsão obtida:",
              previsaoData.clima.length,
              "dias"
            );

            // Formatar dados do clima
            clima = previsaoData.clima.map((item: any) => ({
              condicao: item.condicao_desc,
              minima: item.min,
              maxima: item.max,
            }));
          } catch (previsaoError) {
            // Se falhar na previsão, continua sem clima
            console.log("⚠️ Previsão do tempo não disponível:", previsaoError);
          }
        } else {
          console.log(
            "⚠️ Nenhuma localidade encontrada para:",
            cepData.city,
            cepData.state
          );
        }

        // 5. Retornar resultado completo
        const result = {
          cep: cepData.cep,
          state: cepData.state,
          city: cepData.city,
          neighborhood: cepData.neighborhood,
          street: cepData.street,
          location_id: localidadeEncontrada?.id,
          clima: clima,
        };

        console.log("🎉 Resultado final:", result);
        return result;
      } catch (error: any) {
        // Trata erros específicos
        if (error?.message?.includes("CEP inexistente")) {
          throw new Error(
            "CEP não encontrado. Verifique se o CEP está correto."
          );
        } else if (error?.message?.includes("CEP inexistente ou inválido")) {
          throw new Error("CEP inválido. Digite apenas números.");
        } else if (error?.message?.includes("Timeout")) {
          throw new Error("Tempo limite excedido. Tente novamente.");
        } else if (error?.message?.includes("Não há previsões")) {
          throw new Error(
            "Não há previsões de tempo disponíveis para esta cidade."
          );
        } else {
          throw new Error("Erro ao consultar CEP. Tente novamente.");
        }
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao consultar CEP. Tente novamente.");
    },
  });
};
