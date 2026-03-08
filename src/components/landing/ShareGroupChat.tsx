import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Share2, Copy, MessageCircle, Send, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

const SHARE_URL = "https://offlineio.lovable.app";
const SHARE_MESSAGE = `We're planning our trip with Offline so no one has to chase people for money. Check it out. ${SHARE_URL}`;

const ShareGroupChat = () => {
  const [open, setOpen] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(SHARE_URL);
    toast({ title: "Link copied!", description: "Paste it in your group chat." });
    setOpen(false);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(SHARE_MESSAGE)}`, "_blank");
    setOpen(false);
  };

  const shareIMessage = () => {
    window.open(`sms:&body=${encodeURIComponent(SHARE_MESSAGE)}`);
    setOpen(false);
  };

  const shareInstagram = async () => {
    await navigator.clipboard.writeText(SHARE_MESSAGE);
    toast({ title: "Message copied!", description: "Paste it in an Instagram DM." });
    setOpen(false);
  };

  const options = [
    { label: "Copy link", icon: Copy, action: copyLink },
    { label: "WhatsApp", icon: MessageCircle, action: shareWhatsApp },
    { label: "iMessage", icon: Send, action: shareIMessage },
    { label: "Instagram DM", icon: Instagram, action: shareInstagram },
  ];

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-2xl mx-auto px-5">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="rounded-2xl bg-secondary/30 border border-border/40 p-8 md:p-10 text-center"
        >
          <motion.div variants={fadeUp} custom={0}>
            <Share2 className="w-10 h-10 text-primary mx-auto mb-4" />
          </motion.div>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="font-display text-2xl sm:text-3xl font-semibold mb-3"
          >
            Planning a trip with friends?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto mb-6"
          >
            Group trips always start in a group chat. Send this to your friends so you can plan together without the money drama.
          </motion.p>
          <motion.div variants={fadeUp} custom={3}>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button size="lg" className="rounded-full px-8 gap-2">
                  Send to your group chat <Share2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="center">
                <div className="flex flex-col gap-1">
                  {options.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={opt.action}
                      className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary transition-colors text-left"
                    >
                      <opt.icon className="h-4 w-4 text-muted-foreground" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ShareGroupChat;
