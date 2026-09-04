CREATE TABLE public.parlamentares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  partido text NOT NULL DEFAULT '',
  uf text NOT NULL DEFAULT '',
  cargo text NOT NULL DEFAULT '',
  interesse1 text NOT NULL DEFAULT '',
  interesse2 text NOT NULL DEFAULT '',
  contrario1 text NOT NULL DEFAULT '',
  contrario2 text NOT NULL DEFAULT '',
  setor1 text NOT NULL DEFAULT '',
  setor2 text NOT NULL DEFAULT '',
  setor3 text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  proposicao1 text NOT NULL DEFAULT '',
  ementa1 text NOT NULL DEFAULT '',
  link1 text NOT NULL DEFAULT '',
  proposicao2 text NOT NULL DEFAULT '',
  ementa2 text NOT NULL DEFAULT '',
  link2 text NOT NULL DEFAULT '',
  proposicao3 text NOT NULL DEFAULT '',
  ementa3 text NOT NULL DEFAULT '',
  link3 text NOT NULL DEFAULT '',
  anotacoes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parlamentares TO authenticated;
GRANT ALL ON public.parlamentares TO service_role;

ALTER TABLE public.parlamentares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gerenciam seus parlamentares"
  ON public.parlamentares FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX parlamentares_user_id_idx ON public.parlamentares (user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_parlamentares_updated_at
  BEFORE UPDATE ON public.parlamentares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.parlamentares REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parlamentares;