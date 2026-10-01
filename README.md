# Gestion Présences — version web

Application web statique de gestion des présences, prête pour GitHub Pages. Elle fonctionne sans serveur, sans ChatGPT et peut être installée sur l’écran d’accueil d’un téléphone.

## Fonctionnalités

- connexion administrateur côté navigateur ;
- 64 membres préchargés ;
- prise de présence par date et actions groupées ;
- suivi annuel et statistiques ;
- ajout, modification, archivage et suppression des membres ;
- sauvegarde locale automatique dans le navigateur ;
- export et import d’une sauvegarde JSON ;
- fonctionnement hors ligne après la première ouverture ;
- interface responsive et PWA installable.

## Avertissement de sécurité

GitHub Pages héberge uniquement des fichiers publics et statiques. L’écran de connexion de cette application limite l’accès normal à l’interface, mais il ne constitue pas une protection serveur : une personne compétente peut inspecter ou modifier le code public et contourner ce verrou.

Les noms préchargés figurent également dans les fichiers publics. Pour une authentification réellement sécurisée, il faut utiliser un hébergement avec un serveur et une base de données privée.

## Tester localement

Depuis ce dossier :

```bash
python3 -m http.server 8080
```

Ouvrir ensuite `http://localhost:8080`.

## Publier sur GitHub Pages

1. Créer un dépôt GitHub vide, par exemple `gestion-presences-web`.
2. Envoyer ce dossier dans le dépôt :

```bash
git remote add origin https://github.com/VOTRE-COMPTE/gestion-presences-web.git
git push -u origin main
```

3. Dans GitHub, ouvrir **Settings → Pages**.
4. Dans **Build and deployment**, choisir **Deploy from a branch**.
5. Sélectionner la branche **main**, le dossier **/(root)**, puis enregistrer.
6. GitHub affichera ensuite l’adresse publique du site.

## Installer sur un téléphone

- Sur iPhone : ouvrir le site dans Safari, utiliser **Partager**, puis **Sur l’écran d’accueil**.
- Sur Android : ouvrir le site dans Chrome, puis choisir **Installer l’application**.

## Données et sauvegardes

Les présences sont stockées dans le `localStorage` du navigateur. Elles ne sont pas envoyées vers GitHub. Utiliser régulièrement le bouton **Sauvegarder** pour télécharger une copie JSON.

Effacer les données du navigateur ou désinstaller la PWA peut supprimer les présences locales. La sauvegarde JSON permet de les restaurer avec le bouton **Importer**.
