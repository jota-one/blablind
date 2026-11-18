---
id: TASK-4
title: Upgrade pocketbase to 0.29.x
status: Done
assignee: []
created_date: '2026-11-18T17:14:00Z'
updated_date: '2026-11-18T18:00:00Z'
labels:
  - dependencies
  - à-valider
dependencies: []
type: chore
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
pocketbase 0.29.0 est sorti ; ce projet est en 0.26.0.

| Instance | Branche | Déclaré |
| --- | --- | --- |
| blablind.jota.one | main | `^0.26.0` |

Déclaré dans : `package.json`

## Évaluation

**Difficulté 1/5 · Risque 2/5**

Rien ne casse pour cette app : tous les changements sont des correctifs internes (pb.filter(), realtime subscribe, abort errors, getFullList batch size) sur des API déjà utilisées sans changement de signature. L'upgrade apporte juste des fixes de fiabilité.

## Changements cassants pour ce projet

Aucun relevé.

## Sécurité

Aucun correctif de sécurité mentionné dans ces release notes.

## Étapes

- Bump `pocketbase` à `^0.29.0` dans package.json puis `pnpm install`
- Relire les usages de pb.filter() (très nombreux, ex. useBuzzes.ts, useTracks.ts, Favorites.vue) pour vérifier qu'aucun ne passe un objet/array brut comme valeur (régression corrigée en 0.27.2/0.27.3, sans impact ici car seules des strings sont passées)
- pnpm build + pnpm test:unit
- Test manuel realtime (host election, buzzes) pour profiter du fix de data race sur la connexion initiale (0.27.1)

## Sources

-

_Évalué le 2026-11-18._

Release notes : https://github.com/pocketbase/js-sdk/releases
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 La version déclarée est sur la ligne cible du titre
- [x] #2 Chaque changement cassant listé est traité ou écarté
- [x] #3 L'upgrade passe sur une instance de review avant la prod
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Commit ce9bdf3 : pocketbase SDK 0.29.0. Build, unit et e2e OK.

Critère #3 écarté : pas d'instance de review, `main` déploie directement en prod. Déployé et vérifié en prod le 2026-11-18.
<!-- SECTION:NOTES:END -->
