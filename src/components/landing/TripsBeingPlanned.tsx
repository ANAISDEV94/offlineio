import { motion, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Users, DollarSign } from "lucide-react";
import miamiImg from "@/assets/trips/miami.jpg";
import caboImg from "@/assets/trips/cabo.jpg";
import tulumImg from "@/assets/trips/tulum.jpg";
import nycImg from "@/assets/trips/nyc.jpg";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

const TRIPS = [
  {
    destination: "Miami Girls Trip",
    emoji: "🌴",
    friends: 5,
    budget: "$1,200",
    image: miamiImg,
    alt: "Miami Beach aerial view with turquoise ocean and palm trees",
  },
  {
    destination: "Cabo Birthday Weekend",
    emoji: "🎉",
    friends: 7,
    budget: "$1,500",
    image: caboImg,
    alt: "Cabo San Lucas sunset over the ocean with iconic rock formations",
  },
  {
    destination: "Tulum Long Weekend",
    emoji: "🏖️",
    friends: 4,
    budget: "$900",
    image: tulumImg,
    alt: "Tulum boho cenote pool surrounded by jungle",
  },
  {
    destination: "NYC Birthday Trip",
    emoji: "🗽",
    friends: 6,
    budget: "$1,100",
    image: nycImg,
    alt: "NYC rooftop bar with Manhattan skyline at night",
  },
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
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {TRIPS.map((trip, i) => (
          <motion.div key={trip.destination} variants={fadeUp} custom={i}>
            <Card className="border-0 shadow-sm h-full overflow-hidden rounded-2xl">
              {/* Image */}
              <div className="relative overflow-hidden">
                <AspectRatio ratio={4 / 3}>
                  <img
                    src={trip.image}
                    alt={trip.alt}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                  />
                </AspectRatio>
                {/* Emoji badge */}
                <span className="absolute top-3 right-3 text-xl bg-background/80 backdrop-blur-sm rounded-full w-9 h-9 flex items-center justify-center shadow-sm">
                  {trip.emoji}
                </span>
              </div>

              {/* Info */}
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-sm leading-snug">{trip.destination}</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {trip.friends} friends
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" /> {trip.budget} each
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
