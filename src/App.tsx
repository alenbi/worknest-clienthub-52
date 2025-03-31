
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
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
import ClientAddTask from "./pages/client/ClientAddTask";
import ClientChat from "./pages/client/ClientChat";
import ClientResources from "./pages/client/ClientResources";
import ClientVideos from "./pages/client/ClientVideos";
import ClientOffers from "./pages/client/ClientOffers";
import ClientProfile from "./pages/client/ClientProfile";
import ClientUpdates from "./pages/client/ClientUpdates";

// Admin pages
import AdminChat from "./pages/admin/AdminChat";
import AdminChatWithClient from "./pages/admin/AdminChatWithClient";
import AdminResources from "./pages/admin/AdminResources";
import AdminVideos from "./pages/admin/AdminVideos";
import AdminOffers from "./pages/admin/AdminOffers";
import AdminUpdates from "./pages/admin/AdminUpdates";

// Create query client with better error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

// Add global error handler using the correct event types
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'observerResultsUpdated' && event.query.state.error) {
    console.error("Query error:", event.query.state.error);
  }
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="digitalshopi-theme">
      <AuthProvider>
        <DataProvider>
          <ClientAuthProvider>
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
                    <Route path="/admin/updates" element={<AdminUpdates />} />
                    <Route path="/updates" element={<Navigate to="/admin/updates" replace />} />
                  </Route>
                </Route>
                
                {/* Client Protected Routes - Block access to admin routes and forcefully redirect */}
                <Route element={<ClientProtectedRoute />}>
                  <Route element={<ClientLayout />}>
                    <Route path="/client/dashboard" element={<ClientDashboard />} />
                    <Route path="/client/tasks" element={<ClientTasks />} />
                    <Route path="/client/tasks/add" element={<ClientAddTask />} />
                    <Route path="/client/chat" element={<ClientChat />} />
                    <Route path="/client/resources" element={<ClientResources />} />
                    <Route path="/client/videos" element={<ClientVideos />} />
                    <Route path="/client/offers" element={<ClientOffers />} />
                    <Route path="/client/profile" element={<ClientProfile />} />
                    <Route path="/client/updates" element={<ClientUpdates />} />
                  </Route>
                </Route>
                
                {/* Catch-all admin routes when accessed by client - redirect to client dashboard */}
                <Route path="/dashboard/*" element={<Navigate to="/client/dashboard" replace />} />
                <Route path="/clients/*" element={<Navigate to="/client/dashboard" replace />} />
                <Route path="/tasks/*" element={<Navigate to="/client/tasks" replace />} />
                <Route path="/admin/*" element={<Navigate to="/client/dashboard" replace />} />
                <Route path="/settings/*" element={<Navigate to="/client/dashboard" replace />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </ClientAuthProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
