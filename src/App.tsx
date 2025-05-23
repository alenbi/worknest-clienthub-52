
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
import ClientRequests from "./pages/client/ClientRequests";
import ClientWeeklyProducts from "./pages/client/ClientWeeklyProducts";

// Admin pages
import AdminChat from "./pages/admin/AdminChat";
import AdminChatWithClient from "./pages/admin/AdminChatWithClient";
import AdminResources from "./pages/admin/AdminResources";
import AdminVideos from "./pages/admin/AdminVideos";
import AdminOffers from "./pages/admin/AdminOffers";
import AdminUpdates from "./pages/admin/AdminUpdates";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminWeeklyProducts from "./pages/admin/AdminWeeklyProducts";

// Create query client with better error handling and optimizations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 60 * 1000, // Keep data fresh for 1 minute to reduce flickering
      gcTime: 5 * 60 * 1000, // Cache for 5 minutes (previously cacheTime)
    },
  },
});

// Add global error handler using the correct event types
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'observerResultsUpdated' && event.query.state.error) {
    console.error("Query error:", event.query.state.error);
  }
});

// Fixed the issue with provider nesting order to prevent circular dependency
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="digitalshopi-theme">
      <AuthProvider>
        <TooltipProvider>
          <ClientAuthProvider>
            <DataProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Initial route - redirects to appropriate dashboard */}
                <Route path="/" element={<Index />} />
                
                {/* Auth routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/client/login" element={<ClientLogin />} />
                
                {/* Admin Protected Routes - Blocks client access completely */}
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
                    <Route path="/admin/weekly-products" element={<AdminWeeklyProducts />} />
                    <Route path="/admin/requests" element={<AdminRequests />} />
                    <Route path="/updates" element={<Navigate to="/admin/updates" replace />} />
                  </Route>
                </Route>
                
                {/* Client Protected Routes */}
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
                    <Route path="/client/weekly-products" element={<ClientWeeklyProducts />} />
                    <Route path="/client/requests" element={<ClientRequests />} />
                  </Route>
                </Route>
                
                {/* Catch-all routes - direct clients to client dashboard, others to not found */}
                <Route path="/dashboard/*" element={<Navigate to="/client/dashboard" replace />} />
                <Route path="/clients/*" element={<Navigate to="/client/dashboard" replace />} />
                <Route path="/tasks/*" element={<Navigate to="/client/dashboard" replace />} />
                <Route path="/admin/*" element={<Navigate to="/client/dashboard" replace />} />
                <Route path="/settings/*" element={<Navigate to="/client/dashboard" replace />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </DataProvider>
          </ClientAuthProvider>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
