const { loadResource, JSON } = require("../libs/fileLoader");
const { insertOrUpdate, knex, resultRecords } = require("./db");
const items = loadResource(JSON, "items.json");

Promise.all(
  insertOrUpdate(knex, "item", items, {
    hasGen: true,
    noOverrideColumns: ["description"],
    relations: {
      itemUserId: { table: "pokemon", refColumn: "name" },
      megaId: { table: "pokemon", refColumn: "name" },
      zMoveId: { table: "move", refColumn: "name" },
      zMoveFromId: { table: "move", refColumn: "name" },
    },
  })
)
  .then((results) => console.log(resultRecords("item", results)))
  .finally(() => knex.destroy());
