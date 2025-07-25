-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'name', NEW.email);
  
  INSERT INTO public.user_statistics (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;