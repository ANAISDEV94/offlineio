import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Check, Globe, Lock, Upload, CalendarIcon } from "lucide-react";
import { vibeOptions } from "@/lib/sample-data";
import { destinations } from "@/lib/destinations";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const tripTemplates = [
  {
    name: "Soft Girl Summer",
    emoji: "🌸",
    budget: 3000,
    vibes: ["luxury", "wellness"],
    gradient: "from-pink-200 to-rose-100",
    description: "Beach, brunch & sunsets",
    groupSize: 6,
  },
  {
    name: "Birthday Reset",
    emoji: "🎂",
    budget: 4000,
    vibes: ["luxury", "party"],
    gradient: "from-amber-200 to-yellow-100",
    description: "VIP, spa & nightlife",
    groupSize: 8,
  },
  {
    name: "Bachelorette Energy",
    emoji: "💍",
    budget: 3500,
    vibes: ["party", "romantic"],
    gradient: "from-fuchsia-200 to-pink-100",
    description: "Pool party, matching outfits",
    groupSize: 10,
  },
  {
    name: "Girls Gone Global",
    emoji: "🌍",
    budget: 5000,
    vibes: ["cultural", "foodie"],
    gradient: "from-teal-200 to-cyan-100",
    description: "Culture, food tours & landmarks",
    groupSize: 6,
  },
  {
    name: "Healing Escape",
    emoji: "🧘‍♀️",
    budget: 2500,
    vibes: ["wellness", "adventure"],
    gradient: "from-green-200 to-emerald-100",
    description: "Yoga, nature & journaling",
    groupSize: 4,
  },
];

