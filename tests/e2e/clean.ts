import { pb, ensureAdmin } from './helpers/seed.ts'

// Removes every record seeded by the e2e suite (slug / video_id prefixed `e2e-`).
// Needs PB_ADMIN_EMAIL/PASSWORD — sessions and videos have no delete rule.
// Run: pnpm test:e2e:clean
async function main() {
  if (!(await ensureAdmin())) {
    console.error('PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD required (sessions/videos have no delete rule).')
    process.exit(1)
  }

  const sessions = await pb.collection('sessions').getFullList({ filter: "slug ~ 'e2e-'" })
  for (const s of sessions) {
    await pb.collection('sessions').delete(s.id)
    console.log('deleted session', s.slug)
  }

  const videos = await pb.collection('videos').getFullList({ filter: "video_id ~ 'e2e-'" })
  for (const v of videos) {
    await pb.collection('videos').delete(v.id)
    console.log('deleted video', v.video_id)
  }

  console.log(`done — removed ${sessions.length} session(s), ${videos.length} video(s)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
