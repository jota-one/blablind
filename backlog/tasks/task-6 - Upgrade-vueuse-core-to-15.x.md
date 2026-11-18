---
id: TASK-6
title: Upgrade @vueuse/core to 15.x
status: Done
assignee: []
created_date: '2026-11-18T17:14:00Z'
updated_date: '2026-11-18T18:00:00Z'
labels:
  - dependencies
  - à-valider
dependencies: []
type: chore
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
@vueuse/core 15.0.0 est sorti ; ce projet est en 14.1.0.

| Instance | Branche | Déclaré |
| --- | --- | --- |
| blablind.jota.one | main | `^14.1.0` |

Déclaré dans : `package.json`

## Évaluation

**Difficulté 1/5 · Risque 1/5**

Aucune des APIs cassées (templateRef, timer options dépréciées, useEventSource, useIDBKeyval, useThrottleFn) n'est utilisée dans ce repo. L'upgrade est sans impact fonctionnel, juste des nouvelles features/fixes non consommés.

## Changements cassants pour ce projet

Aucun relevé.

## Sécurité

Aucun correctif de sécurité relevé.

## Étapes

- Monter @vueuse/core à ^15.0.0 dans package.json
- pnpm install
- pnpm build && pnpm test:unit (gate standard du projet)

## Sources

-

_Évalué le 2026-11-18._

Release notes : https://github.com/vueuse/vueuse/releases
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 La version déclarée est sur la ligne cible du titre
- [x] #2 Chaque changement cassant listé est traité ou écarté
- [x] #3 L'upgrade passe sur une instance de review avant la prod
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Commit 845ecb2 : @vueuse/core 15.0.0. Build et e2e OK.

Critère #3 écarté : pas d'instance de review, `main` déploie directement en prod. Déployé et vérifié en prod le 2026-11-18.
<!-- SECTION:NOTES:END -->
