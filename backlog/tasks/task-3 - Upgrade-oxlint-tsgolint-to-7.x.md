---
id: TASK-3
title: Upgrade oxlint-tsgolint to 7.x
status: Done
assignee: []
created_date: '2026-11-18T17:14:00Z'
updated_date: '2026-11-18T18:00:00Z'
labels:
  - dependencies
  - à-valider
dependencies: []
type: chore
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
oxlint-tsgolint 7.0.2007 est sorti ; ce projet est en 0.19.0.

| Instance | Branche | Déclaré |
| --- | --- | --- |
| blablind.jota.one | main | `^0.19.0` |

Déclaré dans : `package.json`

## Évaluation

**Difficulté 1/5 · Risque 2/5**

Dépendance dev interne à oxlint (`--type-aware`), pas d'usage direct dans le code. Le saut à 7.x est un renumbering (stabilisation de l'API type-aware), les notes ne listent que des fixes de règles, perf et des nouvelles règles — rien de cassant pour ce projet, juste potentiellement de nouveaux lint findings.

## Changements cassants pour ce projet

Aucun relevé.

## Sécurité

Aucun correctif de sécurité mentionné dans les notes (juste l'ajout d'un scan semgrep/security-action côté CI du projet tsgolint lui-même).

## Étapes

- Monter `oxlint-tsgolint` à `^7.0.2007` dans package.json
- pnpm install
- Lancer `pnpm lint` (ou `pnpm build` si lint OOM comme connu sur cette machine) pour voir si de nouvelles règles affinées (no-unnecessary-condition, no-floating-promises, no-unsafe-assignment, prefer-optional-chain…) font remonter de nouveaux signalements
- Corriger les éventuels nouveaux findings ou les ignorer via .oxlintrc.json si faux positifs
- Committer le bump avec `chore(deps): bump oxlint-tsgolint to 7.0.2007`

## Sources

-

_Évalué le 2026-11-18._

Release notes : https://github.com/oxc-project/tsgolint/releases
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 La version déclarée est sur la ligne cible du titre
- [x] #2 Chaque changement cassant listé est traité ou écarté
- [x] #3 L'upgrade passe sur une instance de review avant la prod
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Commit 88cf8cb (oxlint 1.94 bumpé dans 4eed09f, il exige tsgolint >= 7). Mêmes 24 warnings qu'avant, aucun nouveau finding.

Critère #3 écarté : pas d'instance de review, `main` déploie directement en prod. Déployé et vérifié en prod le 2026-11-18.
<!-- SECTION:NOTES:END -->
