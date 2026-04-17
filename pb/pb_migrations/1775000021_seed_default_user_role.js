/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1775000019")

  const userRole = new Record(collection)
  userRole.set("name", "User")
  userRole.set("slug", "user")
  app.save(userRole)

  const adminRole = new Record(collection)
  adminRole.set("name", "Admin")
  adminRole.set("slug", "admin")
  app.save(adminRole)
}, (app) => {
  for (const slug of ["user", "admin"]) {
    try {
      const record = app.findFirstRecordByFilter("roles", `slug = "${slug}"`)
      app.delete(record)
    } catch {}
  }
})
