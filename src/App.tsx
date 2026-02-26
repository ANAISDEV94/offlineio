import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CreateTrip from "./pages/CreateTrip";
import TripDashboard from "./pages/TripDashboard";
import TripPreview from "./pages/TripPreview";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import AdminDebug from "./pages/AdminDebug";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/create-trip" element={<CreateTrip />} />
          <Route path="/trip/preview/:tripId" element={<TripPreview />} />
          <Route path="/trip/:tripId" element={<TripDashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin/debug" element={<AdminDebug />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
