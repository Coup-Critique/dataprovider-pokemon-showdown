const { loadResource, JSON } = require("../libs/fileLoader");
const { insertOrUpdate, knex, resultRecords } = require("./db");
const abilities = loadResource(JSON, "abilities.json");

Promise.all(
  insertOrUpdate(knex, "ability", abilities, {
    hasGen: true,
    ignoreColumns: ["shortDescription"],
    noOverrideColumns: ["description"],
    fillEmptyColumns: ["descriptionEn"],
  })
)
  .then((results) => console.log(resultRecords("ability", results)))
  .finally(() => knex.destroy());
