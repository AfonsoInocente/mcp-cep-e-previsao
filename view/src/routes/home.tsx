import { createRoute, Link, type RootRoute } from "@tanstack/react-router";
import { LogIn, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

function WelcomeContent() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">Consulta de CEP</h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Sistema para consulta de endereços através de CEP e previsão do tempo
        </p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
        <h3 className="text-lg font-medium text-white mb-4">
          Comece sua consulta
        </h3>
        <p className="text-slate-400 mb-6">
          Digite um CEP para obter informações completas do endereço e previsão
          do tempo para a cidade.
        </p>

        <Button
          asChild
          size="lg"
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium"
        >
          <Link to="/cep" className="inline-flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Consultar CEP
          </Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
          <div className="text-blue-400 mb-2">
            <MapPin className="w-8 h-8 mx-auto" />
          </div>
          <h4 className="text-white font-medium mb-2">Endereço Completo</h4>
          <p className="text-sm text-slate-400">
            Obtenha informações detalhadas do endereço através do CEP
          </p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
          <div className="text-green-400 mb-2">
            <User className="w-8 h-8 mx-auto" />
          </div>
          <h4 className="text-white font-medium mb-2">Sem Login</h4>
          <p className="text-sm text-slate-400">
            Acesse todas as funcionalidades sem necessidade de cadastro
          </p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
          <div className="text-yellow-400 mb-2">
            <MapPin className="w-8 h-8 mx-auto" />
          </div>
          <h4 className="text-white font-medium mb-2">Previsão do Tempo</h4>
          <p className="text-sm text-slate-400">
            Receba a previsão do tempo para a cidade do endereço consultado
          </p>
        </div>
      </div>
    </div>
  );
}

function HomePage() {
  return (
    <div className="bg-slate-900 min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Deco"
              className="w-8 h-8 object-contain"
            />
            <div>
              <h1 className="text-xl font-semibold text-white">
                Consulta de CEP
              </h1>
              <p className="text-sm text-slate-400">
                Sistema de consulta de endereços e previsão do tempo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <Link to="/cep" className="inline-flex items-center gap-2">
                <MapPin className="w-3 h-3" />
                Consultar CEP
              </Link>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="min-h-[400px]">
          <WelcomeContent />
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center">
            Sistema de consulta de CEP com previsão do tempo
          </p>
        </div>
      </div>
    </div>
  );
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: "/",
    component: HomePage,
    getParentRoute: () => parentRoute,
  });
