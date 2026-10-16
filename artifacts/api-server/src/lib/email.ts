import { Resend } from "resend";
import { logger } from "./logger";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Cocci <noreply@cocci.app>";
const GIFT_INVITATION_FROM_EMAIL =
  process.env.RESEND_GIFT_INVITATION_FROM_EMAIL
  ?? "Cocci <invitations@cocci-rse.fr>";

// ── Templates ─────────────────────────────────────────────────────────────────

function subscriptionConfirmationHtml(opts: {
  firstName: string | null;
  orgName: string;
  spaceUrl: string;
  portalUrl: string;
}): string {
  const greeting = opts.firstName ? `Bonjour ${opts.firstName},` : "Bonjour,";
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#1a5c3f;padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Cocci</h1>
            <p style="margin:8px 0 0;color:#a8d5b5;font-size:14px;">Plateforme RSE</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;color:#333;font-size:16px;">${greeting}</p>
            <p style="margin:0 0 16px;color:#333;font-size:16px;">
              Votre abonnement Cocci pour <strong>${opts.orgName}</strong> est maintenant <strong>actif</strong> 🎉
            </p>
            <p style="margin:0 0 24px;color:#555;font-size:15px;">
              Votre espace est prêt. Vous pouvez dès maintenant piloter votre démarche RSE, suivre vos plans d'actions et mesurer votre impact.
            </p>
            <!-- CTA principal -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
              <tr>
                <td style="background:#1a5c3f;border-radius:6px;">
                  <a href="${opts.spaceUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                    Accéder à mon espace →
                  </a>
                </td>
              </tr>
            </table>
            <!-- CTA secondaire -->
            <p style="margin:0 0 8px;color:#555;font-size:14px;">
              Pour gérer votre abonnement (factures, moyen de paiement, résiliation) :
            </p>
            <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="border:1px solid #1a5c3f;border-radius:6px;">
                  <a href="${opts.portalUrl}" style="display:inline-block;padding:10px 22px;color:#1a5c3f;font-size:14px;font-weight:600;text-decoration:none;">
                    Portail de gestion
                  </a>
                </td>
              </tr>
            </table>
            <hr style="border:none;border-top:1px solid #eee;margin:0 0 24px;">
            <p style="margin:0;color:#999;font-size:13px;">
              Cet email a été envoyé à l'administrateur de <strong>${opts.orgName}</strong> sur Cocci.<br>
              Si vous avez des questions, répondez à cet email ou contactez notre support.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendSubscriptionConfirmation(opts: {
  to: string;
  firstName: string | null;
  orgName: string;
  spaceUrl: string;
  portalUrl: string;
}): Promise<void> {
  const client = getResend();
  if (!client) {
    logger.warn(
      "RESEND_API_KEY not set — skipping subscription confirmation email",
    );
    return;
  }

  const { data, error } = await client.emails.send({
    from: FROM_EMAIL,
    to: opts.to,
    subject: `Votre abonnement Cocci est actif — ${opts.orgName}`,
    html: subscriptionConfirmationHtml(opts),
  });

  if (error) {
    logger.error({ error, to: opts.to }, "Failed to send subscription confirmation email");
  } else {
    logger.info({ emailId: data?.id, to: opts.to }, "Subscription confirmation email sent");
  }
}

export async function sendGiftInvitationEmail(opts: {
  to: string;
  organizationOffer: string;
  url: string;
  expiresAt: Date;
}): Promise<boolean> {
  const client = getResend();
  if (!client) {
    logger.warn("RESEND_API_KEY not set — skipping gift invitation email");
    return false;
  }
  try {
    const { error } = await client.emails.send({
      from: GIFT_INVITATION_FROM_EMAIL,
      to: opts.to,
      subject: "Votre invitation à découvrir Cocci",
      html: `<p>Vous êtes invité à découvrir Cocci avec l’offre ${opts.organizationOffer}.</p><p><a href="${opts.url}">Créer mon espace Cocci</a></p><p>Ce lien expire le ${opts.expiresAt.toLocaleDateString("fr-FR")} et ne peut être utilisé qu’une seule fois.</p>`,
    });
    if (error) {
      logger.error({ error, to: opts.to }, "Failed to send gift invitation email");
      return false;
    }
    return true;
  } catch (error) {
    logger.error({ error, to: opts.to }, "Failed to send gift invitation email");
    return false;
  }
}
