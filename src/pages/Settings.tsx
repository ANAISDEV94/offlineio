import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [pingStatus, setPingStatus] = useState<"loading" | "connected" | "error">("loading");
  const [sessionStatus, setSessionStatus] = useState<"loading" | "active" | "none" | "error">("loading");

  useEffect(() => {
    const checkConnection = async () => {
      // Ping: try a lightweight query
      try {
        const { error } = await supabase.from("profiles").select("id").limit(1);
        setPingStatus(error ? "error" : "connected");
      } catch {
        setPingStatus("error");
      }

      // Auth session check
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setSessionStatus("error");
        } else {
          setSessionStatus(data.session ? "active" : "none");
        }
      } catch {
        setSessionStatus("error");
      }
    };

    checkConnection();
  }, []);

  const StatusIcon = ({ ok }: { ok: boolean }) =>
    ok ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <XCircle className="h-5 w-5 text-destructive" />;

  return (
    <div className="min-h-screen bg-background p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>

      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium">Backend Connection</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {/* Database Ping */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Database reachable</span>
            {pingStatus === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <div className="flex items-center gap-2">
                <StatusIcon ok={pingStatus === "connected"} />
                <Badge variant={pingStatus === "connected" ? "default" : "destructive"} className="text-xs">
                  {pingStatus === "connected" ? "Connected" : "Unreachable"}
                </Badge>
              </div>
            )}
          </div>

          {/* Auth Session */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Auth session</span>
            {sessionStatus === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <div className="flex items-center gap-2">
                <StatusIcon ok={sessionStatus === "active"} />
                <Badge
                  variant={sessionStatus === "active" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {sessionStatus === "active" ? "Active" : sessionStatus === "none" ? "No session" : "Error"}
                </Badge>
              </div>
            )}
          </div>

          {/* Env vars configured */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">VITE_SUPABASE_URL</span>
            <Badge variant={import.meta.env.VITE_SUPABASE_URL ? "default" : "destructive"} className="text-xs">
              {import.meta.env.VITE_SUPABASE_URL ? "Set" : "Missing"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">VITE_SUPABASE_PUBLISHABLE_KEY</span>
            <Badge variant={import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? "default" : "destructive"} className="text-xs">
              {import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? "Set" : "Missing"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {user && (
        <p className="text-xs text-muted-foreground text-center">
          Signed in as {user.email}
        </p>
      )}
    </div>
  );
};

export default Settings;
