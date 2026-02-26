import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Save, Upload, Loader2 } from "lucide-react";

interface OrganizerBookingCardProps {
  tripId: string;
  category: string;
  label: string;
  emoji: string;
  isOrganizer: boolean;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  not_booked: { bg: "bg-muted", text: "text-muted-foreground", label: "Not Booked" },
  in_progress: { bg: "bg-yellow-100", text: "text-yellow-700", label: "In Progress" },
  booked: { bg: "bg-accent/20", text: "text-accent", label: "Booked" },
};

const OrganizerBookingCard = ({ tripId, category, label, emoji, isOrganizer }: OrganizerBookingCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: booking } = useQuery({
    queryKey: ["organizer-booking", tripId, category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizer_bookings" as any)
        .select("*")
        .eq("trip_id", tripId)
        .eq("category", category)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const [form, setForm] = useState({
    status: booking?.status || "not_booked",
    booking_url: booking?.booking_url || "",
    confirmation_number: booking?.confirmation_number || "",
    notes: booking?.notes || "",
    receipt_url: booking?.receipt_url || "",
  });

  // Sync form when booking data loads
  const currentStatus = form.status || booking?.status || "not_booked";
  const currentUrl = form.booking_url || booking?.booking_url || "";
  const currentConfirmation = form.confirmation_number || booking?.confirmation_number || "";
  const currentNotes = form.notes || booking?.notes || "";
  const currentReceipt = booking?.receipt_url || form.receipt_url || "";

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        trip_id: tripId,
        category,
        status: form.status || currentStatus,
        booking_url: form.booking_url || null,
        confirmation_number: form.confirmation_number || null,
        notes: form.notes || null,
        receipt_url: form.receipt_url || currentReceipt || null,
      };

      if (booking?.id) {
        const { error } = await supabase.from("organizer_bookings" as any).update(payload as any).eq("id", booking.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("organizer_bookings" as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizer-booking", tripId, category] });
      toast({ title: `${label} booking updated` });
    },
    onError: (err: any) => {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${tripId}/${category}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("trip-documents").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("trip-documents").getPublicUrl(path);
      setForm(prev => ({ ...prev, receipt_url: urlData.publicUrl }));
      toast({ title: "Receipt uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const style = STATUS_STYLES[currentStatus] || STATUS_STYLES.not_booked;

  return (
    <Card className="border-0 shadow-sm bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">{emoji}</span>
            <p className="text-sm font-medium">{label} Booking</p>
          </div>
          <Badge className={`text-[10px] border-0 ${style.bg} ${style.text}`}>{style.label}</Badge>
        </div>

        {isOrganizer ? (
          <>
            <div className="space-y-2">
              <select
                value={form.status || currentStatus}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                className="rounded-xl text-sm h-9 border border-input bg-background px-3 w-full"
              >
                <option value="not_booked">Not Booked</option>
                <option value="in_progress">In Progress</option>
                <option value="booked">Booked</option>
              </select>
              <Input
                placeholder="Booking URL"
                value={form.booking_url || currentUrl}
                onChange={e => setForm(prev => ({ ...prev, booking_url: e.target.value }))}
                className="rounded-xl text-sm"
              />
              <Input
                placeholder="Confirmation number"
                value={form.confirmation_number || currentConfirmation}
                onChange={e => setForm(prev => ({ ...prev, confirmation_number: e.target.value }))}
                className="rounded-xl text-sm"
              />
              <Textarea
                placeholder="Notes..."
                value={form.notes || currentNotes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                className="rounded-xl text-sm min-h-[60px]"
              />
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleFileUpload} />
                  <div className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    {currentReceipt ? "Replace receipt" : "Upload receipt"}
                  </div>
                </label>
                {currentReceipt && (
                  <a href={currentReceipt} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> View
                  </a>
                )}
              </div>
            </div>
            <Button size="sm" className="w-full rounded-xl gap-1.5" onClick={() => upsert.mutate()} disabled={upsert.isPending}>
              {upsert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </Button>
          </>
        ) : (
          <div className="space-y-2 text-sm">
            {currentUrl && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Link:</span>
                <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
                  <ExternalLink className="h-3 w-3 shrink-0" /> {currentUrl}
                </a>
              </div>
            )}
            {currentConfirmation && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Confirmation:</span>
                <span className="text-xs font-medium">{currentConfirmation}</span>
              </div>
            )}
            {currentNotes && (
              <div>
                <span className="text-muted-foreground text-xs">Notes:</span>
                <p className="text-xs mt-0.5">{currentNotes}</p>
              </div>
            )}
            {currentReceipt && (
              <a href={currentReceipt} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> View Receipt
              </a>
            )}
            {!currentUrl && !currentConfirmation && !currentNotes && !currentReceipt && (
              <p className="text-xs text-muted-foreground">No booking details yet.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrganizerBookingCard;
