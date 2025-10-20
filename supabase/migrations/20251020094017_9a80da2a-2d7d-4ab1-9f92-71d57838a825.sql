-- Add parent_comment_id column to support nested comments
ALTER TABLE public.poem_comments
ADD COLUMN parent_comment_id uuid REFERENCES public.poem_comments(id) ON DELETE CASCADE;