import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { samplePackingItems } from "@/lib/sample-data";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

const PackTab = () => {
  const [items, setItems] = useState(samplePackingItems);
  const [newItem, setNewItem] = useState("");

  const toggle = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems([...items, { id: Date.now().toString(), name: newItem, checked: false, suggested: false }]);
    setNewItem("");
  };

  const checkedCount = items.filter(i => i.checked).length;
  const daysUntil = 170; // mock

  return (
    <div className="space-y-4">
      {/* Reminder badges */}
      <div className="flex gap-2 flex-wrap">
        {daysUntil <= 14 && <Badge className="bg-peach text-foreground">📦 14 days — start packing!</Badge>}
        {daysUntil <= 7 && <Badge className="bg-blush text-foreground">⏰ 7 days — almost time!</Badge>}
        {daysUntil <= 3 && <Badge className="bg-primary text-primary-foreground">🚨 3 days — pack NOW!</Badge>}
        {daysUntil > 14 && <Badge variant="secondary">{daysUntil} days until trip ✈️</Badge>}
      </div>

      {/* Progress */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-mint/30 to-lavender/20">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Packing Progress</p>
          <p className="text-2xl font-display font-bold">{checkedCount} / {items.length}</p>
          <p className="text-xs text-muted-foreground">items packed ✓</p>
        </CardContent>
      </Card>

      {/* Add item */}
      <div className="flex gap-2">
        <Input
          placeholder="Add packing item..."
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addItem()}
          className="rounded-xl"
        />
        <Button onClick={addItem} size="icon" className="rounded-xl shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
          >
            <Card className={`border-0 shadow-sm transition-all ${item.checked ? "opacity-60" : ""}`}>
              <CardContent className="p-3 flex items-center gap-3">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={() => toggle(item.id)}
                />
                <span className={`text-sm flex-1 ${item.checked ? "line-through text-muted-foreground" : ""}`}>
                  {item.name}
                </span>
                {item.suggested && (
                  <Badge variant="secondary" className="text-[10px] px-1.5">suggested</Badge>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PackTab;
