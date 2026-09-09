---
name: Médias privés dans le DOCX RSE
description: Règle de génération des organigrammes et photos protégés dans le fichier RSE téléchargé.
---

Le générateur DOCX doit résoudre les URLs de documents protégés directement depuis la base, en vérifiant l’organisation et l’exercice courant, puis intégrer les octets image dans le document. Une URL seule ne suffit pas : le fichier téléchargé n’a pas le contexte d’authentification du navigateur.

**Pourquoi:** l’aperçu web peut charger une image avec le token Clerk alors que le DOCX est construit côté serveur.

**Comment appliquer:** pour tout nouveau média du rapport, supporter séparément les documents privés liés à l’exercice et les URLs externes, et conserver un fallback textuel si le format n’est pas intégrable.