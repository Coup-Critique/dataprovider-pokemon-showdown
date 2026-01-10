const { loadResource, LIBS } = require("../libs/fileLoader");
const { LAST_GEN, folderUsage, range, withoutSpaces } = loadResource(
  LIBS,
  "util"
);
const { knex } = require("./db");

// Choose latest data folder
const fs = require("fs");

(async () => {
  try {
    for (const gen of range(1, LAST_GEN)) {
      let playableTiers = [];

      const tiersRows = await knex("tier")
        .where({ gen })
        .whereNotLike({ usageName: "vgc%" })
        .whereNotLike({ usageName: "bss%" })
        .whereNotNull("usageName")
        .whereNotNull("ladderRef");

      for (const tierRow of tiersRows)
        playableTiers.push({
          id: tierRow.id,
          ladderRef: tierRow.ladderRef,
          usageName: tierRow.usageName,
        });

      // Clear usages
      console.log(`Clearing usages in gen ${gen}...`);
      for (const { id } of playableTiers) {
        const rowTierUsages = await knex("tierUsage").where({
          tierId: id,
        });
        if (!rowTierUsages) continue;
        for (const rowTierUsage of rowTierUsages)
          await knex("tierUsage")
            .where({ id: rowTierUsage.id })
            .del();
      }
      // Map between pokemon.id and new inserted tierUsage.id
      let insertedTierUsageId = {};
      for (const {
        ladderRef,
        usageName: tierUsageName,
        id: tierId,
      } of playableTiers) {
        const pathPokedataFile = `${folderUsage}/formats/gen${
          gen + tierUsageName
        }/${ladderRef}/pokedata.json`;
        console.log(`Loading ${pathPokedataFile}...`);
        if (!fs.existsSync(pathPokedataFile)) {
          console.log(`${pathPokedataFile} doesn't exist : skipping...`);
          continue;
        }
        const pokedata = JSON.parse(fs.readFileSync(pathPokedataFile));
        let rank = 1;
        for (const [pokemonUsageName, usageData] of Object.entries(pokedata)) {
          const keyTierUsage = pokemonUsageName + tierId;

          const pokemonRow = await knex("pokemon")
            .select(["id", "name"])
            .where({
              usageName: pokemonUsageName,
              gen,
            })
            .first();
          if (!pokemonRow) continue;
          if (usageData.usage < 1) continue;
          const insertedTierRow = await knex("tierUsage").insert(
            {
              tierId,
              pokemon_id: pokemonRow.id,
              percent: usageData.usage,
              rank: rank++,
            },
            "id"
          );
          insertedTierUsageId[keyTierUsage] = insertedTierRow[0];
          for (const [property, tableName] of [
            ["abilities", "ability"],
            ["items", "item"],
          ]) {
            for (const entityData of usageData[property]) {
              const entityRow = await knex(tableName)
                .where({
                  usageName: withoutSpaces(entityData.name),
                  gen,
                })
                .first();
              if (!entityRow) continue;
              await knex(`usage_${tableName}`).insert({
                tierUsageId: insertedTierUsageId[keyTierUsage],
                [`${tableName}Id`]: entityRow.id,
                percent: entityData.usage,
              });
            }
          }

          // Special case for moves

          for (const entityData of usageData["moves"]) {
            const entityRow = await knex("move")
              .where({
                usageName: withoutSpaces(entityData.name),
                gen,
              })
              .first();
            if (!entityRow) continue;
            await knex(`usageMove`).insert({
              tierUsageId: insertedTierUsageId[keyTierUsage],
              [`moveId`]: entityRow.id,
              percent: entityData.usage,
            });
          }

          // Special case for tera types

          for (const entityData of usageData["teratypes"]) {
            const entityRow = await knex("type")
              .where({
                name: entityData.name,
                gen,
              })
              .first();
            if (!entityRow) continue;
            await knex(`usageTera`).insert({
              tierUsageId: insertedTierUsageId[keyTierUsage],
              [`typeId`]: entityRow.id,
              percent: entityData.usage,
            });
          }

          // Importing spreads

          for (const entityData of usageData["spreads"]) {
            const entityRow = await knex("nature")
              .where({ name: entityData["nature"] })
              .first();
            if (!entityRow) continue;
            await knex("usageSpread").insert({
              tierUsageId: insertedTierUsageId[keyTierUsage],
              natureId: entityRow.id,
              evs: entityData.evs,
              percent: entityData.usage,
            });
          }
        }
      }
      // Checks and teammates must be inserted after
      // Because these tables ask tier_usage.id.
      // And that's why the insertedTierUsageId object is used
      console.log("Inserting pokemon checks and teammates...");
      for (const {
        ladderRef,
        usageName: tierUsageName,
        id: tierId,
      } of playableTiers) {
        const pathPokedataFile = `${folderUsage}/formats/gen${
          gen + tierUsageName
        }/${ladderRef}/pokedata.json`;
        console.log(`Loading ${pathPokedataFile}...`);
        if (!fs.existsSync(pathPokedataFile)) {
          console.log(`${pathPokedataFile} doesn't exist : skipping...`);
          continue;
        }
        const pokedata = JSON.parse(
          fs.readFileSync(
            `${folderUsage}/formats/gen${
              gen + tierUsageName
            }/${ladderRef}/pokedata.json`
          )
        );
        const percentProperty = {
          teammates: "usage",
          counters: "eff",
        };
        for (const [pokemonUsageName, usageData] of Object.entries(pokedata)) {
          const keyTierUsage = pokemonUsageName + tierId;

          const pokemonRow = await knex("pokemon")
            .where({
              usageName: pokemonUsageName,
              gen,
            })
            .first(["id"]);
          if (!pokemonRow) continue;

          // If tierUsageId couldn't be found, it means that it has been ignored
          // because its usage is less than 1%
          if (!insertedTierUsageId[keyTierUsage]) continue;
          const tierUsageId = insertedTierUsageId[keyTierUsage];
          for (const [property, tableName] of [
            ["teammates", "teamMate"],
            ["counters", "pokemonCheck"],
          ]) {
            for (const entityData of usageData[property]) {
              const entityRow = await knex("pokemon")
                .where({
                  usageName: withoutSpaces(entityData.name),
                  gen,
                })
                .first();

              if (!entityRow) continue;
              const dataToInsert = {
                tierUsageId,
                pokemonId: entityRow.id,
                percent: entityData[percentProperty[property]],
              };

              if ("pokemonCheck" === tableName) {
                dataToInsert.tierUsage = dataToInsert.tierUsageId;
                delete dataToInsert.tierUsageId;
              }

              await knex(tableName).insert(dataToInsert);
            }
          }
        }
      }
    }
  } catch (e) {
    console.log(e);
  } finally {
    knex.destroy();
  }
})();
