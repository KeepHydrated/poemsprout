-- Add points column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0 NOT NULL;

-- Function to update points when a like is added
CREATE OR REPLACE FUNCTION public.update_points_on_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  poem_author_id UUID;
BEGIN
  -- Get the author of the poem
  SELECT user_id INTO poem_author_id
  FROM public.published_poems
  WHERE id = NEW.poem_id;

  -- Only award points if the liker is not the author
  IF NEW.user_id != poem_author_id THEN
    UPDATE public.profiles
    SET points = points + 1
    WHERE id = poem_author_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to update points when a like is removed
CREATE OR REPLACE FUNCTION public.update_points_on_unlike()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  poem_author_id UUID;
BEGIN
  -- Get the author of the poem
  SELECT user_id INTO poem_author_id
  FROM public.published_poems
  WHERE id = OLD.poem_id;

  -- Only remove points if the unliker is not the author
  IF OLD.user_id != poem_author_id THEN
    UPDATE public.profiles
    SET points = GREATEST(points - 1, 0)
    WHERE id = poem_author_id;
  END IF;

  RETURN OLD;
END;
$$;

-- Create trigger for adding likes
CREATE TRIGGER on_like_added
  AFTER INSERT ON public.poem_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_points_on_like();

-- Create trigger for removing likes
CREATE TRIGGER on_like_removed
  AFTER DELETE ON public.poem_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_points_on_unlike();