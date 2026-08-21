CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.account_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  firm_name TEXT NOT NULL DEFAULT '',
  oab TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT 'essencial',
  credits_total_month INTEGER NOT NULL DEFAULT 30,
  credits_used_month INTEGER NOT NULL DEFAULT 0,
  renewal_day INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT account_settings_singleton_true CHECK (singleton = true),
  CONSTRAINT account_settings_credits_nonneg CHECK (credits_used_month >= 0 AND credits_total_month >= 0),
  CONSTRAINT account_settings_renewal_day CHECK (renewal_day BETWEEN 1 AND 28)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_settings TO anon, authenticated;
GRANT ALL ON public.account_settings TO service_role;
ALTER TABLE public.account_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "single_tenant_all_account_settings" ON public.account_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER account_settings_updated_at BEFORE UPDATE ON public.account_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  opposing_party TEXT,
  court TEXT,
  case_type TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO anon, authenticated;
GRANT ALL ON public.cases TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "single_tenant_all_cases" ON public.cases FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER cases_updated_at BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.case_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'outro',
  description TEXT NOT NULL DEFAULT '',
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT case_activity_event_type CHECK (event_type IN ('resumo_gerado','peca_analisada','prazo_alterado','outro'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_activity TO anon, authenticated;
GRANT ALL ON public.case_activity TO service_role;
ALTER TABLE public.case_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "single_tenant_all_case_activity" ON public.case_activity FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX case_activity_case_id_idx ON public.case_activity(case_id);

CREATE TABLE public.case_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_kind TEXT NOT NULL DEFAULT 'enviado_pelo_advogado',
  file_url TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT case_files_kind CHECK (file_kind IN ('enviado_pelo_advogado','gerado_pela_aurora'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_files TO anon, authenticated;
GRANT ALL ON public.case_files TO service_role;
ALTER TABLE public.case_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "single_tenant_all_case_files" ON public.case_files FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX case_files_case_id_idx ON public.case_files(case_id);

CREATE TABLE public.deadlines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  kind TEXT NOT NULL DEFAULT 'prazo',
  priority TEXT NOT NULL DEFAULT 'informativo',
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT deadlines_kind CHECK (kind IN ('prazo','compromisso')),
  CONSTRAINT deadlines_priority CHECK (priority IN ('urgente','importante','informativo')),
  CONSTRAINT deadlines_status CHECK (status IN ('pendente','concluido'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deadlines TO anon, authenticated;
GRANT ALL ON public.deadlines TO service_role;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "single_tenant_all_deadlines" ON public.deadlines FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX deadlines_due_date_idx ON public.deadlines(due_date);
CREATE TRIGGER deadlines_updated_at BEFORE UPDATE ON public.deadlines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.legal_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  profile_type TEXT NOT NULL,
  court TEXT,
  grant_rate NUMERIC(5,2),
  avg_decision_days INTEGER,
  decisions_analyzed INTEGER NOT NULL DEFAULT 0,
  behavior_summary TEXT NOT NULL DEFAULT '',
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT legal_profiles_type CHECK (profile_type IN ('juiz','advogado'))
);
CREATE UNIQUE INDEX legal_profiles_name_type_key ON public.legal_profiles (lower(name), profile_type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_profiles TO anon, authenticated;
GRANT ALL ON public.legal_profiles TO service_role;
ALTER TABLE public.legal_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "single_tenant_all_legal_profiles" ON public.legal_profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.piece_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'so_peca',
  input_text TEXT,
  input_file_url TEXT,
  analysis_result TEXT NOT NULL DEFAULT '',
  suggestions TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT piece_analysis_mode CHECK (mode IN ('processo_completo','processo_mais_peca','so_peca'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.piece_analysis TO anon, authenticated;
GRANT ALL ON public.piece_analysis TO service_role;
ALTER TABLE public.piece_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "single_tenant_all_piece_analysis" ON public.piece_analysis FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.authorization_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  judge_name TEXT,
  opposing_lawyer_name TEXT,
  authorized BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.authorization_log TO anon, authenticated;
GRANT ALL ON public.authorization_log TO service_role;
ALTER TABLE public.authorization_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "single_tenant_all_authorization_log" ON public.authorization_log FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.consume_credit()
RETURNS TABLE (ok BOOLEAN, credits_used_month INTEGER, credits_total_month INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  UPDATE public.account_settings SET credits_used_month = credits_used_month + 1 WHERE id = s.id RETURNING * INTO s;
  RETURN QUERY SELECT true, s.credits_used_month, s.credits_total_month;
END;
$$;
GRANT EXECUTE ON FUNCTION public.consume_credit() TO anon, authenticated, service_role;

INSERT INTO public.account_settings (firm_name, oab, plan) VALUES ('Meu Escritório', '', 'essencial');