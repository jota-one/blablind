---
id: TASK-7
title: Upgrade @vueuse/integrations to 15.x
status: Done
assignee: []
created_date: '2026-11-18T17:14:00Z'
updated_date: '2026-11-18T18:00:00Z'
labels:
  - dependencies
  - à-valider
dependencies: []
type: chore
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
@vueuse/integrations 15.0.0 est sorti ; ce projet est en 14.1.0.

| Instance | Branche | Déclaré |
| --- | --- | --- |
| blablind.jota.one | main | `^14.1.0` |

Déclaré dans : `package.json`

## Évaluation

**Difficulté 1/5 · Risque 1/5**

Le package n'est importé nulle part dans src/ — seule une dépendance déclarée, probablement transitive. Les breaking changes v15 touchent @vueuse/core (templateRef, useThrottleFn, useEventSource) et pas /integrations ; aucun impact pour cette app.

## Changements cassants pour ce projet

Aucun relevé.

## Sécurité

Aucun correctif de sécurité mentionné dans ces release notes.

## Étapes

- Bumper "@vueuse/integrations": "^15.0.0" dans package.json
- pnpm install pour mettre à jour le lockfile
- pnpm build pour vérifier qu'aucun autre package du monorepo @vueuse ne casse (templateRef, useThrottleFn trailing)
- pnpm test:unit

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
Commit 845ecb2 : package supprimé plutôt qu'upgradé, importé nulle part (sortablejs est importé directement).

Critère #3 écarté : pas d'instance de review, `main` déploie directement en prod. Déployé et vérifié en prod le 2026-11-18.
<!-- SECTION:NOTES:END -->
