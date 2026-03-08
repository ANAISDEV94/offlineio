import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Navigate } from "react-router-dom";

const AdminDebug = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sessionResult, setSessionResult] = useState<{
    status: "loading" | "success" | "error";
    email?: string;
    error?: string;
  }>({ status: "loading" });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  let hostname = "-";
  try {
    hostname = new URL(supabaseUrl).hostname;
  } catch {
    hostname = supabaseUrl || "(not set)";
  }

  useEffect(() => {
    const check = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setSessionResult({ status: "error", error: error.message });
        } else {
          setSessionResult({
            status: "success",
            email: data.session?.user?.email ?? "(no session)",
          });
        }
      } catch (e: any) {
        setSessionResult({ status: "error", error: e.message });
      }
    };
    check();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">Admin Debug</h1>
      </div>

      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium">Backend Info</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Hostname</p>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{hostname}</code>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">supabase.auth.getSession()</p>
            {sessionResult.status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : sessionResult.status === "success" ? (
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">✓ Success</Badge>
                <span className="text-sm text-muted-foreground">{sessionResult.email}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">✗ Error</Badge>
                <span className="text-sm text-destructive">{sessionResult.error}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDebug;
