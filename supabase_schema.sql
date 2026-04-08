-- 1. Création de la table des Catégories
CREATE TABLE public.categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Insertion des catégories de base
INSERT INTO public.categories (name) VALUES 
('Cotisations'), ('Dons'), ('Quêtes'), ('Ventes exceptionnelles'),
('Achats courants'), ('Secours/Aides'), ('Transports'), ('Frais de fonctionnement');

-- 2. Création de la table des Transactions
CREATE TABLE public.transactions (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(10) NOT NULL, -- 'income' ou 'expense'
    amount NUMERIC NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    reference VARCHAR(50) NOT NULL,
    initiator VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES auth.users(id), -- Lien avec l'utilisateur connecté
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Activation du Temps Réel (Realtime)
-- C'est ce qui permet aux autres écrans de se mettre à jour tout seuls
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;

-- 4. Sécurité (Row Level Security - RLS)
-- Ces règles permettent à n'importe quel utilisateur connecté (authentifié) de lire et écrire
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to transactions" ON public.transactions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to categories" ON public.categories
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
