import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sampleBookings } from "@/lib/sample-data";
import { motion } from "framer-motion";
import { ExternalLink, Plane, Hotel, MapPin } from "lucide-react";

const categoryIcons = {
  flight: <Plane className="h-4 w-4" />,
  hotel: <Hotel className="h-4 w-4" />,
  activity: <MapPin className="h-4 w-4" />,
};

const categoryLabels = {
  flight: "Flight",
  hotel: "Hotel",
  activity: "Activity",
};

const BookTab = () => {
  const categories = ["flight", "hotel", "activity"] as const;

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const items = sampleBookings.filter(b => b.category === cat);
        return (
          <div key={cat}>
            <h3 className="font-display font-bold text-base mb-3 flex items-center gap-2">
              {categoryIcons[cat]} {categoryLabels[cat]}s
            </h3>
            <div className="space-y-3">
              {items.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold text-sm">{b.title}</h4>
                        {b.price && (
                          <Badge variant="secondary" className="text-xs">
                            ${b.price}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{b.notes}</p>
                      {b.url && (
                        <a href={b.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="rounded-xl text-xs h-8">
                            <ExternalLink className="h-3 w-3 mr-1" /> View & Book
                          </Button>
                        </a>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BookTab;
