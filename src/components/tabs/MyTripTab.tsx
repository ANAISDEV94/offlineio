import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, Package, Shield, CalendarDays } from "lucide-react";
import { format } from "date-fns";

interface MyTripTabProps {
  tripId: string;
}

const MyTripTab = ({ tripId }: MyTripTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: myPayment } = useQuery({
    queryKey: ["my-payment", tripId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tripId && !!user?.id,
  });

  const { data: myMembership } = useQuery({
    queryKey: ["my-membership", tripId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_members")
        .select("role")
        .eq("trip_id", tripId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tripId && !!user?.id,
  });

  const { data: packingItems = [] } = useQuery({
    queryKey: ["my-packing", tripId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packing_items")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user!.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!tripId && !!user?.id,
  });

  const togglePacking = useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const { error } = await supabase
        .from("packing_items")
        .update({ is_checked: checked })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-packing", tripId] }),
  });

  if (!user) return null;

  const paidPct =
    myPayment && Number(myPayment.amount) > 0
      ? Math.round((Number(myPayment.amount_paid) / Number(myPayment.amount)) * 100)
      : 0;
  const remaining = myPayment
    ? Math.max(0, Number(myPayment.amount) - Number(myPayment.amount_paid))
    : 0;
  const packedCount = packingItems.filter((i) => i.is_checked).length;

  return (
    <div className="space-y-4">
      {/* My Role */}
      <Card className="rounded-2xl border-0 bg-primary/5 shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">My Role</p>
            <p className="text-xs text-muted-foreground capitalize">{myMembership?.role || "Member"}</p>
          </div>
        </CardContent>
      </Card>

      {/* My Payment */}
      <Card className="rounded-2xl border-0 bg-card shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-primary" /> My Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {myPayment ? (
            <div className="space-y-3">
              <Progress value={paidPct} className="h-2.5 rounded-full" />
              <p className="text-xs text-muted-foreground">{paidPct}% paid</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Paid</p>
                  <p className="font-semibold text-foreground">${Number(myPayment.amount_paid).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Remaining</p>
                  <p className="font-semibold text-foreground">${remaining.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total Owed</p>
                  <p className="font-semibold text-foreground">${Number(myPayment.amount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Plan</p>
                  <p className="font-semibold text-foreground capitalize">{myPayment.installment_plan}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border">
                {myPayment.next_due_date && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    Next due: {format(new Date(myPayment.next_due_date), "MMM d, yyyy")}
                  </div>
                )}
                <Badge variant={myPayment.auto_pay ? "default" : "outline"} className="text-[10px]">
                  {myPayment.auto_pay ? "Auto-pay ON" : "Auto-pay OFF"}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No payment plan set up yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* My Packing List */}
      <Card className="rounded-2xl border-0 bg-card shadow-sm">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-primary" /> My Packing List
            </CardTitle>
            {packingItems.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {packedCount}/{packingItems.length} packed
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {packingItems.length > 0 ? (
            <div className="space-y-2">
              {packingItems.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2.5 py-1 cursor-pointer"
                >
                  <Checkbox
                    checked={item.is_checked}
                    onCheckedChange={(checked) =>
                      togglePacking.mutate({ id: item.id, checked: !!checked })
                    }
                  />
                  <span
                    className={`text-sm ${
                      item.is_checked
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {item.item_name}
                  </span>
                  {item.is_suggested && (
                    <Badge variant="outline" className="text-[9px] ml-auto">
                      Suggested
                    </Badge>
                  )}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No packing items yet. Add some in the Hype tab!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyTripTab;
