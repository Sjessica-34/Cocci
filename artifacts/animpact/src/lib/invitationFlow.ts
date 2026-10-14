export function invitationFailureMessage(
  status: number | undefined,
  context: "lookup" | "accept" = "accept",
): string {
  if (status === 410) {
    return "Cette invitation a expiré. Demandez à l’administrateur d’en envoyer une nouvelle.";
  }
  if (status === 409) {
    return "Ce compte est déjà rattaché à une autre organisation Cocci. Contactez son administrateur.";
  }
  if (status === 404) {
    return "Aucune invitation en attente ne correspond à cette adresse e-mail.";
  }
  if (status === 401) {
    return "Votre session n’est plus valide. Reconnectez-vous pour continuer.";
  }
  return context === "lookup"
    ? "Impossible de vérifier vos invitations. L’onboarding est suspendu pour éviter de créer une seconde organisation."
    : "Impossible de finaliser l’invitation. Vérifiez que vous êtes connecté avec l’adresse invitée, puis réessayez.";
}
