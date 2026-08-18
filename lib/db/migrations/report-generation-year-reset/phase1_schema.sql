-- Ajoute la colonne generation_year à rse_report_drafts.
-- Elle stocke l'année civile du dernier compteur.
-- Valeur 0 = jamais généré (sera écrasée dès la première génération).
ALTER TABLE rse_report_drafts
  ADD COLUMN IF NOT EXISTS generation_year integer NOT NULL DEFAULT 0;

-- Initialise l'année sur les lignes existantes qui ont déjà des générations
-- (on suppose qu'elles datent de l'année courante, elles ne seront pas réinitialisées prématurément)
UPDATE rse_report_drafts
  SET generation_year = EXTRACT(YEAR FROM updated_at)::integer
  WHERE generation_count > 0;
