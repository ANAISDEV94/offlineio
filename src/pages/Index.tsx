import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Onboarding from "@/components/Onboarding";
import logo from "@/assets/logo.png";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src={logo} alt="offline" className="h-12 mx-auto mb-4 animate-float" />
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
