---
name: Invariants objets privés et propriétaires
description: Garanties de concurrence à préserver pour les ACL d’objets et le dernier propriétaire actif.
---

Une finalisation d’upload privé doit utiliser une autorisation serveur courte, liée au chemin, à l’utilisateur et à l’organisation. Elle ne devient consommée qu’après écriture réussie de l’ACL ; une panne de stockage doit permettre un nouvel essai sûr.

**Why:** une finalisation fondée sur des paramètres client permet de réattribuer un chemin connu, tandis qu’une consommation trop précoce rend un upload irrécupérable après une panne transitoire.

**How to apply:** verrouiller la ligne d’autorisation, revalider l’adhésion active sous le verrou d’organisation, écrire l’ACL, puis consommer l’autorisation dans la même transaction. Pour un objet d’organisation, ne jamais donner à l’uploader un droit permanent contournant le groupe.

La suppression de compte, la suppression d’un membre et la rétrogradation d’un propriétaire doivent partager le même verrou transactionnel par organisation et compter uniquement les autres propriétaires actifs.

**Why:** deux opérations concurrentes, ou un propriétaire invité/suspendu compté comme remplaçant, peuvent laisser une organisation sans administrateur utilisable.

**How to apply:** acquérir les verrous d’organisation dans un ordre stable, puis vérifier la présence d’un autre membre `owner` et `active` avant toute mutation.