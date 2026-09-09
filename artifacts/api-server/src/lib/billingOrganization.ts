import { pool } from "@workspace/db";

/**
 * Les groupes portent l'abonnement Stripe sur l'organisation racine.
 * Une filiale conserve son propre périmètre de données, mais hérite du droit
 * d'accès SaaS accordé par le groupe auquel elle appartient.
 */
export async function getBillingOrganizationId(orgId: number): Promise<number> {
  const result = await pool.query<{ billing_org_id: number }>(
    `SELECT COALESCE(parent_id, id) AS billing_org_id
     FROM organizations
     WHERE id = $1
     LIMIT 1`,
    [orgId],
  );

  return result.rows[0]?.billing_org_id ?? orgId;
}