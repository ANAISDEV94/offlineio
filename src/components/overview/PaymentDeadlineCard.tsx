import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { format } from "date-fns";

interface PaymentDeadlineCardProps {
  paymentDeadline: string;
  paymentDeadlineDays: number;
}

const PaymentDeadlineCard = ({ paymentDeadline, paymentDeadlineDays }: PaymentDeadlineCardProps) => (
  <Card className="rounded-2xl border-0 bg-destructive/5 shadow-sm">
    <CardContent className="p-4 flex items-center gap-3">
      <Clock className="h-5 w-5 text-destructive" />
      <div>
        <p className="text-sm font-medium text-foreground">Payment Deadline</p>
        <p className="text-xs text-muted-foreground">
          {paymentDeadlineDays > 0
            ? `${paymentDeadlineDays} days left - ${format(new Date(paymentDeadline), "MMM d, yyyy")}`
            : "Deadline passed"}
        </p>
      </div>
    </CardContent>
  </Card>
);

export default PaymentDeadlineCard;
