import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useTripRole = (tripId: string | undefined) => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["trip-role", tripId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_members")
        .select("role")
        .eq("trip_id", tripId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tripId && !!user?.id,
  });

  return {
    role: data?.role || "member",
    isOrganizer: data?.role === "organizer",
    isMember: !!data,
    isLoading,
  };
};
