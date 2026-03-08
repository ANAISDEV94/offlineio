import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, AlertTriangle, DollarSign, UserMinus, Clock } from "lucide-react";

const NAMES = ["Ashley", "Maya", "Samantha", "Jordan", "Keisha", "Brianna", "Taylor", "Nicole", "Jasmine"];

const ICONS = [DollarSign, Clock, UserMinus, AlertTriangle];

interface DramaLine {
  text: string;
  icon: typeof DollarSign;
}

function generateDrama(friends: number, totalCost: number, onePersonPays: boolean): DramaLine[] {
  const perPerson = Math.round(totalCost / friends);
  const pool = [...NAMES].sort(() => 0.5 - Math.random()).slice(0, friends);
  const lines: DramaLine[] = [];

  lines.push({ text: `${pool[0]} owes $${perPerson}`, icon: DollarSign });
  lines.push({ text: `${pool[1]} hasn't paid yet`, icon: Clock });

  if (friends > 3) {
    lines.push({ text: `${pool[2]} dropped out last minute`, icon: UserMinus });
  }

  const dropouts = friends > 3 ? 1 : 0;
  const unpaid = 1;
  const extraCost = (dropouts + unpaid) * perPerson;
  const youCover = onePersonPays ? totalCost : perPerson + extraCost;

  lines.push({ text: `You are now covering $${youCover.toLocaleString()}`, icon: AlertTriangle });

  return lines;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.2, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const TripDramaSimulator = () => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState(5);
  const [totalCost, setTotalCost] = useState(3000);
  const [onePersonPays, setOnePersonPays] = useState(false);
  const [result, setResult] = useState<DramaLine[] | null>(null);

  const simulate = () => {
    setResult(null);
    // small delay so AnimatePresence can exit first
    setTimeout(() => setResult(generateDrama(friends, totalCost, onePersonPays)), 50);
  };

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-5">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center mb-12"
        >
          <motion.p variants={fadeUp} custom={0} className="text-primary text-sm font-medium uppercase tracking-widest mb-3">
            Try It Out
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl sm:text-4xl font-semibold">
            Try the Trip Drama Simulator
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground mt-3 max-w-lg mx-auto">
            See how group trip money drama happens in seconds.
          </motion.p>
        </motion.div>

        <Card className="border-0 shadow-lg bg-secondary/20">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <p className="text-sm text-muted-foreground leading-relaxed text-center">
              Most group trips start with one person booking everything and everyone promising to pay them back. What could go wrong?
            </p>

            {/* Inputs */}
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Number of friends: <span className="text-primary font-semibold">{friends}</span>
                </Label>
                <Slider
                  min={2}
                  max={10}
                  step={1}
                  value={[friends]}
                  onValueChange={([v]) => setFriends(v)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Total trip cost ($)</Label>
                <Input
                  type="number"
                  min={500}
                  max={50000}
                  value={totalCost}
                  onChange={(e) => setTotalCost(Number(e.target.value) || 0)}
                  className="rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">One person pays upfront</Label>
                <Switch checked={onePersonPays} onCheckedChange={setOnePersonPays} />
              </div>
            </div>

            <Button onClick={simulate} className="w-full rounded-full" size="lg">
              Simulate Trip
            </Button>

            {/* Results */}
            <AnimatePresence mode="wait">
              {result && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3 pt-2"
                >
                  {result.map((line, i) => (
                    <motion.div
                      key={i}
                      custom={i}
                      initial="hidden"
                      animate="visible"
                      variants={fadeUp}
                      className="flex items-center gap-3 rounded-2xl bg-background p-4 shadow-sm"
                    >
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <line.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{line.text}</span>
                    </motion.div>
                  ))}

                  <motion.div
                    custom={result.length}
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="text-center pt-4 space-y-4"
                  >
                    <p className="font-display text-lg font-semibold">
                      This is exactly why Offline exists. Plan trips without the money drama.
                    </p>
                    <Button
                      onClick={() => navigate("/auth")}
                      className="rounded-full px-8 gap-2"
                      size="lg"
                    >
                      Start planning your trip instead <ArrowRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default TripDramaSimulator;
