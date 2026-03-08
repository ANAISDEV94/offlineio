import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { Variants } from "framer-motion";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

const WaitlistSignup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || trimmedName.length > 100) {
      setError("Please enter a valid name.");
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email.");
      return;
    }

    setLoading(true);
    const { error: dbError } = await supabase
      .from("waitlist")
      .insert({ name: trimmedName, email: trimmedEmail });

    setLoading(false);

    if (dbError) {
      if (dbError.code === "23505") {
        setError("You're already on the list!");
      } else {
        setError("Something went wrong. Please try again.");
      }
      return;
    }

    setSuccess(true);
  };

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-xl mx-auto px-5">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center space-y-4 mb-10"
        >
          <motion.p variants={fadeUp} custom={0} className="text-primary text-sm font-medium uppercase tracking-widest">
            Early Access
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl sm:text-4xl font-semibold">
            Join the private beta
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground max-w-md mx-auto">
            We're opening early access for groups planning trips in 2026. Get early access and help shape the product.
          </motion.p>
        </motion.div>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-3 py-8"
          >
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
            <p className="font-display text-xl font-semibold">You're on the list.</p>
            <p className="text-muted-foreground">We'll invite you soon.</p>
          </motion.div>
        ) : (
          <motion.form
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <motion.div variants={fadeUp} custom={3}>
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
                className="h-12 rounded-xl text-base"
              />
            </motion.div>
            <motion.div variants={fadeUp} custom={4}>
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                required
                className="h-12 rounded-xl text-base"
              />
            </motion.div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <motion.div variants={fadeUp} custom={5}>
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full rounded-full gap-2"
              >
                {loading ? "Joining…" : "Get Early Access"} <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.form>
        )}
      </div>
    </section>
  );
};

export default WaitlistSignup;
