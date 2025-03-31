
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { ClientAuthProvider } from "@/contexts/client-auth-context";
import { DataProvider } from "@/contexts/data-context";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Tasks from "./pages/Tasks";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ClientLogin from "./pages/ClientLogin";
import NotFound from "./pages/NotFound";
import Layout from "./components/layout/Layout";
import ClientLayout from "./components/client/ClientLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ClientProtectedRoute from "./components/client/ClientProtectedRoute";
import Settings from "./pages/Settings";
import Index from "./pages/Index";

// Client pages
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientTasks from "./pages/client/ClientTasks";
import ClientChat from "./pages/client/ClientChat";
import ClientResources from "./pages/client/ClientResources";
import ClientVideos from "./pages/client/ClientVideos";
import ClientOffers from "./pages/client/ClientOffers";
import ClientProfile from "./pages/client/ClientProfile";

// Admin pages
import AdminChat from "./pages/admin/AdminChat";
import AdminChatWithClient from "./pages/admin/AdminChatWithClient";
import AdminResources from "./pages/admin/AdminResources";
import AdminVideos from "./pages/admin/AdminVideos";
import AdminOffers from "./pages/admin/AdminOffers";

// Create query client with default options to avoid state issues on refresh
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="digitalshopi-theme">
      <AuthProvider>
        <ClientAuthProvider>
          <DataProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Initial route - redirects to appropriate dashboard */}
                <Route path="/" element={<Index />} />
                
                {/* Auth routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/client/login" element={<ClientLogin />} />
                
                {/* Admin Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/clients/:id" element={<ClientDetail />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/admin/chat" element={<AdminChat />} />
                    <Route path="/admin/chat/:clientId" element={<AdminChatWithClient />} />
                    <Route path="/admin/resources" element={<AdminResources />} />
                    <Route path="/admin/videos" element={<AdminVideos />} />
                    <Route path="/admin/offers" element={<AdminOffers />} />
                  </Route>
                </Route>
                
                {/* Client Protected Routes */}
                <Route element={<ClientProtectedRoute />}>
                  <Route element={<ClientLayout />}>
                    <Route path="/client/dashboard" element={<ClientDashboard />} />
                    <Route path="/client/tasks" element={<ClientTasks />} />
                    <Route path="/client/chat" element={<ClientChat />} />
                    <Route path="/client/resources" element={<ClientResources />} />
                    <Route path="/client/videos" element={<ClientVideos />} />
                    <Route path="/client/offers" element={<ClientOffers />} />
                    <Route path="/client/profile" element={<ClientProfile />} />
                  </Route>
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </DataProvider>
        </ClientAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
