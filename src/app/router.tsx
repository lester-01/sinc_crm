import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ClientDetailPage } from "@/pages/ClientDetailPage";
import { ClientsPage } from "@/pages/ClientsPage";
import { ConversationPage } from "@/pages/ConversationPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DealDetailPage } from "@/pages/DealDetailPage";
import { LoginPage } from "@/pages/LoginPage";
import { PipelinePage } from "@/pages/PipelinePage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "clients", element: <ClientsPage /> },
      { path: "clients/:clientId", element: <ClientDetailPage /> },
      { path: "conversations", element: <ConversationPage /> },
      { path: "pipeline", element: <PipelinePage /> },
      { path: "deals/:dealId", element: <DealDetailPage /> },
    ],
  },
]);
