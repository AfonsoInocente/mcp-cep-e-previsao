import { createRoute, type RootRoute } from "@tanstack/react-router";
import { CepConsultor } from "@/components/cep-consultor";

function CepPage() {
  return (
    <div className="bg-slate-900 min-h-screen flex items-center justify-center p-6">
      <CepConsultor />
    </div>
  );
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: "/cep",
    component: CepPage,
    getParentRoute: () => parentRoute,
  });
