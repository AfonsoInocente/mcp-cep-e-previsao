import { createRoute, type RootRoute } from "@tanstack/react-router";
import { ChatConsultor } from "@/components/chat-consultor";

function HomeContent() {
  return <ChatConsultor />;
}

function HomePage() {
  return (
    <div className="bg-slate-900 min-h-screen">
      <HomeContent />
    </div>
  );
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: "/",
    component: HomePage,
    getParentRoute: () => parentRoute,
  });
