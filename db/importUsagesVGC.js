const { loadResource, LIBS } = require("../libs/fileLoader");
const { LAST_GEN, folderUsage, withoutSpaces } = loadResource(LIBS, "util");
const { knex } = require("./db");

const gen = LAST_GEN;
// Choose latest data folder
const fs = require("fs");

const importOfficialUsages = async (tierName) => {
  try {
    const rowTier = await knex("tier")
      .whereLike({ usageName: `${tierName}%`, gen })
      .first(["id", "ladderRef"]);
    if (!rowTier) {
      console.log(`The ${tierName} for gen ${gen} cannot be found`);
      return;
    }
    const tierId = rowTier.id;
    // Clear usages
    console.log(`Clearing old ${tierName} usages...`);
    const rowTierUsages = await knex("tierUsage").where({
      tierId: rowTier.id,
    });
    if (!rowTierUsages) {
      console.log(`No ${tierName} tier_usages found`);
      return;
    }
    for (const rowTierUsage of rowTierUsages)
      await knex("tierUsage").where({ id: rowTierUsage.id }).del();

    // Map between pokemon.id and new inserted tier_usage.id
    let insertedTierUsageId = {};
    const year = folderUsage.split("/").pop().split("-")[0];
    const pathPokedataFile = `${folderUsage}/formats/gen${gen + "vgc" + year}/${
      rowTier.ladder_ref
    }/pokedata.json`;
    console.log(`Loading ${pathPokedataFile}...`);
    if (!fs.existsSync(pathPokedataFile)) {
      console.log(`${pathPokedataFile} doesn't exist...`);
      return;
    }
    const pokedata = JSON.parse(fs.readFileSync(pathPokedataFile));
    let rank = 1;
    for (const [pokemonUsageName, usageData] of Object.entries(pokedata)) {
      const pokemonRow = await knex("pokemon")
        .select(["id"])
        .where({ usageName: pokemonUsageName, gen })
        .first();
      if (!pokemonRow) continue;
      if (usageData.usage < 1) continue;
      const insertedTierRow = await knex("tierUsage").insert(
        {
          tierId,
          pokemonId: pokemonRow.id,
          percent: usageData.usage,
          rank: rank++,
        },
        "id"
      );
      insertedTierUsageId[pokemonRow.id] = insertedTierRow[0];
      for (const [property, tableName] of [
        ["abilities", "ability"],
        ["items", "item"],
        ["moves", "move"],
      ]) {
        for (const entityData of usageData[property]) {
          const entityRow = await knex(tableName)
            .where({ usageName: withoutSpaces(entityData.name), gen })
            .first();
          if (!entityRow) continue;
          await knex(`usage_${tableName}`).insert({
            tierUsageId: insertedTierUsageId[pokemonRow.id],
            [`${tableName}_id`]: entityRow.id,
            percent: entityData.usage,
          });
        }
      }

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

      for (const entityData of usageData["spreads"]) {
        const entityRow = await knex("nature")
          .where({ name: entityData["nature"] })
          .first();
        if (!entityRow) continue;
        await knex("usageSpread").insert({
          tierUsageId: insertedTierUsageId[pokemonRow.id],
          nature_id: entityRow.id,
          evs: entityData.evs,
          percent: entityData.usage,
        });
      }
    }
    // Checks and teammates must be inserted after
    // Because these tables ask tier_usage.id.
    // And that's why the insertedTierUsageId object is used
    console.log("Inserting pokemon checks and teammates...");
    const percentProperty = { teammates: "usage", counters: "eff" };
    for (const [pokemonUsageName, usageData] of Object.entries(pokedata)) {
      const pokemonRow = await knex("pokemon")
        .where({ usageName: pokemonUsageName, gen })
        .first(["id"]);

      const tierUsageId = insertedTierUsageId[pokemonRow.id];
      // If tierUsageId couldn't be found, it means that it has been ignored
      // because its usage is less than 1%
      if (!tierUsageId) continue;
      for (const [property, tableName] of [
        ["teammates", "teamMate"],
        ["counters", "pokemonCheck"],
      ]) {
        for (const entityData of usageData[property]) {
          const entityRow = await knex("pokemon")
            .where({ usageName: withoutSpaces(entityData.name), gen })
            .first();

          if (!entityRow) continue;
          await knex(tableName).insert({
            tierUsageId,
            pokemonId: entityRow.id,
            percent: entityData[percentProperty[property]],
          });
        }
      }
    }
  } catch (e) {
    console.log(e);
  } finally {
    knex.destroy();
  }
};

(async () => {
  await importOfficialUsages("vgc");
  await importOfficialUsages("bss");
})();
