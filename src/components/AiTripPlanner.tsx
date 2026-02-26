import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, RefreshCw, Pencil, Save, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface AiTripPlannerProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

type Step = "questions" | "generating" | "preview";

interface Answers {
  accommodation: string;
  activities: string[];
  pace: string;
  specialRequests: string;
}

interface GeneratedPlan {
  budget_breakdown: { category: string; amount: number; notes: string }[];
  itinerary_days: { day_number: number; activities: { time_block: string; title: string; description: string; est_cost: number }[] }[];
  suggested_options: { category: string; title: string; description: string; est_cost_low: number; est_cost_high: number; search_url: string }[];
}

const ACCOMMODATION_OPTIONS = ["Budget", "Mid-range", "Luxury", "Unique stays"];
const ACTIVITY_OPTIONS = ["Adventure", "Culture", "Food", "Relaxation", "Nightlife"];
const PACE_OPTIONS = ["Packed schedule", "Balanced", "Relaxed"];

const AiTripPlanner = ({ tripId, open, onOpenChange, onSaved }: AiTripPlannerProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("questions");
  const [answers, setAnswers] = useState<Answers>({
    accommodation: "Mid-range",
    activities: [],
    pace: "Balanced",
    specialRequests: "",
  });
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleActivity = (activity: string) => {
    setAnswers(prev => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter(a => a !== activity)
        : [...prev.activities, activity],
    }));
  };

  const generate = async () => {
    setStep("generating");
    try {
      const { data, error } = await supabase.functions.invoke("generate-trip-plan", {
        body: { trip_id: tripId, answers_json: answers },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPlan(data);
      setStep("preview");
    } catch (e: any) {
      console.error("Generate error:", e);
      toast({ title: "Generation failed", description: e.message || "Try again", variant: "destructive" });
      setStep("questions");
    }
  };

  const saveDraft = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("save-trip-plan", {
        body: { trip_id: tripId, generated_plan_json: plan },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Draft plan saved!" });
      onSaved();
      onOpenChange(false);
      setStep("questions");
      setPlan(null);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const budgetTotal = plan?.budget_breakdown?.reduce((s, b) => s + b.amount, 0) || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Trip Planner
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* Step 1: Questions */}
          {step === "questions" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              {/* Accommodation */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Accommodation Style</Label>
                <div className="flex flex-wrap gap-2">
                  {ACCOMMODATION_OPTIONS.map(opt => (
                    <Button
                      key={opt}
                      variant={answers.accommodation === opt ? "default" : "outline"}
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => setAnswers(p => ({ ...p, accommodation: opt }))}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Activities */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Activity Interests (select multiple)</Label>
                <div className="flex flex-wrap gap-3">
                  {ACTIVITY_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={answers.activities.includes(opt)}
                        onCheckedChange={() => toggleActivity(opt)}
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pace */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Trip Pace</Label>
                <div className="flex flex-wrap gap-2">
                  {PACE_OPTIONS.map(opt => (
                    <Button
                      key={opt}
                      variant={answers.pace === opt ? "default" : "outline"}
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => setAnswers(p => ({ ...p, pace: opt }))}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Special Requests */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Special Requests (optional)</Label>
                <Textarea
                  placeholder="Dietary needs, accessibility, must-see spots..."
                  value={answers.specialRequests}
                  onChange={e => setAnswers(p => ({ ...p, specialRequests: e.target.value }))}
                  className="rounded-xl"
                  rows={3}
                />
              </div>

              <Button className="w-full rounded-xl" onClick={generate} disabled={answers.activities.length === 0}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate My Plan
              </Button>
            </motion.div>
          )}

          {/* Step 2: Generating */}
          {step === "generating" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Planning your trip...</p>
              <p className="text-xs text-muted-foreground">This may take a moment</p>
            </motion.div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && plan && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              {/* Budget Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget Breakdown</p>
                  <p className="text-xs text-muted-foreground">${budgetTotal.toLocaleString()} total</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {plan.budget_breakdown.map((b, i) => (
                    <Card key={i} className="border-0 shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium capitalize">{b.category}</p>
                          <Badge variant="secondary" className="text-[10px]">Draft</Badge>
                        </div>
                        <p className="text-lg font-semibold">${b.amount.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{b.notes}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Itinerary */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Daily Itinerary</p>
                {plan.itinerary_days.map(day => (
                  <Card key={day.day_number} className="border-0 shadow-sm">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">Day {day.day_number}</p>
                        <Badge variant="secondary" className="text-[10px]">Draft</Badge>
                      </div>
                      {day.activities.map((act, j) => (
                        <div key={j} className="flex gap-3">
                          <span className="text-[10px] text-primary font-medium w-16 pt-0.5 shrink-0 capitalize">{act.time_block}</span>
                          <div className="flex-1">
                            <p className="text-sm">{act.title}</p>
                            <p className="text-[10px] text-muted-foreground">{act.description}</p>
                            {act.est_cost > 0 && <p className="text-[10px] text-muted-foreground">~${act.est_cost}</p>}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Suggested Options */}
              {plan.suggested_options?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Suggested Options</p>
                  {plan.suggested_options.map((opt, i) => (
                    <Card key={i} className="border-0 shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{opt.title}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{opt.category}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">${opt.est_cost_low}-${opt.est_cost_high}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{opt.description}</p>
                        {opt.search_url && (
                          <a href={opt.search_url} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-primary flex items-center gap-1 mt-1 hover:underline">
                            Search <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pb-4">
                <Button className="flex-1 rounded-xl" onClick={saveDraft} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Draft to Plan
                </Button>
                <Button variant="outline" size="icon" className="rounded-xl" onClick={generate}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setStep("questions")}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AiTripPlanner;
