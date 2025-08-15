import { useState } from "react";
import { Search, MapPin, Thermometer, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConsultarCepEPrevisao } from "@/lib/hooks";
import { toast } from "sonner";

interface CepResult {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  location_id?: number;
  clima?: Array<{
    condicao: string;
    minima: number;
    maxima: number;
  }>;
}

export function CepConsultor() {
  const [cep, setCep] = useState("");
  const [result, setResult] = useState<CepResult | null>(null);
  const consultarCep = useConsultarCepEPrevisao();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cep.trim()) {
      toast.error("Digite um CEP válido");
      return;
    }

    try {
      const data = await consultarCep.mutateAsync(cep);
      setResult(data);
      toast.success("Consulta realizada com sucesso!");
    } catch (error) {
      // Erro já tratado no hook
      setResult(null);
    }
  };

  const formatCep = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, "");
    // Aplica máscara: 00000-000
    return numbers.replace(/(\d{5})(\d{3})/, "$1-$2");
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatCep(value);
    setCep(formatted);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">Consulta de CEP</h1>
        <p className="text-slate-400">
          Digite um CEP para obter informações do endereço e previsão do tempo
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={cep}
            onChange={handleCepChange}
            placeholder="00000-000"
            maxLength={9}
            className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={consultarCep.isPending}
          />
          <Button
            type="submit"
            disabled={consultarCep.isPending || !cep.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {consultarCep.isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Consultando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Consultar
              </div>
            )}
          </Button>
        </div>
      </form>

      {/* Result */}
      {result && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-6">
          {/* Endereço */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400">
              <MapPin className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Informações do Endereço</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 text-sm">CEP:</span>
                  <p className="text-white font-medium">{result.cep}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-sm">Estado:</span>
                  <p className="text-white font-medium">{result.state}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-sm">Cidade:</span>
                  <p className="text-white font-medium">{result.city}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 text-sm">Bairro:</span>
                  <p className="text-white font-medium">
                    {result.neighborhood}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-sm">Rua:</span>
                  <p className="text-white font-medium">{result.street}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Previsão do Tempo */}
          {result.clima && result.clima.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <Thermometer className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Previsão do Tempo</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.clima.slice(0, 6).map((previsao, index) => (
                  <div
                    key={index}
                    className="bg-slate-700 border border-slate-600 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2 text-slate-300">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Dia {index + 1}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-white font-medium text-sm">
                        {previsao.condicao}
                      </p>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-400">
                          Mín: {previsao.minima}°C
                        </span>
                        <span className="text-red-400">
                          Máx: {previsao.maxima}°C
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {result.clima.length > 6 && (
                <p className="text-slate-400 text-sm text-center">
                  +{result.clima.length - 6} dias adicionais disponíveis
                </p>
              )}
            </div>
          )}

          {/* Mensagem quando não há previsão */}
          {result.location_id && !result.clima && (
            <div className="bg-slate-700 border border-slate-600 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <Thermometer className="w-4 h-4" />
                <span className="text-sm">
                  Previsão do tempo não disponível para esta cidade
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instruções */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-2">Como usar:</h3>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• Digite o CEP no formato 00000-000 ou apenas números</li>
          <li>• O sistema automaticamente limpa caracteres especiais</li>
          <li>• Após a consulta, você receberá informações do endereço</li>
          <li>• Se disponível, também será exibida a previsão do tempo</li>
        </ul>
      </div>
    </div>
  );
}
