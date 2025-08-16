import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useSistemaInteligente } from "../lib/hooks.ts";
import { ACTIONS, TOOL_IDS } from "../../../common/types/constants.ts";
import { client } from "../lib/rpc.ts";
import { Loader2, MapPin, Search, Send, User, Bot } from "lucide-react";

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
  const [context, setContext] = useState<{
    waitingForResponse: boolean;
    waitingType: "ZIP_CODE" | "CITY" | null;
    previousQuestion: string;
  }>({
    waitingForResponse: false,
    waitingType: null,
    previousQuestion: "",
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const systemMutation = useSistemaInteligente();

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

        const forecastData = await (client as any)[TOOL_IDS.WEATHER_FORECAST]({
          cityCode: option.cidadeId,
        });

        if (forecastData.weather && forecastData.weather.length > 0) {
          const weatherMessage = `🌤️ **Previsão do Tempo para ${option.text}:**\n${forecastData.weather
            .map(
              (day: any) =>
                `📅 ${new Date(day.date).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}: ${day.conditionDescription} (${day.minimum}°C a ${day.maximum}°C)`
            )
            .join("\n")}`;

          addMessage(weatherMessage, false, {
            type: "weather",
            data: forecastData,
          });
        } else {
          addMessage(
            `⚠️ Previsão do tempo não disponível para ${option.text}.`,
            false
          );
        }
      } else {
        // Se não tem cidadeId, processa como entrada normal
        const result = await systemMutation.mutateAsync({
          userInput: option.value,
        });

        addMessage(result.initialMessage, false);

        if (result.zipCodeData) {
          const zipCodeMessage = `📍 **Endereço:**\n• CEP: ${result.zipCodeData.zipcode}\n• Rua: ${result.zipCodeData.street}\n• Bairro: ${result.zipCodeData.neighborhood}\n• Cidade: ${result.zipCodeData.city}\n• Estado: ${result.zipCodeData.state}`;
          addMessage(zipCodeMessage, false, {
            type: "zipCode",
            data: result.zipCodeData,
          });
        }

        if (
          result.weatherData &&
          result.weatherData.weather &&
          result.weatherData.weather.length > 0
        ) {
          const weatherMessage = `🌤️ **Previsão do Tempo:**\n${result.weatherData.weather
            .map(
              (day: any) =>
                `📅 ${new Date(day.date).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}: ${day.conditionDescription} (${day.minimum}°C a ${day.maximum}°C)`
            )
            .join("\n")}`;
          addMessage(weatherMessage, false, {
            type: "weather",
            data: result.weatherData,
          });
        }

        if (
          result.action !== ACTIONS.REQUEST_ZIP_CODE &&
          result.action !== ACTIONS.REQUEST_LOCATION
        ) {
          addMessage(result.finalMessage, false);
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
      let processedInput = userInput;

      // Se está aguardando resposta, processa com contexto
      if (context.waitingForResponse) {
        if (context.waitingType === "ZIP_CODE") {
          // Se está aguardando CEP, adiciona contexto
          processedInput = `CEP ${userInput}`;
        } else if (context.waitingType === "CITY") {
          // Se está aguardando cidade, adiciona contexto
          processedInput = `previsão do tempo em ${userInput}`;
        }

        // Limpa o contexto após usar
        setContext({
          waitingForResponse: false,
          waitingType: null,
          previousQuestion: "",
        });
      }

      console.log("🔍 Processando entrada:", processedInput);

      const result = await systemMutation.mutateAsync({
        userInput: processedInput,
      });

      console.log("✅ Resultado recebido:", result);

      // Verifica se há múltiplas cidades para mostrar opções
      if (result.action === ACTIONS.MULTIPLE_CITIES && result.citiesFound) {
        console.log("🏙️ Múltiplas cidades encontradas, criando opções...");

        const options = result.citiesFound.map((city: any) => ({
          id: city.id.toString(),
          text: `${city.name}/${city.state}`,
          value: city.name,
          cidadeId: city.id,
        }));

        addMessage(result.initialMessage, false, undefined, options);
        return;
      }

      // Adiciona resposta da IA
      addMessage(result.initialMessage, false);

      // Atualiza contexto se for uma pergunta
      if (result.action === ACTIONS.REQUEST_ZIP_CODE) {
        setContext({
          waitingForResponse: true,
          waitingType: "ZIP_CODE",
          previousQuestion: result.initialMessage,
        });
      } else if (result.action === ACTIONS.REQUEST_LOCATION) {
        setContext({
          waitingForResponse: true,
          waitingType: "CITY",
          previousQuestion: result.initialMessage,
        });
      }

      // Se tem dados de CEP, adiciona como mensagem separada
      if (result.zipCodeData) {
        const zipCodeMessage = `📍 **Endereço:**\n• CEP: ${result.zipCodeData.zipcode}\n• Rua: ${result.zipCodeData.street}\n• Bairro: ${result.zipCodeData.neighborhood}\n• Cidade: ${result.zipCodeData.city}\n• Estado: ${result.zipCodeData.state}`;
        addMessage(zipCodeMessage, false, {
          type: "zipCode",
          data: result.zipCodeData,
        });
      }

      // Se tem dados de clima, adiciona como mensagem separada
      if (
        result.weatherData &&
        result.weatherData.weather &&
        result.weatherData.weather.length > 0
      ) {
        const weatherMessage = `🌤️ **Previsão do Tempo:**\n${result.weatherData.weather
          .map(
            (day: any) =>
              `📅 ${new Date(day.date).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}: ${day.conditionDescription} (${day.minimum}°C a ${day.maximum}°C)`
          )
          .join("\n")}`;
        addMessage(weatherMessage, false, {
          type: "weather",
          data: result.weatherData,
        });
      }

      // Adiciona mensagem final se não for uma pergunta
      if (
        result.action !== ACTIONS.REQUEST_ZIP_CODE &&
        result.action !== ACTIONS.REQUEST_LOCATION
      ) {
        addMessage(result.finalMessage, false);
      }
    } catch (error: any) {
      console.error("Erro no sistema:", error);
      addMessage(
        `❌ ${error.message || "Erro ao processar sua consulta. Tente novamente."}`,
        false
      );

      // Limpa contexto em caso de erro
      setContext({
        waitingForResponse: false,
        waitingType: null,
        previousQuestion: "",
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
            {message.data?.type === "zipCode" && (
              <div className="mt-3 p-3 bg-white rounded border">
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium">CEP:</span>
                    <span>{message.data.data.zipcode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Cidade:</span>
                    <span>{message.data.data.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Estado:</span>
                    <span>{message.data.data.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Bairro:</span>
                    <span>{message.data.data.neighborhood}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Rua:</span>
                    <span>{message.data.data.street}</span>
                  </div>
                </div>
              </div>
            )}

            {message.data?.type === "weather" &&
              message.data.data.weather &&
              message.data.data.weather.length > 0 && (
                <div className="mt-3 p-3 bg-white rounded border">
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {message.data.data.weather
                      .slice(0, 3)
                      .map((day: any, index: number) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded"
                        >
                          <span className="font-medium">
                            {new Date(day.date).toLocaleDateString("pt-BR", {
                              weekday: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="text-xs">
                            {day.conditionDescription}
                          </span>
                          <span className="font-bold">
                            {day.minimum}° - {day.maximum}°
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
                Consulta Inteligente de CEP & Previsão do Tempo
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
          {context.waitingForResponse && (
            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              💡 Aguardando:{" "}
              {context.waitingType === "ZIP_CODE" ? "CEP" : "cidade"} para{" "}
              {context.waitingType === "ZIP_CODE"
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
                context.waitingForResponse
                  ? context.waitingType === "ZIP_CODE"
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
