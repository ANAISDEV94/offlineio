import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTripDashboard } from "@/hooks/useTripDashboard";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Lock, History, LogOut, Pencil, Check, X, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import PaymentDetailsCard from "@/components/settings/PaymentDetailsCard";
import TripDocumentsCard from "@/components/TripDocumentsCard";

interface SettingsTabProps {
  tripId: string;
}

const SettingsTab = ({ tripId }: SettingsTabProps) => {
  const { user, signOut } = useAuth();
  const { dashboard } = useTripDashboard(tripId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const { data: myProfile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: paymentHistory = [] } = useQuery({
    queryKey: ["payment-history-all", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_history")
        .select("*, trips:trip_id(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updateDisplayName = useMutation({
    mutationFn: async () => {
      if (!newDisplayName.trim() || !user) return;
      const { error } = await supabase.from("profiles").update({ display_name: newDisplayName.trim() }).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["trip-members", tripId] });
      setEditingName(false);
      toast({ title: "Name updated" });
    },
  });

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated successfully" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Failed to update password", description: err.message, variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile Section */}
      <Card className="rounded-2xl border-0 shadow-sm glass-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Profile</p>
          </div>

          {/* Display Name */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium">Display Name</p>
              {editingName ? (
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newDisplayName}
                    onChange={e => setNewDisplayName(e.target.value)}
                    className="rounded-xl text-sm h-8 w-40"
                    placeholder="Your name"
                  />
                  <Button size="sm" className="h-8 rounded-xl" onClick={() => updateDisplayName.mutate()}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 rounded-xl" onClick={() => setEditingName(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{myProfile?.display_name || "Not set"}</p>
              )}
            </div>
            {!editingName && (
              <button onClick={() => { setEditingName(true); setNewDisplayName(myProfile?.display_name || ""); }}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
              </button>
            )}
          </div>

          {/* Email */}
          <div>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.email || "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className="rounded-2xl border-0 shadow-sm glass-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Security</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs">Confirm Password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="rounded-xl"
              />
            </div>
            <Button
              className="w-full rounded-xl"
              onClick={handlePasswordChange}
              disabled={changingPassword || !newPassword || !confirmPassword}
            >
              {changingPassword ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trip Documents */}
      <TripDocumentsCard tripId={tripId} isOrganizer={dashboard?.current_user?.role === "organizer"} />

      {/* Payment Details */}
      <PaymentDetailsCard />

      {/* Payment History */}
      <Card className="rounded-2xl border-0 shadow-sm glass-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment History</p>
          </div>

          {paymentHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No payments yet</p>
          ) : (
            paymentHistory.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">${Number(h.amount).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {h.trips?.name || "Trip"} · {format(new Date(h.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <Badge className="text-[10px] bg-accent/20 text-foreground border-0">{h.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card className="rounded-2xl border-0 shadow-sm glass-card">
        <CardContent className="p-4">
          <Button variant="outline" className="w-full rounded-xl gap-2" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTab;
