const { loadResource, JSON: _JSON } = require("../libs/fileLoader");
const { knex, insertOrUpdate, resultRecords } = require("./db");
const pokemons = loadResource(_JSON, "pokemons.json").map((pokemon) => {
  if (pokemon.type === "???") {
    pokemon.type = "Unknown";
  }
  return pokemon;
});

const originalPokemons = JSON.stringify(pokemons);

Promise.all(
  insertOrUpdate(knex, "pokemon", JSON.parse(originalPokemons), {
    hasGen: true,
    replaceColumns: {
      type_1: "type_1_id",
      type_2: "type_2_id",
      ability_1: "ability_1_id",
      ability_2: "ability_2_id",
      ability_hidden: "ability_hidden_id",
      usageName: "usage_name",
    },
    ignoreColumns: ["baseForm", "prevo"],
    relations: {
      type_1_id: { table: "type", refColumn: "name" },
      type_2_id: { table: "type", refColumn: "name" },
      ability_1_id: { table: "ability", refColumn: "name" },
      ability_2_id: { table: "ability", refColumn: "name" },
      ability_hidden_id: { table: "ability", refColumn: "name" },
    },
  })
)
  .then((results) => {
    console.log(resultRecords("pokemon", results));
    return Promise.all(
      insertOrUpdate(knex, "pokemon", JSON.parse(originalPokemons), {
        hasGen: true,
        replaceColumns: {
          prevo: "pre_evo_id",
          baseForm: "base_form_id",
        },
        ignoreColumns: [
          "type_1",
          "type_2",
          "ability_1",
          "ability_2",
          "ability_hidden",
          "usageName",
        ],
        relations: {
          base_form_id: { table: "pokemon", refColumn: "name" },
          pre_evo_id: { table: "pokemon", refColumn: "name" },
        },
      })
    );
  })
  .then((results) => console.log(resultRecords("pokemon (forms)", results)))
  .finally(() => knex.destroy());
