CREATE OR REPLACE FUNCTION public.consume_credit()
 RETURNS TABLE(ok boolean, credits_used_month integer, credits_total_month integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE s public.account_settings;
BEGIN
  SELECT * INTO s FROM public.account_settings ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF s.id IS NULL THEN
    INSERT INTO public.account_settings DEFAULT VALUES RETURNING * INTO s;
  END IF;
  IF s.credits_used_month >= s.credits_total_month THEN
    RETURN QUERY SELECT false, s.credits_used_month, s.credits_total_month;
    RETURN;
  END IF;
  UPDATE public.account_settings a
     SET credits_used_month = a.credits_used_month + 1
   WHERE a.id = s.id
  RETURNING * INTO s;
  RETURN QUERY SELECT true, s.credits_used_month, s.credits_total_month;
END;
$function$;