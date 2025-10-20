-- Create comments table
CREATE TABLE public.poem_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poem_id UUID NOT NULL REFERENCES public.published_poems(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.poem_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view comments"
ON public.poem_comments
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create comments"
ON public.poem_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.poem_comments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.poem_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_poem_comments_updated_at
BEFORE UPDATE ON public.poem_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();