import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useSistemaInteligente } from "../lib/hooks";
import { Loader2, MapPin, Cloud, Search } from "lucide-react";

export function CepConsultor() {
  const [entrada, setEntrada] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sistemaMutation = useSistemaInteligente();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entrada.trim()) return;

    setIsLoading(true);
    setResultado(null);

    try {
      const resultado = await sistemaMutation.mutateAsync({
        entrada_usuario: entrada.trim(),
      });

      setResultado(resultado);
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
            Digite sua consulta e eu decido automaticamente se você quer apenas o endereço ou também a previsão do tempo!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="entrada" className="text-sm font-medium">
                O que você quer saber?
              </label>
              <Input
                id="entrada"
                type="text"
                placeholder="Ex: CEP 01310-100, Como está o clima em São Paulo?, Previsão do tempo para 01310-100"
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
                disabled={isLoading}
                className="text-base"
              />
            </div>
            <Button type="submit" disabled={isLoading || !entrada.trim()}>
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

      {sistemaMutation.isPending && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processando sua consulta...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {resultado && (
        <div className="space-y-4">
          {/* Mensagem Inicial */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🤖 Análise Inteligente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{resultado.mensagem_inicial}</p>
            </CardContent>
          </Card>

          {/* Dados do CEP */}
          {resultado.dados_cep && (
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
                    <p className="text-sm font-medium text-muted-foreground">CEP</p>
                    <p className="text-lg font-semibold">{resultado.dados_cep.cep}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estado</p>
                    <p className="text-lg">{resultado.dados_cep.state}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cidade</p>
                    <p className="text-lg">{resultado.dados_cep.city}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bairro</p>
                    <p className="text-lg">{resultado.dados_cep.neighborhood}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Rua</p>
                    <p className="text-lg">{resultado.dados_cep.street}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dados do Clima */}
          {resultado.dados_clima && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Previsão do Tempo
                </CardTitle>
                <CardDescription>
                  {resultado.dados_clima.cidade}, {resultado.dados_clima.estado} - 
                  Atualizado em {new Date(resultado.dados_clima.atualizado_em).toLocaleString('pt-BR')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resultado.dados_clima.clima.map((dia: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <p className="font-semibold text-sm">
                        {new Date(dia.data).toLocaleDateString('pt-BR', { 
                          weekday: 'short', 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{dia.condicao_desc}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-lg font-bold">{dia.min}°</span>
                        <span className="text-lg">{dia.max}°</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        UV: {dia.indice_uv}
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
                    __html: resultado.mensagem_final.replace(/\n/g, '<br>') 
                  }} 
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {sistemaMutation.isError && (
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
