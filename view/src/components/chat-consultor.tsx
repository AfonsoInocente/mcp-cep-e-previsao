import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { useSistemaInteligente } from "../lib/hooks";
import { client } from "../lib/rpc";
import { Loader2, MapPin, Cloud, Search, Send, User, Bot } from "lucide-react";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  data?: any; // Para dados de CEP ou clima
  options?: Array<{
    id: string;
    text: string;
    value: string;
    cidadeId?: number;
  }>; // Para opções clicáveis (múltiplas cidades)
}

export function ChatConsultor() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Olá! Sou seu assistente de CEP e previsão do tempo. Como posso ajudar? 😊",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contexto, setContexto] = useState<{
    aguardandoResposta: boolean;
    tipoAguardando: "CEP" | "CIDADE" | null;
    perguntaAnterior: string;
  }>({
    aguardandoResposta: false,
    tipoAguardando: null,
    perguntaAnterior: "",
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const sistemaMutation = useSistemaInteligente();

  // Foca no input automaticamente
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Foca no input quando termina de carregar
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const addMessage = (
    text: string,
    isUser: boolean,
    data?: any,
    options?: Array<{
      id: string;
      text: string;
      value: string;
      cidadeId?: number;
    }>
  ) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser,
      timestamp: new Date(),
      data,
      options,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleOptionClick = async (option: {
    id: string;
    text: string;
    value: string;
    cidadeId?: number;
  }) => {
    console.log("🎯 Opção selecionada:", option);

    // Adiciona a seleção do usuário como mensagem
    addMessage(`Escolhi: ${option.text}`, true);
    setIsLoading(true);

    try {
      // Se tem cidadeId, busca a previsão do tempo diretamente
      if (option.cidadeId) {
        console.log("🌤️ Buscando previsão para cidade ID:", option.cidadeId);

        const previsaoData = await (client as any).PREVISAO_TEMPO({
          codigoCidade: option.cidadeId,
        });

        const climaMessage = `🌤️ **Previsão do Tempo para ${option.text}:**\n${previsaoData.clima
          .map(
            (dia: any) =>
              `📅 ${new Date(dia.data).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}: ${dia.condicao_desc} (${dia.min}°C a ${dia.max}°C)`
          )
          .join("\n")}`;

        addMessage(climaMessage, false, {
          tipo: "clima",
          dados: previsaoData,
        });
      } else {
        // Se não tem cidadeId, processa como entrada normal
        const resultado = await sistemaMutation.mutateAsync({
          entrada_usuario: option.value,
        });

        addMessage(resultado.mensagem_inicial, false);

        if (resultado.dados_cep) {
          const cepMessage = `📍 **Endereço:**\n• CEP: ${resultado.dados_cep.cep}\n• Rua: ${resultado.dados_cep.street}\n• Bairro: ${resultado.dados_cep.neighborhood}\n• Cidade: ${resultado.dados_cep.city}\n• Estado: ${resultado.dados_cep.state}`;
          addMessage(cepMessage, false, {
            tipo: "cep",
            dados: resultado.dados_cep,
          });
        }

        if (resultado.dados_clima) {
          const climaMessage = `🌤️ **Previsão do Tempo:**\n${resultado.dados_clima.clima
            .map(
              (dia: any) =>
                `📅 ${new Date(dia.data).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}: ${dia.condicao_desc} (${dia.min}°C a ${dia.max}°C)`
            )
            .join("\n")}`;
          addMessage(climaMessage, false, {
            tipo: "clima",
            dados: resultado.dados_clima,
          });
        }

        if (
          resultado.acao_executada !== "SOLICITAR_CEP" &&
          resultado.acao_executada !== "SOLICITAR_LOCAL"
        ) {
          addMessage(resultado.mensagem_final, false);
        }
      }
    } catch (error: any) {
      console.error("Erro ao processar opção:", error);
      addMessage(
        `❌ ${error.message || "Erro ao processar sua seleção. Tente novamente."}`,
        false
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userInput = inputValue.trim();
    setInputValue("");

    // Adiciona mensagem do usuário
    addMessage(userInput, true);
    setIsLoading(true);

    try {
      let entradaProcessada = userInput;

      // Se está aguardando resposta, processa com contexto
      if (contexto.aguardandoResposta) {
        if (contexto.tipoAguardando === "CEP") {
          // Se está aguardando CEP, adiciona contexto
          entradaProcessada = `CEP ${userInput}`;
        } else if (contexto.tipoAguardando === "CIDADE") {
          // Se está aguardando cidade, adiciona contexto
          entradaProcessada = `previsão do tempo em ${userInput}`;
        }

        // Limpa o contexto após usar
        setContexto({
          aguardandoResposta: false,
          tipoAguardando: null,
          perguntaAnterior: "",
        });
      }

      console.log("🔍 Processando entrada:", entradaProcessada);

      const resultado = await sistemaMutation.mutateAsync({
        entrada_usuario: entradaProcessada,
      });

      console.log("✅ Resultado recebido:", resultado);

      // Verifica se há múltiplas cidades para mostrar opções
      if (
        resultado.acao_executada === "MULTIPLAS_CIDADES" &&
        resultado.cidades_encontradas
      ) {
        console.log("🏙️ Múltiplas cidades encontradas, criando opções...");

        const options = resultado.cidades_encontradas.map((cidade: any) => ({
          id: cidade.id.toString(),
          text: `${cidade.nome}/${cidade.estado}`,
          value: cidade.nome,
          cidadeId: cidade.id,
        }));

        addMessage(resultado.mensagem_inicial, false, undefined, options);
        return;
      }

      // Adiciona resposta da IA
      addMessage(resultado.mensagem_inicial, false);

      // Atualiza contexto se for uma pergunta
      if (resultado.acao_executada === "SOLICITAR_CEP") {
        setContexto({
          aguardandoResposta: true,
          tipoAguardando: "CEP",
          perguntaAnterior: resultado.mensagem_inicial,
        });
      } else if (resultado.acao_executada === "SOLICITAR_LOCAL") {
        setContexto({
          aguardandoResposta: true,
          tipoAguardando: "CIDADE",
          perguntaAnterior: resultado.mensagem_inicial,
        });
      }

      // Se tem dados de CEP, adiciona como mensagem separada
      if (resultado.dados_cep) {
        const cepMessage = `📍 **Endereço:**\n• CEP: ${resultado.dados_cep.cep}\n• Rua: ${resultado.dados_cep.street}\n• Bairro: ${resultado.dados_cep.neighborhood}\n• Cidade: ${resultado.dados_cep.city}\n• Estado: ${resultado.dados_cep.state}`;
        addMessage(cepMessage, false, {
          tipo: "cep",
          dados: resultado.dados_cep,
        });
      }

      // Se tem dados de clima, adiciona como mensagem separada
      if (resultado.dados_clima) {
        const climaMessage = `🌤️ **Previsão do Tempo:**\n${resultado.dados_clima.clima
          .map(
            (dia: any) =>
              `📅 ${new Date(dia.data).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}: ${dia.condicao_desc} (${dia.min}°C a ${dia.max}°C)`
          )
          .join("\n")}`;
        addMessage(climaMessage, false, {
          tipo: "clima",
          dados: resultado.dados_clima,
        });
      }

      // Adiciona mensagem final se não for uma pergunta
      if (
        resultado.acao_executada !== "SOLICITAR_CEP" &&
        resultado.acao_executada !== "SOLICITAR_LOCAL"
      ) {
        addMessage(resultado.mensagem_final, false);
      }
    } catch (error: any) {
      console.error("Erro no sistema:", error);
      addMessage(
        `❌ ${error.message || "Erro ao processar sua consulta. Tente novamente."}`,
        false
      );

      // Limpa contexto em caso de erro
      setContexto({
        aguardandoResposta: false,
        tipoAguardando: null,
        perguntaAnterior: "",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message: Message) => {
    const isQuestion = message.text.includes("?") && !message.isUser;

    return (
      <div
        key={message.id}
        className={`flex ${message.isUser ? "justify-end" : "justify-start"} mb-4`}
      >
        <div
          className={`flex max-w-[80%] ${message.isUser ? "flex-row-reverse" : "flex-row"} items-start gap-2`}
        >
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.isUser
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {message.isUser ? (
              <User className="w-4 h-4" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
          </div>

          <div
            className={`px-4 py-2 rounded-lg ${
              message.isUser
                ? "bg-blue-500 text-white"
                : isQuestion
                  ? "bg-blue-50 border border-blue-200 text-blue-800"
                  : "bg-gray-100 text-gray-800"
            }`}
          >
            <div className="whitespace-pre-line text-sm">{message.text}</div>

            {/* Renderizar dados estruturados se existirem */}
            {message.data?.tipo === "cep" && (
              <div className="mt-3 p-3 bg-white rounded border">
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium">CEP:</span>
                    <span>{message.data.dados.cep}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Cidade:</span>
                    <span>{message.data.dados.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Estado:</span>
                    <span>{message.data.dados.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Bairro:</span>
                    <span>{message.data.dados.neighborhood}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Rua:</span>
                    <span>{message.data.dados.street}</span>
                  </div>
                </div>
              </div>
            )}

            {message.data?.tipo === "clima" && (
              <div className="mt-3 p-3 bg-white rounded border">
                <div className="grid grid-cols-1 gap-2 text-xs">
                  {message.data.dados.clima
                    .slice(0, 3)
                    .map((dia: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded"
                      >
                        <span className="font-medium">
                          {new Date(dia.data).toLocaleDateString("pt-BR", {
                            weekday: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="text-xs">{dia.condicao_desc}</span>
                        <span className="font-bold">
                          {dia.min}° - {dia.max}°
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Renderizar opções clicáveis se existirem */}
            {message.options && message.options.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-xs text-gray-600 mb-2">
                  Escolha uma opção:
                </div>
                <div className="max-h-64 overflow-y-auto pr-2 space-y-2 city-options-scroll">
                  {message.options.map((option) => (
                    <Button
                      key={option.id}
                      variant="outline"
                      size="sm"
                      className="justify-start text-left h-auto py-2 px-3 w-full"
                      onClick={() => handleOptionClick(option)}
                      disabled={isLoading}
                    >
                      <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="text-sm">{option.text}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <Card className="rounded-none border-b bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Deco"
              className="w-8 h-8 object-contain"
            />
            <div>
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Search className="h-5 w-5" />
                Consulta Inteligente de CEP & Previsão
              </CardTitle>
              <CardDescription className="text-slate-400">
                Converse naturalmente sobre CEPs e previsão do tempo
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(renderMessage)}

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Bot className="w-4 h-4 text-gray-700" />
              </div>
              <div className="px-4 py-2 rounded-lg bg-gray-100">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-600">Digitando...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <Card className="rounded-none border-t">
        <CardContent className="p-4">
          {contexto.aguardandoResposta && (
            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              💡 Aguardando:{" "}
              {contexto.tipoAguardando === "CEP" ? "CEP" : "cidade"} para{" "}
              {contexto.tipoAguardando === "CEP"
                ? "endereço"
                : "previsão do tempo"}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                contexto.aguardandoResposta
                  ? contexto.tipoAguardando === "CEP"
                    ? "Digite o CEP (ex: 01310-100)..."
                    : "Digite a cidade (ex: São Paulo)..."
                  : "Digite sua mensagem..."
              }
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
