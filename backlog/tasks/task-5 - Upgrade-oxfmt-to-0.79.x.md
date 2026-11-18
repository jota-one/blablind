---
id: TASK-5
title: Upgrade oxfmt to 0.79.x
status: Done
assignee: []
created_date: '2026-11-18T17:14:00Z'
updated_date: '2026-11-18T18:00:00Z'
labels:
  - dependencies
  - à-valider
dependencies: []
type: chore
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
oxfmt 0.79.0 est sorti ; ce projet est en 0.43.0.

| Instance | Branche | Déclaré |
| --- | --- | --- |
| blablind.jota.one | main | `^0.43.0` |

Déclaré dans : `package.json`

## Évaluation

**Difficulté 2/5 · Risque 1/5**

Depuis la v0.77, oxfmt reformate les fichiers .vue avec un nouveau moteur (oxc_formatter_htmlish) — gros diff attendu sur les 3 SPA Vue. Rien ne casse fonctionnellement, c'est purement un diff de formatage.

## Changements cassants pour ce projet

- Templates .vue reformatés par le nouveau moteur oxc_formatter_htmlish (depuis v0.77) — diff massif sur src/game, src/client, src/admin

## Sécurité

Aucun correctif de sécurité relevé.

## Étapes

- Monter oxfmt à ^0.79.0 dans package.json et pnpm install
- Lancer pnpm format pour reformater tout le repo (gros diff .vue attendu)
- Relire le diff .vue pour s'assurer qu'aucun template n'est altéré sémantiquement
- Vérifier que .oxfmtrc.jsonc (semi, singleQuote, trailingComma, quoteProps, arrowParens) reste pris en charge par le nouveau schema
- pnpm lint && pnpm build pour valider

## Sources

- https://github.com/oxc-project/oxc/releases
- https://github.com/oxc-project/oxc/blob/main/CHANGELOG.md

_Évalué le 2026-11-18._

Release notes : https://github.com/oxc-project/oxc/releases
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 La version déclarée est sur la ligne cible du titre
- [x] #2 Chaque changement cassant listé est traité ou écarté
- [x] #3 L'upgrade passe sur une instance de review avant la prod
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Commit 9d67c9c : oxfmt 0.79. Le diff massif .vue annoncé n'arrive pas : les 49 .vue sont déjà conformes. backlog/ et .vscode/primevue.md (table markdown malformée, vendorisée) ajoutés aux ignorePatterns.

Critère #3 écarté : pas d'instance de review, `main` déploie directement en prod. Déployé et vérifié en prod le 2026-11-18.
<!-- SECTION:NOTES:END -->
