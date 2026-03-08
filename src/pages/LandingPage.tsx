import { useNavigate } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Sparkles, CreditCard, Users, CalendarCheck, Shield, MapPin } from "lucide-react";
import AiPlannerDemo from "@/components/landing/AiPlannerDemo";
import TripDramaSimulator from "@/components/landing/TripDramaSimulator";
import WaitlistSignup from "@/components/landing/WaitlistSignup";
import logo from "@/assets/logo.png";
import heroImg from "@/assets/hero-travel.jpg";
import lifestyleImg from "@/assets/lifestyle-travel.jpg";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-3">
          <img src={logo} alt="offline" className="h-10" />
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="rounded-full px-5">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/60 via-background to-background" />
        <div className="relative max-w-6xl mx-auto px-5">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <motion.div initial="hidden" animate="visible" className="space-y-6">
              <motion.h1
                variants={fadeUp}
                custom={0}
                className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.1] tracking-tight"
              >
                Group trips without the money stress
              </motion.h1>
              <motion.p
                variants={fadeUp}
                custom={1}
                className="text-muted-foreground text-lg max-w-md"
              >
                Plan together, split costs fairly, and travel with your girls. All in one place. No awkward Venmo requests. No spreadsheets.
              </motion.p>
              <motion.div variants={fadeUp} custom={2} className="flex flex-wrap gap-3">
                <Button size="lg" onClick={() => navigate("/auth")} className="rounded-full px-8 gap-2">
                  Start Planning <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="rounded-full px-8">
                  Sign In
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="relative"
            >
              <div className="rounded-3xl overflow-hidden shadow-2xl shadow-primary/10">
                <img
                  src={heroImg}
                  alt="Friends clinking champagne glasses on a yacht at golden hour"
                  className="w-full h-64 sm:h-80 md:h-96 object-cover"
                  loading="eager"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-8 border-y border-border/40">
        <div className="max-w-4xl mx-auto px-5 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> 50+ destinations planned</span>
          <span className="hidden sm:inline text-border">|</span>
          <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> Built for group organizers</span>
          <span className="hidden sm:inline text-border">|</span>
          <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary" /> Transparent finances</span>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-5">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-14"
          >
            <motion.p variants={fadeUp} custom={0} className="text-primary text-sm font-medium uppercase tracking-widest mb-3">
              How It Works
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl sm:text-4xl font-semibold">
              Three steps to stress-free travel
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid sm:grid-cols-3 gap-8"
          >
            {[
              {
                step: "01",
                icon: Sparkles,
                title: "Plan Together",
                desc: "Our AI trip planner builds a custom itinerary based on your group's vibe, budget, and dates. Everyone can weigh in.",
              },
              {
                step: "02",
                icon: CreditCard,
                title: "Fund Fairly",
                desc: "Set a per-person budget, track payments in real-time, and let the system handle reminders. No awkward conversations.",
              },
              {
                step: "03",
                icon: CalendarCheck,
                title: "Go Offline",
                desc: "Once everything's planned and funded, all that's left is to show up and enjoy. Travel stress-free with your people.",
              },
            ].map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} custom={i}>
                <Card className="border-0 shadow-none bg-transparent text-center">
                  <CardContent className="pt-6 space-y-4">
                    <div className="mx-auto h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground tracking-widest">{item.step}</p>
                    <h3 className="font-display text-xl font-semibold">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* AI Demo */}
      <section className="py-20 md:py-28 bg-foreground/[0.03]">
        <div className="max-w-5xl mx-auto px-5">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-12"
          >
            <motion.p variants={fadeUp} custom={0} className="text-primary text-sm font-medium uppercase tracking-widest mb-3">
              See It In Action
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl sm:text-4xl font-semibold">
              Plan a Miami trip in under a minute
            </motion.h2>
          </motion.div>
          <AiPlannerDemo />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mt-10"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Button size="lg" onClick={() => navigate("/auth")} className="rounded-full px-8 gap-2">
                Try It Yourself <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Trip Drama Simulator */}
      <TripDramaSimulator />

      {/* Value Props */}
      <section className="py-20 md:py-28 bg-secondary/40">
        <div className="max-w-5xl mx-auto px-5">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-14"
          >
            <motion.p variants={fadeUp} custom={0} className="text-primary text-sm font-medium uppercase tracking-widest mb-3">
              Why offline
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl sm:text-4xl font-semibold">
              Everything your group trip needs
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {[
              { icon: Sparkles, title: "AI Trip Planner", desc: "Answer a few questions and get a fully personalized itinerary: activities, dining, logistics, tailored to your group." },
              { icon: CreditCard, title: "Payment Tracking", desc: "See who's paid, who hasn't, and what's left. Automated reminders keep everyone accountable without the drama." },
              { icon: Users, title: "Group Coordination", desc: "Invite members with a code, assign roles, set deadlines. Everyone stays on the same page." },
              { icon: Shield, title: "Neutral Rules", desc: "The system enforces deadlines and payment rules — so the organizer doesn't have to be the bad guy." },
              { icon: CalendarCheck, title: "Booking Hub", desc: "Track flights, hotels, and reservations in one dashboard. No more digging through group chats." },
              { icon: MapPin, title: "Curated Destinations", desc: "Browse trending destinations with vibe-matched suggestions for your crew." },
            ].map((item, i) => (
              <motion.div key={item.title} variants={fadeUp} custom={i}>
                <Card className="border-0 shadow-sm h-full">
                  <CardContent className="p-6 space-y-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Lifestyle CTA */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={lifestyleImg}
            alt="Women enjoying a luxury travel experience together"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-foreground/60" />
        </div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="relative max-w-3xl mx-auto px-5 text-center"
        >
          <motion.h2
            variants={fadeUp}
            custom={0}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-primary-foreground leading-tight mb-4"
          >
            Travel with your girls. Leave the drama at home.
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-primary-foreground/80 text-lg mb-8 max-w-lg mx-auto">
            offline handles the planning, the payments, and the coordination — so all you have to do is show up.
          </motion.p>
          <motion.div variants={fadeUp} custom={2}>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="rounded-full px-10 gap-2 bg-primary-foreground text-foreground hover:bg-primary-foreground/90"
            >
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Beta Payment Notice */}
      <section className="py-10">
        <div className="max-w-2xl mx-auto px-5">
          <div className="rounded-2xl bg-secondary/30 border border-border/40 p-6 space-y-2">
            <p className="font-medium text-sm">Beta Notice</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Offline is currently in testing mode. No real payments are being processed. If prompted for card information, please use Stripe's test card:
            </p>
            <div className="text-sm text-muted-foreground font-mono bg-background/60 rounded-lg p-3 space-y-1">
              <p>Card: 4242 4242 4242 4242</p>
              <p>Exp: any future date &nbsp;·&nbsp; CVC: any 3 digits &nbsp;·&nbsp; ZIP: any numbers</p>
            </div>
            <p className="text-xs text-muted-foreground">These are Stripe test credentials and will not charge a real card.</p>
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <WaitlistSignup />

      {/* Footer */}
      <footer className="py-10 border-t border-border/40">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={logo} alt="offline" className="h-9" />
          <div className="text-center sm:text-right space-y-1">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} offline. All rights reserved.</p>
            <p className="text-xs text-muted-foreground/70">Offline is currently in beta. Features may change as we continue testing and improving the experience.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
