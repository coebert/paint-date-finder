-- Add policies for public event management (for now, allow all operations for simplicity)
-- In production, you'd add authentication and restrict to admins

CREATE POLICY "Anyone can insert events" 
ON public.events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update events" 
ON public.events 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete events" 
ON public.events 
FOR DELETE 
USING (true);