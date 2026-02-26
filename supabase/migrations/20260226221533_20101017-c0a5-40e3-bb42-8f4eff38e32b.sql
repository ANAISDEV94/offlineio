
-- New table: organizer_bookings
CREATE TABLE public.organizer_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'not_booked',
  booking_url text,
  confirmation_number text,
  receipt_url text,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trip_id, category)
);

ALTER TABLE public.organizer_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view organizer bookings"
  ON public.organizer_bookings FOR SELECT
  USING (is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Organizers can insert organizer bookings"
  ON public.organizer_bookings FOR INSERT
  WITH CHECK (is_trip_organizer(auth.uid(), trip_id));

CREATE POLICY "Organizers can update organizer bookings"
  ON public.organizer_bookings FOR UPDATE
  USING (is_trip_organizer(auth.uid(), trip_id));

CREATE POLICY "Organizers can delete organizer bookings"
  ON public.organizer_bookings FOR DELETE
  USING (is_trip_organizer(auth.uid(), trip_id));

CREATE TRIGGER update_organizer_bookings_updated_at
  BEFORE UPDATE ON public.organizer_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- New table: trip_documents
CREATE TABLE public.trip_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view trip documents"
  ON public.trip_documents FOR SELECT
  USING (is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Organizers can insert trip documents"
  ON public.trip_documents FOR INSERT
  WITH CHECK (is_trip_organizer(auth.uid(), trip_id));

CREATE POLICY "Organizers can delete trip documents"
  ON public.trip_documents FOR DELETE
  USING (is_trip_organizer(auth.uid(), trip_id));

-- Storage bucket for trip documents
INSERT INTO storage.buckets (id, name, public) VALUES ('trip-documents', 'trip-documents', true);

CREATE POLICY "Members can view trip document files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'trip-documents');

CREATE POLICY "Organizers can upload trip document files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'trip-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Organizers can delete trip document files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'trip-documents' AND auth.role() = 'authenticated');
