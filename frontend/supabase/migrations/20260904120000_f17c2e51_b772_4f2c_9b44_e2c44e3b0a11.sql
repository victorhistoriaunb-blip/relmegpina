-- Módulo de Cadastro Dinâmico de Clientes/Projetos (CRUD)
-- Clientes ficam por usuário e são usados para escopo de monitoramento por aba.

CREATE TABLE public.clientes (
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL DEFAULT '',
  setor text NOT NULL DEFAULT '',
  palavras_chave text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gerenciam seus clientes"
  ON public.clientes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX clientes_user_id_idx ON public.clientes (user_id);

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.clientes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes;