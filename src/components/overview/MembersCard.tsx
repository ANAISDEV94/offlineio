import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, X, Shield } from "lucide-react";

interface Member {
  id: string;
  user_id: string;
  role: string;
  profile?: { display_name: string | null; avatar_url: string | null };
}

interface Payment {
  user_id: string;
  amount: number;
  amount_paid: number;
  status: string;
}

interface MembersCardProps {
  members: Member[];
  payments: Payment[];
  isOrganizer: boolean;
  currentUserId?: string;
  onRemoveMember: (memberId: string) => void;
  onToggleRole: (memberId: string, currentRole: string) => void;
  onAddMember: (email: string) => void;
  maxSpots: number;
}

const avatarColors = ["bg-primary/20", "bg-secondary", "bg-accent/20", "bg-muted"];

const MembersCard = ({
  members,
  payments,
  isOrganizer,
  currentUserId,
  onRemoveMember,
  onToggleRole,
  onAddMember,
  maxSpots,
}: MembersCardProps) => {
  const [showAddInput, setShowAddInput] = useState(false);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const getStatusBadge = (userId: string) => {
    const payment = payments.find((p) => p.user_id === userId);
    if (!payment) return <Badge variant="outline" className="text-[10px]">No plan</Badge>;
    if (Number(payment.amount_paid) >= Number(payment.amount))
      return <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">Paid</Badge>;
    if (Number(payment.amount_paid) >= Number(payment.amount) * 0.5)
      return <Badge variant="secondary" className="text-[10px]">On Track</Badge>;
    return <Badge variant="destructive" className="text-[10px]">Behind</Badge>;
  };

  const handleAdd = async () => {
    if (!email.trim()) return;
    setAdding(true);
    await onAddMember(email.trim());
    setEmail("");
    setShowAddInput(false);
    setAdding(false);
  };

  return (
    <Card className="rounded-2xl border-0 bg-card shadow-sm">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" /> Members
            <span className="text-muted-foreground font-normal ml-1">
              {members.length} / {maxSpots}
            </span>
          </CardTitle>
          {isOrganizer && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddInput(!showAddInput)}
              className="rounded-xl text-xs gap-1 h-7"
            >
              <UserPlus className="h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        {showAddInput && (
          <div className="flex gap-2 pb-2">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="rounded-xl text-sm h-8"
              type="email"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={adding || !email.trim()}
              className="rounded-xl text-xs h-8"
            >
              {adding ? "..." : "Add"}
            </Button>
          </div>
        )}

        {members.map((m, i) => (
          <div key={m.id} className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2.5">
              <Avatar className={`h-8 w-8 ${avatarColors[i % avatarColors.length]}`}>
                <AvatarFallback className="text-[10px] font-medium bg-transparent text-foreground">
                  {(m.profile?.display_name || "??").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">{m.profile?.display_name || "Unknown"}</p>
                <div className="flex items-center gap-1">
                  {isOrganizer && m.user_id !== currentUserId ? (
                    <button
                      onClick={() => onToggleRole(m.id, m.role)}
                      className="text-[10px] text-muted-foreground capitalize hover:text-primary transition-colors flex items-center gap-0.5"
                    >
                      {m.role === "organizer" && <Shield className="h-2.5 w-2.5" />}
                      {m.role}
                    </button>
                  ) : (
                    <p className="text-[10px] text-muted-foreground capitalize flex items-center gap-0.5">
                      {m.role === "organizer" && <Shield className="h-2.5 w-2.5" />}
                      {m.role}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {getStatusBadge(m.user_id)}
              {isOrganizer && m.user_id !== currentUserId && (
                <button
                  onClick={() => onRemoveMember(m.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default MembersCard;
