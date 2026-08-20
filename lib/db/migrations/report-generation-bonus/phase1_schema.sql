-- Crédits de générations RSE ajoutés manuellement par un superadmin.
-- Le crédit est lié à l'exercice afin de ne jamais augmenter le quota d'un
-- autre exercice de l'organisation.
ALTER TABLE rse_report_drafts
  ADD COLUMN IF NOT EXISTS generation_bonus integer NOT NULL DEFAULT 0;