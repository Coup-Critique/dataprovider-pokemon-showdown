const { loadResource, JSON, LIBS } = require("../libs/fileLoader");
const { knex } = require("./db");
const csv = require("fast-csv");
const fs = require("fs");
const importResult = require("../importResult")("import_pokemon_tier");
const pokemonTiers = loadResource(JSON, "pokemonTier.json");
const { removeParenthesis } = loadResource(LIBS, "util");
const importResultFile = "./logs/pokemon_tier_import_result.csv";

const catchError = (err, resolve) => {
  importResult.addError(err);
  resolve();
};

/**
 * Object that'll store all tiers.
 * Structure : <shortName>-<gen>: id
 */
const tiers = {};

const pokemonsStore = [];

importResult.addInfo("Import pokemon tiers has started...");

knex("pokemon")
  .join("tier", "tier.id", "=", "pokemon.tier_id")
  .select(["pokemon.name as pokemon", "tier.name as tier", "pokemon.gen"])
  .then((pokemons) => {
    for (const { pokemon, tier, gen } of pokemons) {
      pokemonsStore.push({ pokemon, tier, newTier: null, gen });
    }
  })
  .then(() => {
    knex("tier")
      .select(["id", "short_name", "gen"])
      .then((rows) => {
        for (const { id, shortName, gen } of rows) {
          tiers[`${shortName}-${gen}`] = id;
        }
        return tiers;
      })
      .then((tiers) => {
        Promise.all(
          pokemonTiers.map(
            ({ pokemon: name, tier: short_name, gen, technically }, i) => {
              return new Promise((resolve, reject) => {
                knex("pokemon")
                  .where({ name, gen })
                  .first(["id", "usage_name"])
                  .then((rowPokemon) => {
                    if (!rowPokemon) {
                      importResult.addWarn(
                        `For Pokemon "${name}" in gen ${gen} cannot be found : skipping...`
                      );
                      resolve();
                      return;
                    }
                    let tierId = null;
                    short_name = removeParenthesis(short_name);
                    if (
                      short_name === "Illegal" ||
                      short_name === "Unreleased"
                    ) {
                      tierId = tiers[`Untiered-${gen}`];
                    } else if (!tiers[`${short_name}-${gen}`]) {
                      importResult.addWarn(
                        `For Pokemon ${name} : Tier ${short_name} cannot be found in ${gen}, setting to Untiered`
                      );
                      tierId = tiers[`Untiered-${gen}`];
                    } else {
                      tierId = tiers[`${short_name}-${gen}`];
                    }

                    knex("pokemon")
                      .update({ tierId, technically })
                      .where({ id: rowPokemon.id, gen })
                      .then(() => {
                        resolve();
                      })
                      .catch((e) =>
                        catchError(
                          new Error(
                            `Tier update has failed for ${name}, ${e.message}`
                          ),
                          resolve
                        )
                      );
                  })
                  .catch((e) => catchError(e, resolve));
              });
            }
          )
        )
          .then(() => {
            const stream = csv.format({
              headers: ["pokemon", "tier", "newTier", "gen"],
              delimiter: ";",
            });
            stream.pipe(fs.createWriteStream(importResultFile));
            knex("pokemon")
              .join("tier", "tier.id", "=", "pokemon.tier_id")
              .select([
                "pokemon.name as pokemon",
                "tier.name as newTier",
                "pokemon.gen",
              ])
              .then((pokemons) => {
                for (let i = 0; i < pokemons.length; i++) {
                  pokemonsStore[i]["newTier"] =
                    pokemonsStore[i]["tier"] === pokemons[i]["newTier"]
                      ? null
                      : pokemons[i]["newTier"];
                  if (pokemonsStore[i]["newTier"]) {
                    stream.write(pokemonsStore[i]);
                    importResult.addUpdated();
                  }
                }
                stream.end();

                knex.destroy();
                importResult.setResultImportFile(importResultFile);
                importResult.addInfo("Import pokemon tiers has finished.");
                importResult.sendToDiscord();
              });
          })
          .catch((err) => {
            importResult.addError(err);
          })
          .finally(() => {
            knex.destroy();
          });
      });
  });
