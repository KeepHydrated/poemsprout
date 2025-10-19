-- Create poem_likes table
CREATE TABLE public.poem_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  poem_id UUID NOT NULL REFERENCES public.published_poems(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, poem_id)
);

-- Enable Row Level Security
ALTER TABLE public.poem_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for poem_likes
CREATE POLICY "Anyone can view likes"
ON public.poem_likes
FOR SELECT
USING (true);

CREATE POLICY "Users can like poems"
ON public.poem_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
ON public.poem_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_poem_likes_poem_id ON public.poem_likes(poem_id);
CREATE INDEX idx_poem_likes_user_id ON public.poem_likes(user_id);