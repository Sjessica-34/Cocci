---
name: Reprise d’intention de souscription
description: Règle produit pour conserver une demande de souscription pendant l’authentification et l’onboarding.
---

Conserver l’intention explicite de souscrire séparément de la simple formule sélectionnée. Ne créer une session Stripe Checkout qu’après une authentification réussie, la création de l’organisation, la vérification des droits et du statut d’abonnement.

**Why:** le parcours doit demander un seul clic sur « Souscrire » tout en évitant de créer des clients, sessions ou abonnements Stripe sans utilisateur ni organisation associés.

**How to apply:** propager l’intention à travers connexion, inscription et onboarding ; la consommer quand Checkout est effectivement créé ; l’effacer si un abonnement Stripe actif est détecté. Ne pas reprendre Checkout après une simple consultation de formule.

Conserver la tranche choisie avant l’authentification dans un stockage durable du navigateur, la synchroniser avec la progression serveur après authentification, puis reprendre directement la bonne étape. La formule reste déterminée par la tranche et ne doit pas être demandée une seconde fois. Garder le choix du type de groupe avant la création serveur afin de préserver son initialisation existante.

**Why:** l’utilisateur demande un parcours Cocci sans ressaisie, reprenable après actualisation ou retour, sans changement des tarifs ni de la logique métier des groupes.

**How to apply:** utiliser la progression serveur dès qu’un compte existe et le stockage local uniquement pour les choix pré-authentification ; préserver l’étape des filiales pour les groupes.

Pour les contrôles d’abonnement exécutés immédiatement après l’authentification Clerk, demander un jeton frais dans l’appel concerné et relancer une seule fois un `401` transitoire.

**Why:** juste après la création de compte, le fournisseur de jeton global peut ne pas être encore prêt ; le statut est alors refusé et bloque la reprise sûre de Checkout.

**How to apply:** ne jamais ouvrir Checkout tant que le statut n’est pas confirmé ; afficher une action de relance en cas d’échec persistant.

Le chargement du statut doit aussi être borné dans son ensemble : l’obtention du jeton Clerk peut rester pendante avant même qu’une requête HTTP ne soit envoyée.

**Why:** une promesse de jeton non résolue laisse le composant en état de vérification indéfini, sans trace côté API et sans possibilité de reprendre Checkout.

**How to apply:** appliquer des délais au jeton, à la requête de statut et au cycle complet ; transformer tout dépassement en erreur relançable.