const steps = ["Template", "Trip Type", "Destination", "Dates", "Details", "Vibe", "Budget"];

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
    visibility: "private" as "private" | "public",
    hostName: "",
    hostBio: "",
    tripDescription: "",
    maxSpots: 20,
    minSpotsRequired: 8,
    joinDeadline: undefined as Date | undefined,
    coverImage: null as File | null,
  });
  const [creating, setCreating] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [destSearch, setDestSearch] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const effectiveHostName = form.hostName || profile?.display_name || "";

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

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    update("coverImage", file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const applyTemplate = (templateName: string) => {
    const template = tripTemplates.find(t => t.name === templateName);
    if (!template) return;
    setSelectedTemplate(templateName);
    setForm(prev => ({
      ...prev,
      vibes: template.vibes,
      perPersonBudget: template.budget,
      groupSize: template.groupSize,
      name: template.name,
    }));
  };

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const tripName = form.name || `${form.destination} Trip`;
      const vibeStr = form.vibes.join(", ") || "luxury";

      let coverImageUrl: string | null = null;

      if (form.visibility === "public" && form.coverImage) {
        const ext = form.coverImage.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("trip-covers").upload(path, form.coverImage);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("trip-covers").getPublicUrl(path);
        coverImageUrl = urlData.publicUrl;
      }

      const { data: insertData, error: tripError } = await supabase
        .from("trips")
        .insert({
          name: tripName,
          destination: form.destination,
          start_date: form.startDate,
          end_date: form.endDate,
          group_size: form.visibility === "public" ? form.maxSpots : form.groupSize,
          vibe: vibeStr,
          per_person_budget: form.perPersonBudget,
          total_cost: form.perPersonBudget * (form.visibility === "public" ? form.maxSpots : form.groupSize),
          payment_deadline: form.paymentDeadline || null,
          created_by: user.id,
          visibility: form.visibility,
          host_bio: form.visibility === "public" ? form.hostBio || null : null,
          trip_description: form.visibility === "public" ? form.tripDescription || null : null,
          max_spots: form.visibility === "public" ? form.maxSpots : null,
          min_spots_required: form.visibility === "public" ? form.minSpotsRequired : null,
          join_deadline: form.visibility === "public" && form.joinDeadline
            ? format(form.joinDeadline, "yyyy-MM-dd") : null,
          cover_image_url: coverImageUrl,
        } as any)
        .select("id")
        .single();

      if (tripError) throw tripError;

      const tripId = insertData.id;

      await supabase.from("trip_members").insert({ trip_id: tripId, user_id: user.id, role: "organizer" });

      const defaultCategories = ["Hotel", "Flights", "Activities", "Food", "Buffer"];
      await supabase.from("budget_categories").insert(
        defaultCategories.map((name) => ({ trip_id: tripId, name, amount: 0 }))
      );

      if (form.visibility === "public") {
        await supabase.from("profiles").update({ is_creator: true } as any).eq("user_id", user.id);
      }

      toast({
        title: "Trip created!",
        description: form.visibility === "public"
          ? `${tripName} is live. Share the link to invite people.`
          : `${tripName} is ready. Time to invite the crew.`,
      });
      navigate(`/trip/${tripId}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const canNext = () => {
    switch (step) {
      case 0: return true; // Template is optional
      case 1: return true;
      case 2: return form.destination.trim().length > 0;
      case 3: return form.startDate && form.endDate;
      case 4: return form.visibility === "public" ? form.maxSpots >= 2 : form.groupSize > 1;
      case 5: return form.vibes.length > 0;
      case 6: return form.perPersonBudget > 0;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 flex items-center gap-3">
        <button onClick={() => step > 0 ? setStep(step - 1) : navigate("/")} className="text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-display font-semibold">Create Your Trip</h1>
      </header>

      {/* Progress */}
      <div className="px-4 mb-6">
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2"><p className="text-xs text-muted-foreground mt-2">Step {step + 1} of {steps.length} - {steps[step]}</p></p>
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
            {/* Step 0: Template Selection */}
            {step === 0 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <span className="text-4xl">✨</span>
                  <h2 className="text-2xl font-display font-semibold mt-3">Start from a Template</h2>
                  <p className="text-sm text-muted-foreground mt-1">Pick one to pre-fill your trip, or skip to start fresh</p>
                </div>
                <div className="space-y-3">
                  {tripTemplates.map((t) => (
                    <Card
                      key={t.name}
                      className={`cursor-pointer border-2 transition-all overflow-hidden ${
                        selectedTemplate === t.name ? "border-primary shadow-md" : "border-transparent hover:border-muted"
                      }`}
                      onClick={() => applyTemplate(t.name === selectedTemplate ? "" : t.name)}
                    >
                      <CardContent className={`p-0`}>
                        <div className={`bg-gradient-to-r ${t.gradient} p-4 flex items-center gap-4`}>
                          <span className="text-3xl">{t.emoji}</span>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-foreground">{t.name}</p>
                            <p className="text-xs text-foreground/70">{t.description}</p>
                            <p className="text-[10px] text-foreground/50 mt-1">${t.budget.toLocaleString()}/person · {t.groupSize} people</p>
                          </div>
                          {selectedTemplate === t.name && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Trip Type */}
            {step === 1 && (
              <div className="space-y-8">
                <div className="text-center mb-6">
                  <span className="text-4xl">🌟</span>
                  <h2 className="text-2xl font-display font-semibold mt-3">What kind of trip?</h2>
                  <p className="text-sm text-muted-foreground mt-1">Choose how you want to organize</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Card
                    className={`cursor-pointer border-2 transition-all ${
                      form.visibility === "private" ? "border-primary shadow-sm" : "border-transparent hover:border-muted"
                    }`}
                    onClick={() => update("visibility", "private")}
                  >
                    <CardContent className="p-5 text-center">
                      <Lock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium text-sm">Private</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Invite-only group trip</p>
                    </CardContent>
                  </Card>
                  <Card
                    className={`cursor-pointer border-2 transition-all ${
                      form.visibility === "public" ? "border-primary shadow-sm" : "border-transparent hover:border-muted"
                    }`}
                    onClick={() => update("visibility", "public")}
                  >
                    <CardContent className="p-5 text-center">
                      <Globe className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <p className="font-medium text-sm">Creator-Hosted</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Share via link, anyone joins</p>
                    </CardContent>
                  </Card>
                </div>

                <AnimatePresence>
                  {form.visibility === "public" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                      <div className="space-y-2">
                        <Label>Host Name</Label>
                        <Input placeholder={effectiveHostName || "Your name"} value={form.hostName} onChange={e => update("hostName", e.target.value)} className="rounded-xl" />
                        <p className="text-[10px] text-muted-foreground">Pre-filled from your profile</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Host Bio <span className="text-muted-foreground">({form.hostBio.length}/160)</span></Label>
                        <Textarea placeholder="Travel enthusiast, group trip organizer..." value={form.hostBio} onChange={e => update("hostBio", e.target.value.slice(0, 160))} className="rounded-xl resize-none" rows={2} />
                      </div>
                      <div className="space-y-2">
                        <Label>Trip Description</Label>
                        <Textarea placeholder="Describe the experience you're creating..." value={form.tripDescription} onChange={e => update("tripDescription", e.target.value)} className="rounded-xl resize-none" rows={3} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Max Spots</Label>
                          <Input type="number" min={2} value={form.maxSpots} onChange={e => update("maxSpots", Number(e.target.value))} className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label>Min Required</Label>
                          <Input type="number" min={1} max={form.maxSpots} value={form.minSpotsRequired} onChange={e => update("minSpotsRequired", Math.min(Number(e.target.value), form.maxSpots))} className="rounded-xl" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Join Deadline</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full rounded-xl justify-start text-left font-normal", !form.joinDeadline && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {form.joinDeadline ? format(form.joinDeadline, "PPP") : "Pick a deadline"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={form.joinDeadline} onSelect={(d) => update("joinDeadline", d)} disabled={(date) => date < new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label>Cover Image</Label>
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted rounded-xl cursor-pointer hover:border-primary/50 transition-colors overflow-hidden">
                          {coverPreview ? (
                            <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                              <span className="text-xs text-muted-foreground">Upload cover photo</span>
                            </>
                          )}
                          <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Step 2: Destination */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <span className="text-4xl">🌍</span>
                  <h2 className="text-2xl font-display font-semibold mt-3">Where are you going?</h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Trip Name</Label>
                    <Input placeholder="Summer 2026 Trip" value={form.name} onChange={e => update("name", e.target.value)} className="rounded-xl" />
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
                                  <CommandItem key={`${d.city}-${d.country}`} value={label} onSelect={() => { update("destination", `${d.city}, ${d.country}`); setDestOpen(false); setDestSearch(""); }}>
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

            {/* Step 3: Dates */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <span className="text-4xl">📅</span>
                  <h2 className="text-2xl font-display font-semibold mt-3">When's the trip?</h2>
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

            {/* Step 4: Details */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <span className="text-4xl">👥</span>
                  <h2 className="text-2xl font-display font-semibold mt-3">
                    {form.visibility === "public" ? "Trip details" : "How many people?"}
                  </h2>
                </div>
                {form.visibility === "private" && (
                  <div className="space-y-2">
                    <Label>Group Size</Label>
                    <div className="flex items-center gap-4">
                      <Button variant="outline" size="icon" className="rounded-xl" onClick={() => update("groupSize", Math.max(2, form.groupSize - 1))}>−</Button>
                      <span className="text-3xl font-display font-semibold text-foreground w-12 text-center">{form.groupSize}</span>
                      <Button variant="outline" size="icon" className="rounded-xl" onClick={() => update("groupSize", form.groupSize + 1)}>+</Button>
                    </div>
                  </div>
                )}
                {form.visibility === "public" && (
                  <Card className="border-0 shadow-sm bg-muted/50">
                    <CardContent className="p-4 space-y-1">
                      <p className="text-sm font-medium">Creator-Hosted Trip</p>
                      <p className="text-xs text-muted-foreground">Max spots: {form.maxSpots} · Min required: {form.minSpotsRequired}</p>
                      <p className="text-xs text-muted-foreground">These were set in the first step. You can go back to edit.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 5: Vibe */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <span className="text-4xl">✨</span>
                  <h2 className="text-2xl font-display font-semibold mt-3">What's the vibe?</h2>
                  <p className="text-sm text-muted-foreground mt-1">Pick as many as you want</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {vibeOptions.map(v => {
                    const isSelected = form.vibes.includes(v.value);
                    return (
                      <Card
                        key={v.value}
                        className={`cursor-pointer border-2 transition-all ${
                          isSelected ? "border-primary shadow-sm" : "border-transparent hover:border-muted"
                        }`}
                        onClick={() => toggleVibe(v.value)}
                      >
                        <CardContent className="p-4 text-center relative">
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <Check className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <span className="text-2xl">{v.emoji}</span>
                          <p className="text-sm font-medium mt-1">{v.label}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 6: Budget */}
            {step === 6 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <span className="text-4xl">💰</span>
                  <h2 className="text-2xl font-display font-semibold mt-3">Budget per person</h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Per Person Budget ($)</Label>
                    <Input
                      type="number"
                      value={form.perPersonBudget}
                      onChange={e => update("perPersonBudget", Number(e.target.value))}
                      className="rounded-xl text-center text-2xl font-display font-semibold h-14"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Deadline</Label>
                    <Input type="date" value={form.paymentDeadline} onChange={e => update("paymentDeadline", e.target.value)} className="rounded-xl" />
                  </div>
                  <Card className="bg-muted border-0">
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">Total trip budget</p>
                      <p className="text-2xl font-display font-semibold text-foreground">
                        ${(form.perPersonBudget * (form.visibility === "public" ? form.maxSpots : form.groupSize)).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {form.visibility === "public" ? form.maxSpots : form.groupSize} people × ${form.perPersonBudget.toLocaleString()}
                      </p>
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
              className="flex-1 rounded-xl h-12 text-base font-medium"
            >
              {step === 0 && !selectedTemplate ? "Skip — Start Fresh" : "Next"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={!canNext() || creating}
              className="flex-1 rounded-xl h-12 text-base font-medium"
            >
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {creating ? "Creating..." : "Create Trip"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateTrip;
