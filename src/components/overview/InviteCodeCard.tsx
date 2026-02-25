import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InviteCodeCardProps {
  inviteCode: string | null;
}

const InviteCodeCard = ({ inviteCode }: InviteCodeCardProps) => {
  const { toast } = useToast();

  if (!inviteCode) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    toast({ title: "Invite code copied!" });
  };

  return (
    <Card className="rounded-2xl border-0 bg-primary/5 shadow-sm">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Invite Code</p>
            <p className="text-sm font-mono font-semibold text-foreground tracking-wider">{inviteCode}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="rounded-xl text-xs gap-1">
          <Copy className="h-3.5 w-3.5" /> Copy
        </Button>
      </CardContent>
    </Card>
  );
};

export default InviteCodeCard;
