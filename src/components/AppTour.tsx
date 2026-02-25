import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const slides = [
  {
    emoji: "✈️",
    title: "Welcome to DÉPARTE!",
    description: "Your ultimate girls' trip planner.",
  },
  {
    emoji: "💰",
    title: "Fund",
    description: "Track group payments, set installment plans, and keep everyone accountable with the Trip Health Score.",
  },
  {
    emoji: "📋",
    title: "Plan",
    description: "Choose a trip template, build your day-by-day itinerary, and manage your budget breakdown.",
  },
  {
    emoji: "🔓",
    title: "Unlock",
    description: "Booking unlocks when your trip is fully funded. Save flights, hotels, and experiences all in one place.",
  },
  {
    emoji: "🎉",
    title: "Hype",
    description: "Countdown to takeoff, post your outfits, and check off your packing list. Let's gooo! 💅",
  },
];

interface AppTourProps {
  userId: string;
  onComplete: () => void;
}

const AppTour = ({ userId, onComplete }: AppTourProps) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const dismiss = async () => {
    onComplete();
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true } as any)
      .eq("user_id", userId);
  };

  const next = () => {
    if (current < slides.length - 1) {
      setDirection(1);
      setCurrent((c) => c + 1);
    }
  };

  const prev = () => {
    if (current > 0) {
      setDirection(-1);
      setCurrent((c) => c - 1);
    }
  };

  const isLast = current === slides.length - 1;
  const slide = slides[current];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6"
    >
      <button
        onClick={dismiss}
        className="absolute top-5 right-5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Skip
      </button>

      <div className="flex-1 flex flex-col items-center justify-center max-w-sm w-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            initial={{ opacity: 0, x: direction * 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -80 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex flex-col items-center text-center"
          >
            <motion.span
              className="text-7xl mb-6"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              {slide.emoji}
            </motion.span>
            <h2 className="text-2xl font-display font-bold text-foreground mb-3">
              {slide.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed">{slide.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-2 mb-6">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      <div className="flex gap-3 w-full max-w-sm pb-10">
        {current > 0 && (
          <Button variant="outline" className="flex-1 rounded-xl" onClick={prev}>
            Back
          </Button>
        )}
        {isLast ? (
          <Button className="flex-1 rounded-xl" onClick={dismiss}>
            Let's go! 🎉
          </Button>
        ) : (
          <Button className="flex-1 rounded-xl" onClick={next}>
            Next
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default AppTour;
