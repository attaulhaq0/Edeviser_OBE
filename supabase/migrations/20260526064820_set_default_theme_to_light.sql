ALTER TABLE public.profiles ALTER COLUMN theme_preference SET DEFAULT 'light'; UPDATE public.profiles SET theme_preference = 'light' WHERE theme_preference = 'system';;
