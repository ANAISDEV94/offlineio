import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { sampleItinerary, sampleBudget } from "@/lib/sample-data";
import { motion } from "framer-motion";

const PlanTab = () => {
  const totalBudget = sampleBudget.reduce((s, b) => s + b.amount, 0);
  const totalSpent = sampleBudget.reduce((s, b) => s + b.spent, 0);

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Budget Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">
              ${totalSpent.toLocaleString()} of ${totalBudget.toLocaleString()} spent
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {sampleBudget.map((b) => (
              <div key={b.category}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{b.icon} {b.category}</span>
                  <span className="text-muted-foreground">${b.spent} / ${b.amount}</span>
                </div>
                <Progress value={(b.spent / b.amount) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Itinerary */}
      <div>
        <h3 className="font-display font-bold text-lg mb-3">Day-by-Day Itinerary</h3>
        <div className="space-y-4">
          {sampleItinerary.map((day) => (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: day.day * 0.1 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-display">Day {day.day}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {day.items.map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="text-xs text-muted-foreground w-16 pt-0.5 shrink-0">{item.time}</div>
                      <div>
                        <p className="text-sm font-medium">{item.activity}</p>
                        {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlanTab;
