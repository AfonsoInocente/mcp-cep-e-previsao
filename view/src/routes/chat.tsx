import { createRoute, type RootRoute } from "@tanstack/react-router";
import { ChatConsultor } from "../components/chat-consultor.tsx";

function ChatPage() {
  return (
    <div className="bg-slate-900 min-h-screen flex items-center justify-center p-6">
      <ChatConsultor />
    </div>
  );
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: "/chat",
    component: ChatPage,
    getParentRoute: () => parentRoute,
  });
