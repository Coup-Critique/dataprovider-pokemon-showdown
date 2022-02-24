const { knex, insertOrUpdate, resultRecords } = require('./db')
const pokemons = require('../pokemon').flatMap((pokemon_object) => pokemon_object.gen.map((gen) => ({ ...pokemon_object, gen })))

Promise.all(insertOrUpdate(knex, 'pokemon', pokemons, {
    hasGen: true,
    replaceColumns: {
        "type_1": "type_1_id",
        "type_2": "type_2_id",
        "ability_1": "ability_1_id",
        "ability_2": "ability_2_id",
        "ability_hidden": "ability_hidden_id"
    },
    ignoreColumns: ['baseForm', 'prevo', 'usageName'],
    relations: {
        "type_1_id": { "table": "type", "refColumn": "name" },
        "type_2_id": { "table": "type", "refColumn": "name" },
        "ability_1_id": { "table": "ability", "refColumn": "name" },
        "ability_2_id": { "table": "ability", "refColumn": "name" },
        "ability_hidden_id": { "table": "ability", "refColumn": "name" }
    },
})).then((results) => {
    console.log(resultRecords('pokemon',results));
    return Promise.all(insertOrUpdate(knex, 'pokemon', pokemons, {
        hasGen: true,
        replaceColumns: {
            "baseForm": "base_form_id",
            "prevo": "prevo_id"
        },
        ignoreColumns: ["type_1", "type_2", "ability_1", "ability_2", "ability_hidden"],
        relations: {
            "base_form_id": { "table": "pokemon", "refColumn": "name" },
            "prevo_id": { "table": "pokemon", "refColumn": "name" }
        },
    }))
}).then((results) => console.log(resultRecords('pokemon (forms)',results)))
  .finally(() => knex.destroy());

