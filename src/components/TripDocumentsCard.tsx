import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Trash2, ExternalLink, Loader2 } from "lucide-react";

interface TripDocumentsCardProps {
  tripId: string;
  isOrganizer: boolean;
}

const TripDocumentsCard = ({ tripId, isOrganizer }: TripDocumentsCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: documents = [] } = useQuery({
    queryKey: ["trip-documents", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_documents" as any)
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const deleteDoc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trip_documents" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-documents", tripId] });
      toast({ title: "Document deleted" });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const docTitle = title.trim() || file.name;
    setUploading(true);
    try {
      const path = `${tripId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("trip-documents").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("trip-documents").getPublicUrl(path);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("trip_documents" as any).insert({
        trip_id: tripId,
        title: docTitle,
        file_url: urlData.publicUrl,
        uploaded_by: user!.id,
      } as any);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["trip-documents", tripId] });
      setTitle("");
      toast({ title: "Document uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="rounded-2xl border-0 shadow-sm glass-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trip Documents</p>
        </div>

        {isOrganizer && (
          <div className="flex gap-2">
            <Input
              placeholder="Document title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="rounded-xl text-sm h-9 flex-1"
            />
            <label className="cursor-pointer">
              <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" onChange={handleUpload} />
              <Button size="sm" className="rounded-xl h-9 gap-1.5" asChild disabled={uploading}>
                <span>
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Upload
                </span>
              </Button>
            </label>
          </div>
        )}

        {documents.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No documents uploaded yet</p>
        ) : (
          documents.map((doc: any) => (
            <div key={doc.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-primary truncate flex-1">
                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                {doc.title}
              </a>
              {isOrganizer && (
                <button onClick={() => deleteDoc.mutate(doc.id)} className="text-muted-foreground hover:text-destructive ml-2">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default TripDocumentsCard;
