import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Plane, Sparkles, Loader2 } from "lucide-react";
import { vibeOptions } from "@/lib/sample-data";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const steps = ["Destination", "Dates", "Details", "Vibe", "Budget"];

const CreateTrip = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    destination: "",
    startDate: "",
    endDate: "",
    groupSize: 4,
    vibe: "luxury",
    perPersonBudget: 3000,
    paymentDeadline: "",
  });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const tripName = form.name || `${form.destination} Trip`;
      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .insert({
          name: tripName,
          destination: form.destination,
          start_date: form.startDate,
          end_date: form.endDate,
          group_size: form.groupSize,
          vibe: form.vibe,
          per_person_budget: form.perPersonBudget,
          payment_deadline: form.paymentDeadline || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Add creator as organizer
      await supabase.from("trip_members").insert({
        trip_id: trip.id,
        user_id: user.id,
        role: "organizer",
      });

      // Insert default budget categories
      const defaultCategories = ["Hotel", "Flights", "Activities", "Food", "Buffer"];
      await supabase.from("budget_categories").insert(
        defaultCategories.map((name) => ({
          trip_id: trip.id,
          name,
          amount: 0,
        }))
      );

      toast({
        title: "Trip created! 🎉",
        description: `${tripName} is ready. Time to invite the squad!`,
      });
      navigate(`/trip/${trip.id}`);
    } catch (err: any) {
      toast({ title: "Oops!", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const canNext = () => {
    switch (step) {
      case 0: return form.destination.trim().length > 0;
      case 1: return form.startDate && form.endDate;
      case 2: return form.groupSize > 1;
      case 3: return form.vibe;
      case 4: return form.perPersonBudget > 0;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 flex items-center gap-3">
        <button onClick={() => step > 0 ? setStep(step - 1) : navigate("/")} className="text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-display font-bold">Create Your Trip</h1>
      </header>

      {/* Progress */}
      <div className="px-4 mb-6">
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Step {step + 1} of {steps.length} — {steps[step]}</p>
      </div>

      <div className="px-4 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <span className="text-4xl">🌍</span>
                  <h2 className="text-2xl font-display font-bold mt-3">Where are you going?</h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Trip Name</Label>
                    <Input
                      placeholder="Italy Girlies Trip 2026"
                      value={form.name}
                      onChange={e => update("name", e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Destination</Label>
                    <Input
                      placeholder="Rome, Italy 🇮🇹"
                      value={form.destination}
                      onChange={e => update("destination", e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <span className="text-4xl">📅</span>
                  <h2 className="text-2xl font-display font-bold mt-3">When's the trip?</h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={form.startDate} onChange={e => update("startDate", e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={form.endDate} onChange={e => update("endDate", e.target.value)} className="rounded-xl" />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <span className="text-4xl">👯‍♀️</span>
                  <h2 className="text-2xl font-display font-bold mt-3">How many girlies?</h2>
                </div>
                <div className="space-y-2">
                  <Label>Group Size</Label>
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="rounded-xl" onClick={() => update("groupSize", Math.max(2, form.groupSize - 1))}>−</Button>
                    <span className="text-3xl font-bold text-foreground w-12 text-center">{form.groupSize}</span>
                    <Button variant="outline" size="icon" className="rounded-xl" onClick={() => update("groupSize", Math.min(20, form.groupSize + 1))}>+</Button>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <span className="text-4xl">✨</span>
                  <h2 className="text-2xl font-display font-bold mt-3">What's the vibe?</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {vibeOptions.map(v => (
                    <Card
                      key={v.value}
                      className={`cursor-pointer border-2 transition-all ${
                        form.vibe === v.value
                          ? "border-primary shadow-lg shadow-primary/20"
                          : "border-transparent hover:border-muted"
                      }`}
                      onClick={() => update("vibe", v.value)}
                    >
                      <CardContent className="p-4 text-center">
                        <span className="text-2xl">{v.label.split(" ")[1]}</span>
                        <p className="text-sm font-medium mt-1">{v.label.split(" ")[0]}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <span className="text-4xl">💰</span>
                  <h2 className="text-2xl font-display font-bold mt-3">Budget per person</h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Per Person Budget ($)</Label>
                    <Input
                      type="number"
                      value={form.perPersonBudget}
                      onChange={e => update("perPersonBudget", Number(e.target.value))}
                      className="rounded-xl text-center text-2xl font-bold h-14"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Deadline</Label>
                    <Input type="date" value={form.paymentDeadline} onChange={e => update("paymentDeadline", e.target.value)} className="rounded-xl" />
                  </div>
                  <Card className="bg-muted border-0">
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">Total trip budget</p>
                      <p className="text-2xl font-bold text-foreground">${(form.perPersonBudget * form.groupSize).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{form.groupSize} people × ${form.perPersonBudget.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8">
          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="w-full rounded-xl h-12 text-base font-semibold"
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={!canNext() || creating}
              className="w-full rounded-xl h-12 text-base font-semibold"
            >
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {creating ? "Creating..." : "Create Trip ✨"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateTrip;
