import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, RefreshCw, Pencil, Save, ExternalLink, Send, SkipForward } from "lucide-react";
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
  dietaryNeeds: string;
  mustSee: string;
  specialRequests: string;
}

interface GeneratedPlan {
  budget_breakdown: { category: string; amount: number; notes: string }[];
  itinerary_days: { day_number: number; activities: { time_block: string; title: string; description: string; est_cost: number }[] }[];
  suggested_options: { category: string; title: string; description: string; est_cost_low: number; est_cost_high: number; search_url: string }[];
}

interface ChatMessage {
  role: "ai" | "user";
  content: string;
  questionIndex: number;
  options?: string[];
  multiSelect?: boolean;
}

const QUESTIONS: { text: string; key: keyof Answers; options?: string[]; multiSelect?: boolean }[] = [
  { text: "What kind of stay are you feeling?", key: "accommodation", options: ["Budget", "Mid-range", "Luxury", "Unique stays"] },
  { text: "What do you want to do there?", key: "activities", options: ["Adventure", "Culture", "Food", "Relaxation", "Nightlife"], multiSelect: true },
  { text: "How packed should your days be?", key: "pace", options: ["Packed schedule", "Balanced", "Relaxed"] },
  { text: "Any food preferences or dietary needs?", key: "dietaryNeeds" },
  { text: "Anything you absolutely must do or see?", key: "mustSee" },
  { text: "Any other special requests?", key: "specialRequests" },
];

const AiTripPlanner = ({ tripId, open, onOpenChange, onSaved }: AiTripPlannerProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("questions");
  const [answers, setAnswers] = useState<Answers>({
    accommodation: "",
    activities: [],
    pace: "",
    dietaryNeeds: "",
    mustSee: "",
    specialRequests: "",
  });
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [multiSelectPending, setMultiSelectPending] = useState<string[]>([]);
  const [textInput, setTextInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize first question
  useEffect(() => {
    if (open && chatMessages.length === 0) {
      setChatMessages([{ role: "ai", content: QUESTIONS[0].text, questionIndex: 0, options: QUESTIONS[0].options, multiSelect: QUESTIONS[0].multiSelect }]);
    }
  }, [open]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, currentQuestion]);

  const advanceToNext = (answerText: string, nextIndex: number) => {
    setChatMessages(prev => [...prev, { role: "user", content: answerText, questionIndex: currentQuestion }]);

    if (nextIndex < QUESTIONS.length) {
      setTimeout(() => {
        const q = QUESTIONS[nextIndex];
        setChatMessages(prev => [...prev, { role: "ai", content: q.text, questionIndex: nextIndex, options: q.options, multiSelect: q.multiSelect }]);
        setCurrentQuestion(nextIndex);
      }, 400);
    } else {
      setCurrentQuestion(nextIndex);
    }
  };

  const handleSingleSelect = (option: string) => {
    const q = QUESTIONS[currentQuestion];
    setAnswers(prev => ({ ...prev, [q.key]: option }));
    advanceToNext(option, currentQuestion + 1);
  };

  const toggleMultiOption = (option: string) => {
    setMultiSelectPending(prev => prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]);
  };

  const confirmMultiSelect = () => {
    if (multiSelectPending.length === 0) return;
    const q = QUESTIONS[currentQuestion];
    setAnswers(prev => ({ ...prev, [q.key]: multiSelectPending }));
    advanceToNext(multiSelectPending.join(", "), currentQuestion + 1);
    setMultiSelectPending([]);
  };

  const handleTextSubmit = () => {
    const q = QUESTIONS[currentQuestion];
    const val = textInput.trim();
    setAnswers(prev => ({ ...prev, [q.key]: val }));
    advanceToNext(val || "Skipped", currentQuestion + 1);
    setTextInput("");
  };

  const handleSkip = () => {
    advanceToNext("Skipped", currentQuestion + 1);
    setTextInput("");
  };

  const resetWizard = () => {
    setCurrentQuestion(0);
    setChatMessages([{ role: "ai", content: QUESTIONS[0].text, questionIndex: 0, options: QUESTIONS[0].options, multiSelect: QUESTIONS[0].multiSelect }]);
    setMultiSelectPending([]);
    setTextInput("");
    setAnswers({ accommodation: "", activities: [], pace: "", dietaryNeeds: "", mustSee: "", specialRequests: "" });
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
      resetWizard();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const budgetTotal = plan?.budget_breakdown?.reduce((s, b) => s + b.amount, 0) || 0;
  const isComplete = currentQuestion >= QUESTIONS.length;
  const activeQ = currentQuestion < QUESTIONS.length ? QUESTIONS[currentQuestion] : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Trip Planner
          </SheetTitle>
        </SheetHeader>

        {/* Progress dots */}
        {step === "questions" && (
          <div className="flex justify-center gap-1.5 mt-3">
            {QUESTIONS.map((_, i) => (
              <div key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${i <= currentQuestion ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        )}

        <div className="mt-4 space-y-6">
          {/* Step 1: Chat wizard */}
          {step === "questions" && (
            <div className="space-y-3">
              {/* Chat messages */}
              <div className="space-y-3 min-h-[200px]">
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "ai"
                        ? "bg-muted text-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                <div ref={scrollRef} />
              </div>

              {/* Active input area */}
              {!isComplete && activeQ && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-2">
                  {/* Pill options */}
                  {activeQ.options && !activeQ.multiSelect && (
                    <div className="flex flex-wrap gap-2">
                      {activeQ.options.map(opt => (
                        <Button key={opt} variant="outline" size="sm" className="rounded-full text-xs" onClick={() => handleSingleSelect(opt)}>
                          {opt}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Multi-select pills */}
                  {activeQ.options && activeQ.multiSelect && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {activeQ.options.map(opt => (
                          <Button
                            key={opt}
                            variant={multiSelectPending.includes(opt) ? "default" : "outline"}
                            size="sm"
                            className="rounded-full text-xs"
                            onClick={() => toggleMultiOption(opt)}
                          >
                            {opt}
                          </Button>
                        ))}
                      </div>
                      {multiSelectPending.length > 0 && (
                        <Button size="sm" className="rounded-full text-xs" onClick={confirmMultiSelect}>
                          Next →
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Free text input */}
                  {!activeQ.options && (
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="Type your answer..."
                        value={textInput}
                        onChange={e => setTextInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleTextSubmit()}
                        className="rounded-full text-sm"
                      />
                      <Button size="icon" className="rounded-full shrink-0 h-9 w-9" onClick={handleTextSubmit} disabled={!textInput.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground shrink-0" onClick={handleSkip}>
                        <SkipForward className="h-3 w-3 mr-1" /> Skip
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Generate button */}
              {isComplete && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <Button className="w-full rounded-xl" onClick={generate}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate My Plan
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-muted-foreground" onClick={resetWizard}>
                    <Pencil className="h-3 w-3 mr-1" /> Start over
                  </Button>
                </motion.div>
              )}
            </div>
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
                <Button variant="outline" size="icon" className="rounded-xl" onClick={() => { setStep("questions"); resetWizard(); }}>
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
