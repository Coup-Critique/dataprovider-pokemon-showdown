const { insertOrUpdate, knex, resultRecords } = require("./db");
const fs = require("fs");
const path = require("path");
const { loadResource, JSON, LIBS } = require("../libs/fileLoader");
const { folderUsage, LAST_GEN, range } = loadResource(LIBS, "util");
const formats = require(path.join(
  __dirname,
  "..",
  folderUsage,
  "formats.json"
));
const rawTiers = loadResource(JSON, "tiers.json");

// Add tiers for specific gens

let tiers = rawTiers
  .filter((tier) => tier.hasOwnProperty("gen") && tier.gen !== "LAST GEN ONLY")
  .flatMap((tier) => tier.gen.map((gen) => ({ ...tier, gen })));

// Add tiers that are played in all gen

tiers = tiers.concat(
  rawTiers
    .filter((tier) => !tier.hasOwnProperty("gen"))
    .flatMap((tier) => range(1, LAST_GEN).map((gen) => ({ ...tier, gen })))
);

// Add tiers that are only played in the last gen

tiers = tiers.concat(
  rawTiers
    .filter(
      (tier) => tier.hasOwnProperty("gen") && tier.gen === "LAST GEN ONLY"
    )
    .map((tier) => {
      tier.gen = LAST_GEN;
      return tier;
    })
);
Promise.all(
  insertOrUpdate(knex, "tier", tiers, {
    hasGen: true,
    identifier: "usage_name",
    replaceColumns: {
      parent: "parent_id",
      shortName: "short_name",
      sortOrder: "sort_order",
      usageName: "usage_name",
      ladderRef: "ladder_ref",
      isDouble: "is_double",
      maxPokemon: "max_pokemon",
    },
    relations: {
      parent_id: { table: "tier", refColumn: "name" },
    },
  })
)
  .then((results) => console.log(resultRecords("tier", results)))
  .then(() => {
    console.log("Applying right ladderRef for each tier...");
    return Promise.all(
      tiers
        .filter(({ usage_name }) => usage_name)
        .map(async ({ gen, usage_name }) => {
          const usageNameTierGen =
            usage_name !== "vgc"
              ? `gen${gen}${usage_name}`
              : `gen${gen}${usage_name}${
                  folderUsage.split("/").pop().split("-")[0]
                }`;
          if (
            formats.hasOwnProperty(usageNameTierGen) &&
            formats[usageNameTierGen].hasOwnProperty("dcut")
          ) {
            await knex("tier")
              .update({ ladder_ref: formats[usageNameTierGen].dcut })
              .where({ gen, usage_name });
            return { UPDATED: 1 };
          }
          return { UPDATED: 0 };
        })
    );
  })
  .then((results) => console.log(resultRecords("tier", results)))
  .finally(() => knex.destroy());
