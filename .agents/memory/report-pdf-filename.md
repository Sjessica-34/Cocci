---
name: Nom des PDF RSE
description: Nom fiable des exports PDF RSE depuis l’aperçu Replit.
---

L’aperçu Replit peut conserver son propre titre dans le dialogue système « Enregistrer en PDF », même lorsqu’un clic modifie temporairement `document.title`. L’export RSE doit donc ouvrir une page d’impression dédiée dont le titre est défini dès sa création.

**Why:** le navigateur utilise alors `Rapport RSE Cocci` comme nom suggéré, au lieu du titre du conteneur Replit.

**How to apply:** conserver la copie du contenu du rapport et ses styles dans la page d’impression ; ne pas modifier le contenu éditorial ou la mise en page du rapport pour changer son nom de fichier.