import { createRoute, type RootRoute } from "@tanstack/react-router";
import { ChatConsultor } from "@/components/chat-consultor";

function ChatPage() {
  return <ChatConsultor />;
}

// Export function that creates the route
export default (parentRoute: RootRoute) =>
  createRoute({
    path: "/chat",
    component: ChatPage,
    getParentRoute: () => parentRoute,
  });
