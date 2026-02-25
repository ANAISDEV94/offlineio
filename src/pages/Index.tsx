import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Onboarding from "@/components/Onboarding";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-float text-4xl mb-4">✈️</div>
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Onboarding />;
};

export default Index;
