import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sampleOutfits } from "@/lib/sample-data";
import { motion } from "framer-motion";
import { Camera, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FitsTab = () => {
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <Button
        className="w-full rounded-xl h-12"
        onClick={() => toast({ title: "Coming soon! 📸", description: "Outfit uploads will be available with storage integration." })}
      >
        <Camera className="mr-2 h-4 w-4" /> Post Your Fit 👗
      </Button>

      <div className="grid grid-cols-2 gap-3">
        {sampleOutfits.map((outfit, i) => (
          <motion.div
            key={outfit.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-0 shadow-md overflow-hidden">
              <div className="relative">
                <img
                  src={outfit.image}
                  alt={outfit.caption}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
                <Badge className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-foreground text-[10px]">
                  {outfit.occasion}
                </Badge>
              </div>
              <CardContent className="p-3">
                <p className="text-xs font-semibold">{outfit.user}</p>
                <p className="text-xs text-muted-foreground">{outfit.caption}</p>
                <div className="flex items-center gap-1 mt-2">
                  {outfit.reactions.map((r, ri) => (
                    <span key={ri} className="text-sm">{r}</span>
                  ))}
                  <button className="ml-auto">
                    <Heart className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FitsTab;
