const { loadResource, JSON } = require("../libs/fileLoader");
const { knex, insertOrUpdate, resultRecords } = require("./db");
const moves = loadResource(JSON, "moves.json").map((move) => {
  if (move.type === "???") {
    move.type = "Unknown";
  }
  return move;
});

Promise.all(
  insertOrUpdate(knex, "move", moves, {
    hasGen: true,
    replaceColumns: {
      type: "typeId",
    },
    ignoreColumns: ["shortDescription"],
    relations: {
      typeId: { table: "type", refColumn: "name" },
    },
    noOverrideColumns: ["description"],
  })
)
  .then((results) => console.log(resultRecords("move", results)))
  .finally(() => knex.destroy());
