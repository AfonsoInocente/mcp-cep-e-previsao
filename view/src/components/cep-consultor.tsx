import { useState } from "react";
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
import { ACTIONS } from "../../../common/consts/constants.ts";
import { Loader2, MapPin, Cloud, Search } from "lucide-react";

export function CepConsultor() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const systemMutation = useSistemaInteligente();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const result = await systemMutation.mutateAsync({
        userInput: input.trim(),
      });

      setResult(result);
    } catch (error) {
      console.error("Erro no sistema:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Consulta Inteligente de CEP e Previsão
          </CardTitle>
          <CardDescription>
            Digite sua consulta e eu decido automaticamente se você quer apenas
            o endereço ou também a previsão do tempo!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="input" className="text-sm font-medium">
                O que você quer saber?
              </label>
              <Input
                id="input"
                type="text"
                placeholder="Ex: 01310-100, Como está o clima em São Paulo?, Quero saber o endereço, Previsão do tempo"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="text-base"
              />
            </div>
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Consultar
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {systemMutation.isPending && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processando sua consulta...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          {/* Mensagem Inicial */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {result.action === ACTIONS.REQUEST_ZIP_CODE ||
                result.action === ACTIONS.REQUEST_LOCATION
                  ? "🤖 Pergunta"
                  : "🤖 Análise Inteligente"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`p-4 rounded-lg ${
                  result.action === ACTIONS.REQUEST_ZIP_CODE ||
                  result.action === ACTIONS.REQUEST_LOCATION
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-gray-50 border border-gray-200"
                }`}
              >
                <p
                  className={`${
                    result.action === ACTIONS.REQUEST_ZIP_CODE ||
                    result.action === ACTIONS.REQUEST_LOCATION
                      ? "text-blue-800 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {result.initialMessage}
                </p>
                {(result.action === ACTIONS.REQUEST_ZIP_CODE ||
                  result.action === ACTIONS.REQUEST_LOCATION) && (
                  <p className="text-sm text-blue-600 mt-2">
                    💡 Digite sua resposta no campo acima e clique em
                    "Consultar" novamente!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dados do CEP */}
          {result.zipCodeData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Informações do Endereço
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      CEP
                    </p>
                    <p className="text-lg font-semibold">
                      {result.zipCodeData.cep}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Estado
                    </p>
                    <p className="text-lg">{result.zipCodeData.state}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Cidade
                    </p>
                    <p className="text-lg">{result.zipCodeData.city}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Bairro
                    </p>
                    <p className="text-lg">{result.zipCodeData.neighborhood}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Rua
                    </p>
                    <p className="text-lg">{result.zipCodeData.street}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dados do Clima */}
          {result.weatherData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Previsão do Tempo
                </CardTitle>
                <CardDescription>
                  {result.weatherData.cidade}, {result.weatherData.estado} -
                  Atualizado em{" "}
                  {new Date(result.weatherData.atualizado_em).toLocaleString(
                    "pt-BR"
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.weatherData.clima.map((day: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <p className="font-semibold text-sm">
                        {new Date(day.data).toLocaleDateString("pt-BR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {day.condicao_desc}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-lg font-bold">{day.min}°</span>
                        <span className="text-lg">{day.max}°</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        UV: {day.indice_uv}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mensagem Final */}
          <Card>
            <CardContent className="pt-6">
              <div className="prose prose-sm max-w-none">
                <div
                  className="whitespace-pre-line text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: result.finalMessage.replace(/\n/g, "<br>"),
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {systemMutation.isError && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Erro ao processar sua consulta. Tente novamente.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
