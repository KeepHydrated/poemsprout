-- Create saved_poems table for private poem drafts
CREATE TABLE public.saved_poems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_topic TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  poem_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_poems ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved poems
CREATE POLICY "Users can view their own saved poems"
ON public.saved_poems
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own saved poems
CREATE POLICY "Users can insert their own saved poems"
ON public.saved_poems
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved poems
CREATE POLICY "Users can update their own saved poems"
ON public.saved_poems
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own saved poems
CREATE POLICY "Users can delete their own saved poems"
ON public.saved_poems
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_saved_poems_updated_at
BEFORE UPDATE ON public.saved_poems
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();