import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { format } from "date-fns";

interface TripDetailsCardProps {
  trip: {
    destination: string;
    start_date: string;
    end_date: string;
    vibe: string;
    per_person_budget: number;
  };
}

const TripDetailsCard = ({ trip }: TripDetailsCardProps) => (
  <Card className="rounded-2xl border-0 bg-card shadow-sm">
    <CardHeader className="p-4 pb-2">
      <CardTitle className="text-sm font-medium flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-primary" /> Trip Details
      </CardTitle>
    </CardHeader>
    <CardContent className="p-4 pt-0 space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Destination</span>
        <span className="font-medium text-foreground">{trip.destination}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Dates</span>
        <span className="font-medium text-foreground">
          {format(new Date(trip.start_date), "MMM d")} – {format(new Date(trip.end_date), "MMM d, yyyy")}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Vibe</span>
        <Badge variant="secondary" className="text-[10px] capitalize">{trip.vibe}</Badge>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Per Person</span>
        <span className="font-medium text-foreground">${Number(trip.per_person_budget).toLocaleString()}</span>
      </div>
    </CardContent>
  </Card>
);

export default TripDetailsCard;
