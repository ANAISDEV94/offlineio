import { useAuth } from "@/hooks/useAuth";
import Onboarding from "@/components/Onboarding";
import LandingPage from "@/pages/LandingPage";
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
    return <LandingPage />;
  }

  return <Onboarding />;
};

export default Index;
