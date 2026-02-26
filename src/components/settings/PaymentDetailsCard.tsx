import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Pencil, Check, X, Plus } from "lucide-react";

const CARD_BRANDS = ["Visa", "Mastercard", "Amex", "Discover"];

const PaymentDetailsCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [cardBrand, setCardBrand] = useState("Visa");
  const [lastFour, setLastFour] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [billingName, setBillingName] = useState("");

  const { data: paymentMethod, isLoading } = useQuery({
    queryKey: ["user-payment-method", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_payment_methods" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
  });

  const upsertPayment = useMutation({
    mutationFn: async () => {
      if (!lastFour || lastFour.length !== 4 || !/^\d{4}$/.test(lastFour)) {
        throw new Error("Last 4 digits must be exactly 4 numbers");
      }
      const month = parseInt(expMonth);
      const year = parseInt(expYear);
      if (!month || month < 1 || month > 12) throw new Error("Invalid month");
      if (!year || year < 2025 || year > 2040) throw new Error("Invalid year");
      if (!billingName.trim()) throw new Error("Billing name is required");

      const record = {
        user_id: user!.id,
        card_brand: cardBrand,
        card_last_four: lastFour,
        card_exp_month: month,
        card_exp_year: year,
        billing_name: billingName.trim(),
      };

      if (paymentMethod) {
        const { error } = await supabase
          .from("user_payment_methods" as any)
          .update(record)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_payment_methods" as any)
          .insert(record);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-payment-method", user?.id] });
      setEditing(false);
      toast({ title: "Payment details saved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const startEditing = () => {
    setCardBrand(paymentMethod?.card_brand || "Visa");
    setLastFour(paymentMethod?.card_last_four || "");
    setExpMonth(paymentMethod?.card_exp_month?.toString() || "");
    setExpYear(paymentMethod?.card_exp_year?.toString() || "");
    setBillingName(paymentMethod?.billing_name || "");
    setEditing(true);
  };

  if (isLoading) return null;

  return (
    <Card className="rounded-2xl border-0 shadow-sm glass-card">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Details</p>
          </div>
          {paymentMethod && !editing && (
            <button onClick={startEditing}>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Card Brand</Label>
              <select
                value={cardBrand}
                onChange={e => setCardBrand(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {CARD_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Last 4 Digits</Label>
              <Input
                value={lastFour}
                onChange={e => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="4242"
                className="rounded-xl"
                maxLength={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Exp Month</Label>
                <Input
                  value={expMonth}
                  onChange={e => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  placeholder="03"
                  className="rounded-xl"
                  maxLength={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Exp Year</Label>
                <Input
                  value={expYear}
                  onChange={e => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="2027"
                  className="rounded-xl"
                  maxLength={4}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Billing Name</Label>
              <Input
                value={billingName}
                onChange={e => setBillingName(e.target.value)}
                placeholder="John Doe"
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 rounded-xl" onClick={() => upsertPayment.mutate()} disabled={upsertPayment.isPending}>
                <Check className="h-3 w-3 mr-1" /> Save
              </Button>
              <Button variant="ghost" className="rounded-xl" onClick={() => setEditing(false)}>
                <X className="h-3 w-3 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : paymentMethod ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {paymentMethod.card_brand} ending in {paymentMethod.card_last_four}
            </p>
            <p className="text-xs text-muted-foreground">
              Exp {String(paymentMethod.card_exp_month).padStart(2, "0")}/{paymentMethod.card_exp_year} · {paymentMethod.billing_name}
            </p>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground mb-2">No payment method on file</p>
            <Button size="sm" className="rounded-xl gap-1" onClick={startEditing}>
              <Plus className="h-3 w-3" /> Add Payment Method
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentDetailsCard;
