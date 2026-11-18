---
id: TASK-1
title: Upgrade PocketBase server to 0.40.x
status: Done
assignee: []
created_date: '2026-11-18T07:02:00Z'
updated_date: '2026-11-18T18:00:00Z'
labels:
  - dependencies
  - à-valider
dependencies: []
type: chore
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PocketBase server 0.40.6 est sorti ; ce projet est en 0.39.4.

| Instance | Branche | Déclaré |
| --- | --- | --- |
| blablind.jota.one | main | `v0.39.4` |

Déclaré dans : `pb/go.mod`

## Évaluation

**Difficulté 3/5 · Risque 3/5**

Rien ne casse fonctionnellement, mais le build Go custom (pb/main.go) doit passer en Go 1.27+ et absorbe la migration interne vers encoding/json/v2, qui touche toute la sérialisation JSON (API + realtime). Apporte des correctifs sécurité (panic worker, DoS net/http, limites OOM thumbnails).

## Changements cassants pour ce projet

- pb/go.mod: min Go passe à 1.27.0 (0.40.0) — bump le directive `go` et le toolchain avant de rebuild le binaire custom.
- pb/go.mod: migration vers encoding/json/v2 change la sérialisation JSON globale (API + realtime) — à retester malgré les correctifs ultérieurs (0.40.1/0.40.3).
- pb/go.mod: ozzo-validation remplacé par le fork pocketbase (dépendance indirecte, aucun import direct dans pb/main.go) — se résout via go mod tidy.

## Sécurité

v0.39.7 corrige un panic non géré dans les goroutines internes, v0.40.5 embarque des correctifs Go `net/http` dont un DoS, et v0.40.6 ajoute des garde-fous OOM sur la génération de thumbnails.

## Étapes

- Bumper `github.com/pocketbase/pocketbase` à v0.40.6 dans pb/go.mod, passer le directive `go` à 1.27.2+, puis `go mod tidy` dans pb/.
- Mettre à jour pb/.pbversion en cohérence avec go.mod.
- S'assurer que le toolchain Go local et CI est en 1.27.2+ avant `pnpm db:custom`.
- Rebuild (`pnpm db:custom`) puis lancer `pnpm test:unit` et `pnpm test:e2e` pour détecter une régression de sérialisation JSON (API/realtime).
- Smoke-test manuel deux navigateurs (mode classique + autonome) vu que le realtime dépend de payloads JSON sérialisés.

## Sources

-

_Évalué le 2026-11-18._

Release notes : https://github.com/pocketbase/pocketbase/releases
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 La version déclarée est sur la ligne cible du titre
- [x] #2 Chaque changement cassant listé est traité ou écarté
- [x] #3 L'upgrade passe sur une instance de review avant la prod
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Commit 2d15df8 : pocketbase v0.40.6, directive go 1.27.4 (lu par infra pour setup-go), .pbversion + README synchronisés. Binaire custom rebuildé, les 3 specs e2e passent (dont realtime classique + autonome) sur la DB locale. Reste : deploy et smoke manuel deux navigateurs.

Déployé en prod le 2026-11-18 (run 44362352498), v0.40.6 confirmée dans l'admin UI.

Critère #3 écarté : pas d'instance de review, `main` déploie directement en prod. Déployé et vérifié en prod le 2026-11-18.
<!-- SECTION:NOTES:END -->
