import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DashboardMember {
  user_id: string;
  display_name: string | null;
  role: string;
  share: number;
  paid: number;
  remaining: number;
  status: string;
  pct_complete: number;
}

export interface DashboardCurrentUser {
  user_id: string;
  role: string;
  display_name: string | null;
  share: number;
  paid: number;
  owe: number;
  status: string;
  has_payment_method: boolean;
}

export interface TripDashboard {
  trip_id: string;
  trip_name: string;
  destination: string;
  start_date: string;
  end_date: string;
  vibe: string;
  cover_image_url: string | null;
  visibility: string;
  invite_code: string | null;
  created_by: string;
  max_spots: number;
  total_cost: number;
  per_person_cost: number;
  funded_total: number;
  remaining_total: number;
  funded_percent: number; // 0-1
  payment_deadline: string | null;
  days_to_deadline: number | null;
  days_to_trip: number;
  health_score: number;
  health_label: string;
  current_user: DashboardCurrentUser;
  members: DashboardMember[];
}

export const useTripDashboard = (tripId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["trip-dashboard", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_trip_dashboard", {
        p_trip_id: tripId!,
      });
      if (error) throw error;
      return data as unknown as TripDashboard;
    },
    enabled: !!tripId && !!user?.id,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["trip-dashboard", tripId] });
  };

  return {
    dashboard: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refresh,
  };
};
