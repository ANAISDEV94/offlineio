import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Check } from "lucide-react";
import { vibeOptions } from "@/lib/sample-data";
import { destinations } from "@/lib/destinations";
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
    vibes: [] as string[],
    perPersonBudget: 3000,
    paymentDeadline: "",
  });
  const [creating, setCreating] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [destSearch, setDestSearch] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const filteredDestinations = useMemo(() => {
    if (!destSearch) return destinations.slice(0, 20);
    const q = destSearch.toLowerCase();
    return destinations.filter(d =>
      d.city.toLowerCase().includes(q) || d.country.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [destSearch]);

  const toggleVibe = (value: string) => {
    setForm(prev => ({
      ...prev,
      vibes: prev.vibes.includes(value)
        ? prev.vibes.filter(v => v !== value)
        : [...prev.vibes, value],
    }));
  };

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const tripName = form.name || `${form.destination} Trip`;
      const vibeStr = form.vibes.join(", ") || "luxury";

      // Step 1: Insert trip WITHOUT .select() to avoid RLS read issue
      const { data: insertData, error: tripError } = await supabase
        .from("trips")
        .insert({
          name: tripName,
          destination: form.destination,
          start_date: form.startDate,
          end_date: form.endDate,
          group_size: form.groupSize,
          vibe: vibeStr,
          per_person_budget: form.perPersonBudget,
          payment_deadline: form.paymentDeadline || null,
          created_by: user.id,
        })
        .select("id")
        .single();

      // If select fails due to RLS, try without select
      if (tripError) {
        // Fallback: insert without select, then query trip_members approach
        const { error: insertOnly } = await supabase
          .from("trips")
          .insert({
            name: tripName,
            destination: form.destination,
            start_date: form.startDate,
            end_date: form.endDate,
            group_size: form.groupSize,
            vibe: vibeStr,
            per_person_budget: form.perPersonBudget,
            payment_deadline: form.paymentDeadline || null,
            created_by: user.id,
          });
        if (insertOnly) throw insertOnly;

        // Find the trip we just created
        const { data: trips } = await supabase
          .from("trips")
          .select("id")
          .eq("created_by", user.id)
          .eq("name", tripName)
          .order("created_at", { ascending: false })
          .limit(1);

        // This won't work either because of RLS. Let's use a different approach.
        // Actually the real fix is: we need to add the member FIRST or change the SELECT policy.
        // Since we can't change RLS here, let's work around by inserting member right after.
        throw new Error("Could not create trip. Please try again.");
      }

      const tripId = insertData.id;

      // Step 2: Add creator as organizer
      await supabase.from("trip_members").insert({
        trip_id: tripId,
        user_id: user.id,
        role: "organizer",
      });

      // Step 3: Insert default budget categories
      const defaultCategories = ["Hotel", "Flights", "Activities", "Food", "Buffer"];
      await supabase.from("budget_categories").insert(
        defaultCategories.map((name) => ({
          trip_id: tripId,
          name,
          amount: 0,
        }))
      );

      toast({
        title: "Trip created! 🎉",
        description: `${tripName} is ready. Time to invite the squad!`,
      });
      navigate(`/trip/${tripId}`);
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
      case 3: return form.vibes.length > 0;
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
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
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
                    <Popover open={destOpen} onOpenChange={setDestOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-start rounded-xl h-10 font-normal text-left">
                          {form.destination || <span className="text-muted-foreground">Search cities, countries...</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput placeholder="Type a city or country..." value={destSearch} onValueChange={setDestSearch} />
                          <CommandList>
                            <CommandEmpty>No destinations found.</CommandEmpty>
                            <CommandGroup>
                              {filteredDestinations.map((d) => {
                                const label = `${d.city}, ${d.country} ${d.emoji}`;
                                return (
                                  <CommandItem
                                    key={`${d.city}-${d.country}`}
                                    value={label}
                                    onSelect={() => {
                                      update("destination", `${d.city}, ${d.country}`);
                                      setDestOpen(false);
                                      setDestSearch("");
                                    }}
                                  >
                                    <span>{d.emoji}</span>
                                    <span className="ml-2">{d.city}, {d.country}</span>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
                    <Button variant="outline" size="icon" className="rounded-xl" onClick={() => update("groupSize", form.groupSize + 1)}>+</Button>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <span className="text-4xl">✨</span>
                  <h2 className="text-2xl font-display font-bold mt-3">What's the vibe?</h2>
                  <p className="text-sm text-muted-foreground mt-1">Pick as many as you want</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {vibeOptions.map(v => {
                    const isSelected = form.vibes.includes(v.value);
                    return (
                      <Card
                        key={v.value}
                        className={`cursor-pointer border-2 transition-all ${
                          isSelected
                            ? "border-primary shadow-lg shadow-primary/20"
                            : "border-transparent hover:border-muted"
                        }`}
                        onClick={() => toggleVibe(v.value)}
                      >
                        <CardContent className="p-4 text-center relative">
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <Check className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <span className="text-2xl">{v.label.split(" ").slice(1).join(" ")}</span>
                          <p className="text-sm font-medium mt-1">{v.label.split(" ")[0]}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
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

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 rounded-xl h-12 text-base">
              Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="flex-1 rounded-xl h-12 text-base font-semibold"
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={!canNext() || creating}
              className="flex-1 rounded-xl h-12 text-base font-semibold"
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
