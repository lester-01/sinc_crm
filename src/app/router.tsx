import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { RoleHomeRedirect } from "@/features/auth/RoleHomeRedirect";
import { ClientDetailPage } from "@/pages/ClientDetailPage";
import { ClientsPage } from "@/pages/ClientsPage";
import { ConversationPage } from "@/pages/ConversationPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DealDetailPage } from "@/pages/DealDetailPage";
import { LoginPage } from "@/pages/LoginPage";
import { PipelinePage } from "@/pages/PipelinePage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <AppShell />,
        children: [
          { index: true, element: <RoleHomeRedirect /> },
          { path: "dashboard", element: <DashboardPage /> },
          { path: "clients", element: <ClientsPage /> },
          { path: "clients/:clientId", element: <ClientDetailPage /> },
          { path: "conversations", element: <ConversationPage /> },
          { path: "pipeline", element: <PipelinePage /> },
          { path: "deals/:dealId", element: <DealDetailPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
