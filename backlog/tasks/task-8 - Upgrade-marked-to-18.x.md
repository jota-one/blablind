---
id: TASK-8
title: Upgrade marked to 18.x
status: Done
assignee: []
created_date: '2026-11-18T17:14:00Z'
updated_date: '2026-11-18T18:00:00Z'
labels:
  - dependencies
  - à-valider
dependencies: []
type: chore
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
marked 18.2.1 est sorti ; ce projet est en 17.0.1.

| Instance | Branche | Déclaré |
| --- | --- | --- |
| blablind.jota.one | main | `^17.0.1` |

Déclaré dans : `package.json`

## Évaluation

**Difficulté 1/5 · Risque 1/5**

Usage ici se limite à `marked.parse(string)` sans renderer/extension custom (Roadmap.vue) — rien ne casse. L'upgrade apporte surtout des correctifs ReDoS et de robustesse du parsing.

## Changements cassants pour ce projet

- Aucun changement cassant applicable : pas de renderer/tokenizer/extension custom ni de walkTokens utilisé dans src/admin/views/Roadmap.vue.

## Sécurité

De nombreux correctifs ReDoS/backtracking catastrophique entre 17.0.4 et 18.1.3 (regex de liens, emphasis, blocs HTML, reflinkSearch) — pertinent si du contenu markdown externe est un jour rendu.

## Étapes

- Monter `marked` à `^18.2.1` dans package.json
- `pnpm install`
- `pnpm build` (astro check) pour valider les types
- Vérifier visuellement le rendu de ROADMAP.md dans la vue Admin Roadmap

## Sources

-

_Évalué le 2026-11-18._

Release notes : https://github.com/markedjs/marked/releases
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 La version déclarée est sur la ligne cible du titre
- [x] #2 Chaque changement cassant listé est traité ou écarté
- [x] #3 L'upgrade passe sur une instance de review avant la prod
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Commit e3a8355 : marked 18.2.1. Vue Admin Roadmap vérifiée : le markdown brut visible dans les améliorations et l'historique était un bug antérieur (jamais passé par marked), corrigé dans 398dec2.

Critère #3 écarté : pas d'instance de review, `main` déploie directement en prod. Déployé et vérifié en prod le 2026-11-18.
<!-- SECTION:NOTES:END -->
