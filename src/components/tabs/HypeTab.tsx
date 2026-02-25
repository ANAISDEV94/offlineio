import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sampleHypeMessages, sampleTrip } from "@/lib/sample-data";
import { motion } from "framer-motion";

const HypeTab = () => {
  const daysUntil = Math.ceil(
    (new Date(sampleTrip.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-4">
      {/* Countdown hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 via-lavender/30 to-peach/20">
          <CardContent className="p-6 text-center">
            <p className="text-5xl font-display font-bold text-foreground">{daysUntil}</p>
            <p className="text-sm text-muted-foreground mt-1">days until {sampleTrip.destination} ✈️</p>
            <motion.p
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-lg mt-2"
            >
              ✨💅🌴
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
        <div className="space-y-4">
          {sampleHypeMessages.map((msg, i) => {
            const isPast = new Date(msg.date) < new Date();
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative pl-10"
              >
                <div className={`absolute left-2.5 top-3 h-3 w-3 rounded-full border-2 border-background ${
                  msg.type === "payment" ? "bg-gold" : "bg-primary"
                } ${isPast ? "opacity-50" : ""}`} />
                <Card className={`border-0 shadow-sm ${isPast ? "opacity-50" : ""}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 ${msg.type === "payment" ? "bg-gold/20" : "bg-primary/10"}`}
                      >
                        {msg.type === "payment" ? "💰 Payment" : "🎉 Hype"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-sm">{msg.message}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HypeTab;
