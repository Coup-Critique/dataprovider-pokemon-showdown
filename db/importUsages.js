const { loadResource, LIBS } = require("../libs/fileLoader");
const { LAST_GEN, folderUsage, range, withoutSpaces } = loadResource(
  LIBS,
  "util"
);
const { knex } = require("./db");
const fs = require("fs");

const LADDER_REF = "1630";

const getDataFilePath = (gen, tierUsageName, ladderRef = LADDER_REF) => {
  return `${folderUsage}/formats/gen${
    gen + tierUsageName
  }/${ladderRef}/pokedata.json`;
};

const getTiersByGen = async (gen) => {
  return await knex("tier").where({ gen }).whereNotNull("usageName");
};

const saveTierUsage = async (
  tierId,
  pokemonId,
  percent,
  rank,
  provider = "showdown"
) => {
  return await knex("tierUsage").insert({
    tierId,
    pokemonId,
    percent,
    rank,
    provider,
  });
};

const clearTierUsages = async (gen, tiers) => {
  console.log(`Clearing usages in gen ${gen}...`);
  for (const tier of tiers) {
    await knex("tierUsage")
      .where({ tierId: tier.id, provider: "showdown" })
      .del();
  }
};

const getEntityByName = async (tableName, gen, name) => {
  return await knex(tableName)
    .select(["id", "name"])
    .where({ name, gen })
    .first();
};

const getEntityByUsageName = async (tableName, gen, usageName) => {
  return await knex(tableName)
    .select(["id", "name"])
    .where({ usageName: withoutSpaces(usageName), gen })
    .first();
};

const getPokemonByUsageName = async (gen, usageName) => {
  return await getEntityByUsageName("pokemon", gen, usageName);
};

const getNatureByName = async (name) => {
  return await knex("nature").where({ name }).first();
};

const defaultEntityImport = async (
  property,
  tableName,
  gen,
  usageData,
  tierUsageId
) => {
  for (const entityData of usageData[property]) {
    const entity = await getEntityByUsageName(tableName, gen, entityData.name);
    if (!entity) continue;
    await knex(`usage_${tableName}`).insert({
      tierUsageId,
      [`${tableName}Id`]: entity.id,
      percent: entityData.usage,
    });
  }
};

const importAbilities = async (gen, usageData, tierUsageId) => {
  defaultEntityImport("abilities", "ability", gen, usageData, tierUsageId);
};

const importItems = async (gen, usageData, tierUsageId) => {
  defaultEntityImport("items", "item", gen, usageData, tierUsageId);
};

const importMoves = async (gen, usageData, tierUsageId) => {
  defaultEntityImport("moves", "move", gen, usageData, tierUsageId);
};

const importTeraTypes = async (gen, usageData, tierUsageId) => {
  for (const teraUsage of usageData["teratypes"]) {
    const tera = await getEntityByName("type", gen, teraUsage.name);
    if (!tera) continue;
    await knex(`usageTera`).insert({
      tierUsageId,
      [`typeId`]: tera.id,
      percent: teraUsage.usage,
    });
  }
};

const importSpreads = async (usageData, tierUsageId) => {
  for (const spreadUsage of usageData["spreads"]) {
    const nature = await getNatureByName(spreadUsage.nature);
    if (!nature) continue;
    await knex("usageSpread").insert({
      tierUsageId,
      natureId: nature.id,
      evs: spreadUsage.evs,
      percent: spreadUsage.usage,
    });
  }
};

const importPokemonChecks = async (gen, usageData, tierUsageId) => {
  for (const counterUsage of usageData["counters"]) {
    const pokemon = await getPokemonByUsageName(gen, counterUsage.name);
    if (!pokemon) continue;
    await knex("pokemonCheck").insert({
      tierUsage: tierUsageId,
      pokemonId: pokemon.id,
      percent: counterUsage.eff,
    });
  }
};

