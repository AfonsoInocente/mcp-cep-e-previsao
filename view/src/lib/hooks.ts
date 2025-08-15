import { client } from "./rpc";
import { useMutation } from "@tanstack/react-query";
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
        const cepData = await (client as any).CONSULTAR_CEP({ cep });
        console.log("✅ CEP consultado:", cepData);

        // 2. Buscar localidade
        console.log("🏙️ Chamando BUSCAR_LOCALIDADE para cidade:", cepData.city);
        const localidadeData = await (client as any).BUSCAR_LOCALIDADE({
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
            const previsaoData = await (client as any).PREVISAO_TEMPO({
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

// Hook para o sistema inteligente usando tools diretamente
export const useSistemaInteligente = () => {
  return useMutation({
    mutationFn: async (entrada: { entrada_usuario: string }) => {
      try {
        console.log(
          "🔍 Iniciando análise inteligente para:",
          entrada.entrada_usuario
        );

        // 1. Usar o DECISOR_INTELIGENTE para analisar a entrada
        console.log("🧠 Chamando DECISOR_INTELIGENTE...");
        const decisao = await (client as any).DECISOR_INTELIGENTE({
          entrada_usuario: entrada.entrada_usuario,
        });
        console.log("✅ Decisão recebida:", decisao);

        // 2. Se quer apenas CEP, consultar apenas o CEP
        if (decisao.acao === "CONSULTAR_CEP") {
          // Extrai CEP da entrada ou usa o extraído pela IA
          let cep = decisao.cep_extraido;
          if (!cep) {
            // Tenta extrair CEP da entrada do usuário
            const cepMatch = entrada.entrada_usuario.match(/\d{5}-?\d{3}/);
            if (cepMatch) {
              cep = cepMatch[0].replace(/\D/g, "");
            } else {
              throw new Error(
                "CEP_INVALID: Nenhum CEP válido encontrado na consulta. Digite um CEP válido (exemplo: 01310-100)."
              );
            }
          }

          console.log("📞 Chamando CONSULTAR_CEP para:", cep);
          try {
            const cepData = await (client as any).CONSULTAR_CEP({ cep });
            console.log("✅ CEP consultado:", cepData);

            return {
              mensagem_inicial: decisao.mensagem_amigavel,
              acao_executada: "CONSULTAR_CEP",
              dados_cep: cepData,
              dados_clima: undefined,
              mensagem_final: `✅ Aqui estão as informações do CEP ${cepData.cep}:\n\n📍 **Endereço Completo:**\n• Rua: ${cepData.street}\n• Bairro: ${cepData.neighborhood}\n• Cidade: ${cepData.city}\n• Estado: ${cepData.state}\n\nPrecisa de mais alguma informação? 😊`,
            };
          } catch (cepError: any) {
            console.error("❌ Erro ao consultar CEP:", cepError);
            throw new Error(
              `CEP_NOT_FOUND: CEP ${cep} não encontrado. Verifique se o CEP está correto.`
            );
          }
        }

        // 3. Se quer CEP + previsão, fazer o fluxo completo
        if (decisao.acao === "CONSULTAR_CEP_E_PREVISAO") {
          // Extrai CEP da entrada ou usa o extraído pela IA
          let cep = decisao.cep_extraido;
          if (!cep) {
            // Tenta extrair CEP da entrada do usuário
            const cepMatch = entrada.entrada_usuario.match(/\d{5}-?\d{3}/);
            if (cepMatch) {
              cep = cepMatch[0].replace(/\D/g, "");
            } else {
              throw new Error(
                "CEP_INVALID: Nenhum CEP válido encontrado na consulta. Digite um CEP válido (exemplo: 01310-100)."
              );
            }
          }

          console.log("📞 Chamando CONSULTAR_CEP para:", cep);
          let cepData;
          try {
            cepData = await (client as any).CONSULTAR_CEP({ cep });
            console.log("✅ CEP consultado:", cepData);
          } catch (cepError: any) {
            console.error("❌ Erro ao consultar CEP:", cepError);
            throw new Error(
              `CEP_NOT_FOUND: CEP ${cep} não encontrado. Verifique se o CEP está correto.`
            );
          }

          console.log(
            "🏙️ Chamando BUSCAR_LOCALIDADE para cidade:",
            cepData.city
          );
          let localidadeData;
          try {
            localidadeData = await (client as any).BUSCAR_LOCALIDADE({
              nomeCidade: cepData.city,
            });
            console.log(
              "✅ Localidades encontradas:",
              localidadeData.localidades.length
            );

            if (
              !localidadeData.localidades ||
              localidadeData.localidades.length === 0
            ) {
              throw new Error(
                `CITY_NOT_FOUND: Cidade '${cepData.city}' não encontrada.`
              );
            }
          } catch (localidadeError: any) {
            console.error("❌ Erro ao buscar localidade:", localidadeError);
            throw new Error(
              `SERVICE_UNAVAILABLE: Erro ao buscar informações da cidade '${cepData.city}'.`
            );
          }

          // Encontrar localidade que corresponde ao estado
          const localidadeEncontrada = localidadeData.localidades.find(
            (localidade: any) => localidade.estado === cepData.state
          );
          console.log("🎯 Localidade encontrada:", localidadeEncontrada);

          let clima = undefined;

          // Se encontrou localidade, buscar previsão do tempo
          if (localidadeEncontrada) {
            try {
              console.log(
                "🌤️ Chamando PREVISAO_TEMPO para cidade ID:",
                localidadeEncontrada.id
              );
              const previsaoData = await (client as any).PREVISAO_TEMPO({
                codigoCidade: localidadeEncontrada.id,
              });
              console.log(
                "✅ Previsão obtida:",
                previsaoData.clima.length,
                "dias"
              );
              clima = previsaoData;
            } catch (previsaoError: any) {
              console.error(
                "⚠️ Erro ao buscar previsão do tempo:",
                previsaoError
              );
              // Não falha o fluxo, apenas não retorna previsão
              console.log(
                "⚠️ Previsão do tempo não disponível para esta cidade."
              );
            }
          }

          return {
            mensagem_inicial: decisao.mensagem_amigavel,
            acao_executada: "CONSULTAR_CEP_E_PREVISAO",
            dados_cep: cepData,
            dados_clima: clima,
            mensagem_final: clima
              ? `✅ Pronto! Aqui estão as informações completas para o CEP ${cepData.cep}:\n\n📍 **Endereço:** ${cepData.street}, ${cepData.neighborhood}, ${cepData.city} - ${cepData.state}\n\n🌤️ **Previsão do Tempo:**\n${clima.clima.map((dia: any) => `📅 ${dia.data}: ${dia.condicao_desc} (${dia.min}°C a ${dia.max}°C) - UV: ${dia.indice_uv}`).join("\n")}\n\nEspero que essas informações sejam úteis! 😊`
              : `✅ Aqui estão as informações do CEP ${cepData.cep}:\n\n📍 **Endereço:** ${cepData.street}, ${cepData.neighborhood}, ${cepData.city} - ${cepData.state}\n\n⚠️ Previsão do tempo não disponível para esta cidade.`,
          };
        }

        // 4. Se quer apenas previsão do tempo (sem CEP)
        if (decisao.acao === "CONSULTAR_PREVISAO_DIRETA") {
          // Usa a cidade extraída pela IA ou extrai da entrada
          let cidade = decisao.cidade_extraida;
          if (!cidade) {
            // Tenta extrair cidade da entrada do usuário
            const cidadeMatch = entrada.entrada_usuario.match(
              /(?:em|para|de)\s+([A-Za-zÀ-ÿ\s]+?)(?:\?|$|,)/i
            );
            if (cidadeMatch) {
              cidade = cidadeMatch[1].trim();
            } else {
              throw new Error(
                "CITY_NOT_FOUND: Nenhuma cidade encontrada na consulta. Digite uma cidade válida (exemplo: 'como está o clima em São Paulo?')."
              );
            }
          }

          console.log("🏙️ Chamando BUSCAR_LOCALIDADE para cidade:", cidade);
          try {
            const localidadeData = await (client as any).BUSCAR_LOCALIDADE({
              nomeCidade: cidade,
            });
            console.log(
              "✅ Localidades encontradas:",
              localidadeData.localidades.length
            );

            if (
              !localidadeData.localidades ||
              localidadeData.localidades.length === 0
            ) {
              throw new Error(
                `CITY_NOT_FOUND: Cidade '${cidade}' não encontrada. Verifique o nome da cidade.`
              );
            }

            // Usa o primeiro resultado da busca
            const localidadeEncontrada = localidadeData.localidades[0];
            console.log("🎯 Localidade selecionada:", localidadeEncontrada);

            let clima = undefined;

            // Se encontrou localidade, buscar previsão do tempo
            try {
              console.log(
                "🌤️ Chamando PREVISAO_TEMPO para cidade ID:",
                localidadeEncontrada.id
              );
              const previsaoData = await (client as any).PREVISAO_TEMPO({
                codigoCidade: localidadeEncontrada.id,
              });
              console.log(
                "✅ Previsão obtida:",
                previsaoData.clima.length,
                "dias"
              );
              clima = previsaoData;
            } catch (previsaoError: any) {
              console.error(
                "⚠️ Erro ao buscar previsão do tempo:",
                previsaoError
              );
              throw new Error(
                `NO_FORECAST: Previsão do tempo não disponível para ${cidade} no momento.`
              );
            }

            return {
              mensagem_inicial: decisao.mensagem_amigavel,
              acao_executada: "CONSULTAR_PREVISAO_DIRETA",
              dados_cep: undefined,
              dados_clima: clima,
              mensagem_final: `✅ Pronto! Aqui está a previsão do tempo para ${localidadeEncontrada.nome}:\n\n🌤️ **Previsão do Tempo:**\n${clima.clima.map((dia: any) => `📅 ${dia.data}: ${dia.condicao_desc} (${dia.min}°C a ${dia.max}°C) - UV: ${dia.indice_uv}`).join("\n")}\n\nEspero que essas informações sejam úteis! 😊`,
            };
          } catch (localidadeError: any) {
            console.error("❌ Erro ao buscar localidade:", localidadeError);
            if (localidadeError.message.includes("CITY_NOT_FOUND")) {
              throw localidadeError;
            }
            throw new Error(
              `SERVICE_UNAVAILABLE: Erro ao buscar informações da cidade '${cidade}'. Tente novamente.`
            );
          }
        }

        throw new Error("Ação não reconhecida pelo sistema");
      } catch (error: any) {
        console.error("Erro no sistema inteligente:", error);

        // Trata erros específicos com mensagens amigáveis
        if (
          error?.message?.includes("CEP inexistente") ||
          error?.message?.includes("CEP_NOT_FOUND")
        ) {
          throw new Error(
            "❌ CEP não encontrado. Verifique se o CEP está correto e tente novamente."
          );
        } else if (
          error?.message?.includes("CEP inexistente ou inválido") ||
          error?.message?.includes("CEP_INVALID")
        ) {
          throw new Error(
            "❌ CEP inválido. Digite apenas números (exemplo: 01310-100)."
          );
        } else if (
          error?.message?.includes("Timeout") ||
          error?.message?.includes("timeout")
        ) {
          throw new Error(
            "⏰ Tempo limite excedido. Nossos servidores estão ocupados, tente novamente em alguns segundos."
          );
        } else if (
          error?.message?.includes("Não há previsões") ||
          error?.message?.includes("NO_FORECAST")
        ) {
          throw new Error(
            "🌤️ Previsão do tempo não disponível para esta cidade no momento. Tente outra cidade ou CEP."
          );
        } else if (
          error?.message?.includes("Network connection lost") ||
          error?.message?.includes("network")
        ) {
          throw new Error(
            "🌐 Problema de conexão. Verifique sua internet e tente novamente."
          );
        } else if (
          error?.message?.includes("cidade não encontrada") ||
          error?.message?.includes("CITY_NOT_FOUND")
        ) {
          throw new Error(
            "🏙️ Cidade não encontrada. Verifique o nome da cidade e tente novamente."
          );
        } else if (
          error?.message?.includes("sistema fora do ar") ||
          error?.message?.includes("SERVICE_UNAVAILABLE")
        ) {
          throw new Error(
            "🔧 Nossos serviços estão temporariamente indisponíveis. Tente novamente em alguns minutos."
          );
        } else {
          throw new Error(
            "❌ Erro inesperado. Tente novamente ou entre em contato com o suporte."
          );
        }
      }
    },
    onError: (error: any) => {
      console.error("Erro no sistema inteligente:", error);
    },
  });
};
