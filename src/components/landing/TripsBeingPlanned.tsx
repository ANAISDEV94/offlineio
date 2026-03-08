import { motion, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Users, MapPin } from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

const TRIPS = [
  { destination: "Miami Girls Trip", emoji: "🌴", friends: 5, budget: "$1,200" },
  { destination: "Cabo Birthday Weekend", emoji: "🎉", friends: 7, budget: "$1,500" },
  { destination: "Tulum Long Weekend", emoji: "🏖️", friends: 4, budget: "$900" },
  { destination: "NYC Birthday Trip", emoji: "🗽", friends: 6, budget: "$1,100" },
];

const TripsBeingPlanned = () => (
  <section className="py-20 md:py-28 bg-foreground/[0.03]">
    <div className="max-w-5xl mx-auto px-5">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="text-center mb-12"
      >
        <motion.p variants={fadeUp} custom={0} className="text-primary text-sm font-medium uppercase tracking-widest mb-3">
          Social Proof
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl sm:text-4xl font-semibold">
          Trips People Are Planning
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="text-muted-foreground mt-3 max-w-md mx-auto">
          Group trips are already being organized.
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {TRIPS.map((trip, i) => (
          <motion.div key={trip.destination} variants={fadeUp} custom={i}>
            <Card className="border-0 shadow-sm h-full">
              <CardContent className="p-5 space-y-3 text-center">
                <span className="text-3xl block">{trip.emoji}</span>
                <h3 className="font-medium text-sm leading-snug">{trip.destination}</h3>
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span className="flex items-center justify-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {trip.friends} friends
                  </span>
                  <span className="flex items-center justify-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {trip.budget} each
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default TripsBeingPlanned;
