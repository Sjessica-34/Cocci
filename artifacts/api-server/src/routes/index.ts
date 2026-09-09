import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import usersRouter from "./users";
import organizationsRouter from "./organizations";
import membersRouter from "./members";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import resourcesRouter from "./resources";
import stakeholdersRouter from "./stakeholders";
import issuesRouter from "./issues";
import carbonRouter from "./carbon";
import captationCarboneRouter from "./captationCarbone";
import documentsRouter from "./documents";
import numeriqueResponsableRouter from "./numeriqueResponsable";
import impactScoreResultRouter from "./impactScoreResult";
import suppliersRouter from "./suppliers";
import responsiblePurchasesRouter from "./responsiblePurchases";
import biodiversiteRouter from "./biodiversite";
import labelsRouter from "./labels";
import exercisesRouter from "./exercises";
import barometreSocialRouter from "./barometreSocial";
import employmentRouter from "./employment";
import actionPlanRouter from "./actionPlan";
import planSlotsRouter from "./planSlots";
import diagnosticRouter from "./diagnostic";
import reportDraftRouter from "./reportDraft";
import echangesRouter from "./echanges";
import auditRouter from "./audit";
import publicRseRouter from "./publicRse";
import subscriptionsRouter from "./subscriptions";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership } from "../middlewares/exerciseScope";
import { requireActiveSubscription } from "../middlewares/requireActiveSubscription";

const router: IRouter = Router();

function requireActiveSubscriptionExceptOrganizationSetup(
  req: Parameters<typeof requireActiveSubscription>[0],
  res: Parameters<typeof requireActiveSubscription>[1],
  next: Parameters<typeof requireActiveSubscription>[2],
): void {
  // Choosing the group calculation mode is part of onboarding, before the
  // first subscription exists. Its own route still enforces auth and role.
  const isGroupModeSetupUpdate =
    req.method === "PATCH"
    && (req.path === "/" || req.path === "")
    && req.body
    && Object.keys(req.body).length === 1
    && Object.prototype.hasOwnProperty.call(req.body, "groupMode");

  if (isGroupModeSetupUpdate) {
    next();
    return;
  }
  requireActiveSubscription(req, res, next);
}

router.use(healthRouter);
router.use(storageRouter);
router.use(usersRouter);

// Routes d'abonnement montées AVANT le paywall : un utilisateur avec un abonnement
// suspendu doit pouvoir consulter son statut et accéder au checkout/portail Stripe
// pour se réabonner. Ces routes ont leurs propres gardes requireAuth + requireOrgMembership.
router.use(subscriptionsRouter);

// Paywall : toutes les routes /organizations/:orgId/* nécessitent un abonnement actif.
// La chaîne complète : auth → vérification d'appartenance → vérification d'abonnement.
// requireOrgMembership garantit que l'utilisateur est membre avant toute requête DB
// sur l'abonnement, et expose req.orgId pour requireActiveSubscription.
// Les super_admin sont exemptés dans requireOrgMembership (pas de vérif membres)
// et dans requireActiveSubscription (pas de vérif abonnement).
router.use(
  "/organizations/:orgId",
  requireAuth,
  requireOrgMembership,
  requireActiveSubscriptionExceptOrganizationSetup,
);

router.use(organizationsRouter);
router.use(exercisesRouter);
router.use(membersRouter);
router.use(dashboardRouter);
router.use(adminRouter);
router.use(resourcesRouter);
router.use(stakeholdersRouter);
router.use(issuesRouter);
router.use(carbonRouter);
router.use(captationCarboneRouter);
router.use(documentsRouter);
router.use(numeriqueResponsableRouter);
router.use(impactScoreResultRouter);
router.use(suppliersRouter);
router.use(responsiblePurchasesRouter);
router.use(biodiversiteRouter);
router.use(labelsRouter);
router.use(barometreSocialRouter);
router.use(employmentRouter);
router.use(actionPlanRouter);
router.use(planSlotsRouter);
router.use(diagnosticRouter);
router.use(reportDraftRouter);
router.use(echangesRouter);
router.use(auditRouter);
router.use(publicRseRouter);

export default router;
