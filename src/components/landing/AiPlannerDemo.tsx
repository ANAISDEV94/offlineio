import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Sparkles, MapPin, Sun, Utensils, PartyPopper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ChatMessage {
  role: "ai" | "user";
  text?: string;
  options?: { label: string; selected?: boolean }[];
  selectedOptions?: string[];
  planCard?: boolean;
}

const SCRIPT: { delay: number; message: ChatMessage }[] = [
  {
    delay: 600,
    message: {
      role: "ai",
      text: "Let's plan your Miami Beach trip! ☀️ What kind of stay are you feeling?",
      options: [
        { label: "Budget" },
        { label: "Mid-range" },
        { label: "Luxury", selected: true },
        { label: "Unique stays" },
      ],
    },
  },
  {
    delay: 1400,
    message: { role: "user", selectedOptions: ["Luxury 💎"] },
  },
  {
    delay: 1000,
    message: {
      role: "ai",
      text: "Great taste! What do you want to do there?",
      options: [
        { label: "Adventure" },
        { label: "Culture" },
        { label: "Food", selected: true },
        { label: "Relaxation", selected: true },
        { label: "Nightlife", selected: true },
      ],
    },
  },
  {
    delay: 1600,
    message: { role: "user", selectedOptions: ["Food 🍷", "Relaxation 🧖‍♀️", "Nightlife 🎉"] },
  },
  {
    delay: 1000,
    message: {
      role: "ai",
      text: "How packed should your days be?",
      options: [
        { label: "Chill" },
        { label: "Balanced", selected: true },
        { label: "Packed" },
      ],
    },
  },
  {
    delay: 1200,
    message: { role: "user", selectedOptions: ["Balanced ⚖️"] },
  },
  {
    delay: 800,
    message: { role: "ai", text: "✨ Generating your Miami Beach plan..." },
  },
  {
    delay: 1800,
    message: { role: "ai", planCard: true },
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

const AiPlannerDemo: React.FC = () => {
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [hasPlayed, setHasPlayed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  const playSequence = useCallback(() => {
    setVisibleMessages([]);
    let cumulative = 0;
    SCRIPT.forEach(({ delay, message }, i) => {
      cumulative += delay;
      setTimeout(() => {
        setVisibleMessages((prev) => [...prev, message]);
      }, cumulative);
    });
  }, []);

  useEffect(() => {
    if (isInView && !hasPlayed) {
      setHasPlayed(true);
      playSequence();
    }
  }, [isInView, hasPlayed, playSequence]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [visibleMessages]);

  return (
    <div ref={containerRef} className="w-full max-w-lg mx-auto">
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border/60 bg-card/80">
          <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">AI Trip Planner</p>
            <p className="text-xs text-muted-foreground">Miami Beach · 3 nights · 4 friends</p>
          </div>
        </div>

        {/* Chat area */}
        <div className="px-4 py-4 space-y-3 max-h-[420px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {visibleMessages.map((msg, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                {msg.planCard ? (
                  <PlanCard />
                ) : msg.role === "user" ? (
                  <div className="flex flex-wrap gap-1.5 justify-end max-w-[85%]">
                    {msg.selectedOptions?.map((opt) => (
                      <Badge key={opt} className="bg-primary text-primary-foreground border-0 text-xs px-3 py-1">
                        {opt}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="max-w-[85%] space-y-2">
                    <div className="rounded-2xl rounded-tl-md bg-secondary px-4 py-2.5">
                      <p className="text-sm text-foreground">{msg.text}</p>
                    </div>
                    {msg.options && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.options.map((opt) => (
                          <Badge
                            key={opt.label}
                            variant={opt.selected ? "default" : "outline"}
                            className={
                              opt.selected
                                ? "bg-primary/15 text-primary border border-primary/30 text-xs px-2.5 py-1"
                                : "text-muted-foreground text-xs px-2.5 py-1"
                            }
                          >
                            {opt.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>
      </div>
    </div>
  );
};

const PlanCard: React.FC = () => (
  <Card className="w-full border-primary/20 shadow-md">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <p className="font-medium text-sm text-foreground">Your Miami Beach Itinerary</p>
      </div>
      <div className="space-y-2">
        {[
          { icon: Sun, day: "Day 1", title: "South Beach & Brunch", cost: "$85" },
          { icon: Utensils, day: "Day 2", title: "Spa Day & Wynwood Arts", cost: "$120" },
          { icon: PartyPopper, day: "Day 3", title: "Sunset Cruise & Nightlife", cost: "$150" },
        ].map((item) => (
          <div key={item.day} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{item.day}:</span>
              <span className="text-foreground">{item.title}</span>
            </div>
            <span className="text-primary font-medium">{item.cost}</span>
          </div>
        ))}
      </div>
      <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Est. per person</span>
        <span className="font-semibold text-foreground">~$1,200</span>
      </div>
    </CardContent>
  </Card>
);

export default AiPlannerDemo;
