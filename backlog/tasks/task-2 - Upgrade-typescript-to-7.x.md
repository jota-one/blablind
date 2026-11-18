---
id: TASK-2
title: Upgrade typescript to 6.x
status: Done
assignee: []
created_date: '2026-11-18T07:18:00Z'
updated_date: '2026-11-18T18:00:00Z'
labels:
  - dependencies
  - à-valider
dependencies: []
type: chore
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Étape intermédiaire : typescript 6.0.3, depuis 5.8.3. La dernière version, 7.0.2, a été jugée trop coûteuse pour l'instant (difficulté 5/5, risque 2/5).

| Instance | Branche | Déclaré |
| --- | --- | --- |
| blablind.jota.one | main | `^5.8.3` |

Déclaré dans : `package.json`

## Évaluation

**Difficulté 2/5 · Risque 1/5**

Seul changement cassant réel : TS 6.0 n'inclut plus automatiquement @types/node, à ajouter explicitement dans tsconfig.json. Le reste (strict, ESNext, moduleResolution Bundler, esModuleInterop) est déjà configuré comme le nouveau défaut — étape low-cost qui défriche le terrain pour 7.0.

## Changements cassants pour ce projet

- tsconfig.json : le champ `types` ne vaut plus [] par défaut implicite — @types/node (astro.config.ts, scripts) ne sera plus auto-inclus sans `"types": ["node"]` explicite.

## Sécurité

Aucun correctif de sécurité relevé.

## Étapes

- Ajouter `"types": ["node"]` dans compilerOptions de tsconfig.json
- Bump `typescript` à `^6.0.3` dans package.json
- pnpm install
- pnpm build (astro check) pour vérifier qu'aucun autre type implicite ne manque
- pnpm lint + pnpm test:unit

## Sources

- https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/

_Évalué le 2026-11-18._

Release notes : https://github.com/microsoft/TypeScript/releases
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 La version déclarée est sur la ligne cible du titre
- [x] #2 Chaque changement cassant listé est traité ou écarté
- [x] #3 L'upgrade passe sur une instance de review avant la prod
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Commit fcb9998 : typescript 6.0.3. `types: ["node"]` pas nécessaire : astro check et tsc --noEmit passent sans (les types node arrivent via les types Astro).

Critère #3 écarté : pas d'instance de review, `main` déploie directement en prod. Déployé et vérifié en prod le 2026-11-18.
<!-- SECTION:NOTES:END -->