const importTeammates = async (gen, usageData, tierUsageId) => {
  for (const teammateUsage of usageData["teammates"]) {
    const pokemon = await getPokemonByUsageName(gen, teammateUsage.name);
    if (!pokemon) continue;
    const dataToInsert = {
      tierUsageId,
      pokemonId: pokemon.id,
      percent: teammateUsage.usage,
    };

    await knex("teamMate").insert(dataToInsert);
  }
};

const processPokemonsTierUsages = async (gen, tiersRows) => {
  let savedUsages = {};
  for (const playableTier of tiersRows) {
    const { usageName: tierUsageName, id: tierId, ladderRef } = playableTier;

    const dataFilePath = getDataFilePath(gen, tierUsageName, ladderRef);
    console.log(`Loading ${dataFilePath}...`);
    if (!fs.existsSync(dataFilePath)) {
      console.log(`${dataFilePath} doesn't exist : skipping...`);
      continue;
    }
    console.log(`Process ${dataFilePath}...`);

    const usageDatas = JSON.parse(fs.readFileSync(dataFilePath));

    let rank = 1;
    for (const [pokemonUsageName, usageData] of Object.entries(usageDatas)) {
      const pokemon = await getPokemonByUsageName(gen, pokemonUsageName);
      if (!pokemon) continue;
      if (usageData.usage < 1) break;

      const newUsage = await saveTierUsage(
        tierId,
        pokemon.id,
        usageData.usage,
        rank++
      );
      const tierUsageId = newUsage[0];

      await importAbilities(gen, usageData, tierUsageId);
      await importItems(gen, usageData, tierUsageId);
      await importMoves(gen, usageData, tierUsageId);
      await importTeraTypes(gen, usageData, tierUsageId);
      await importSpreads(usageData, tierUsageId);

      const keyTierUsage = pokemonUsageName + tierId;
      savedUsages[keyTierUsage] = tierUsageId;
    }
  }
  return savedUsages;
};

const processPokemonLinksUsages = async (gen, tiersRows, savedUsages) => {
  console.log("Inserting pokemon checks and teammates...");
  for (const playableTier of tiersRows) {
    const { usageName: tierUsageName, id: tierId, ladderRef } = playableTier;

    const dataFilePath = getDataFilePath(gen, tierUsageName, ladderRef);
    console.log(`Loading ${dataFilePath} for pokemon checks and teammates...`);
    if (!fs.existsSync(dataFilePath)) {
      console.log(
        `${dataFilePath} doesn't exist for pokemon checks and teammates : skipping...`
      );
      continue;
    }

    const pokedata = JSON.parse(fs.readFileSync(dataFilePath));
    for (const [pokemonUsageName, usageData] of Object.entries(pokedata)) {
      const pokemon = await getPokemonByUsageName(gen, pokemonUsageName);
      if (!pokemon) continue;

      // If tierUsageId couldn't be found, it means that it has been ignored
      // because its usage is less than 1%
      const keyTierUsage = pokemonUsageName + tierId;
      const tierUsageId = savedUsages[keyTierUsage];
      if (!tierUsageId) continue;

      await importTeammates(gen, usageData, tierUsageId);
      await importPokemonChecks(gen, usageData, tierUsageId);
    }
  }
};

const importUsagesForGen = async (gen) => {
  // Get tiers by gen
  const tiersRows = await getTiersByGen(gen);
  if (!tiersRows || tiersRows.length === 0) {
    console.log(`No tiers found for gen ${gen}`);
    return;
  }

  // Clear usages
  await clearTierUsages(gen, tiersRows);

  const savedUsages = await processPokemonsTierUsages(gen, tiersRows);

  // Checks and teammates must be inserted after
  // Because these tables ask tier_usage.id.
  await processPokemonLinksUsages(gen, tiersRows, savedUsages);
};

(async () => {
  try {
    for (const gen of range(1, LAST_GEN)) {
      await importUsagesForGen(gen);
    }
  } catch (e) {
    console.log(e);
  } finally {
    knex.destroy();
  }
})();
