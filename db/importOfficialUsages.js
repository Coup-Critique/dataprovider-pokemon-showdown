const { loadResource, LIBS } = require("../libs/fileLoader");
const { LAST_GEN, folderUsage, withoutSpaces } = loadResource(LIBS, "util");
const { knex } = require("./db");
const fs = require("fs");
const tiers = loadResource("JSON", "tiers.json");

const gen = LAST_GEN;

const getDataFilePath = (tierUsageName) => {
  return `${folderUsage}/officials/${tierUsageName}.json`;
};

const getTierByName = async (tierName) => {
  return await knex("tier")
    .whereLike("usageName", `${tierName}%`)
    .where({ gen })
    .first();
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

const clearTierUsages = async (gen, tier) => {
  console.log(`Clearing usages in gen ${gen} for tier ${tier.name}...`);
  const usages = await knex("tierUsage").where({
    tierId: tier.id,
    provider: "home",
  });
  if (!usages) return;
  for (const usage of usages) {
    await knex("tierUsage").where({ id: usage.id }).del();
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

const importAbilities = async (gen, usageData, tierUsageId) => {
  for (const abilityData of usageData.abilities || []) {
    const ability = await getEntityByUsageName(
      "ability",
      gen,
      abilityData.ability
    );
    if (!ability) continue;
    await knex("usage_ability").insert({
      tierUsageId,
      abilityId: ability.id,
      percent: parseFloat(abilityData.percent),
    });
  }
};

const importItems = async (gen, usageData, tierUsageId) => {
  for (const itemData of usageData.items || []) {
    const item = await getEntityByUsageName("item", gen, itemData.item);
    if (!item) continue;
    await knex("usage_item").insert({
      tierUsageId,
      itemId: item.id,
      percent: parseFloat(itemData.percent),
    });
  }
};

const importMoves = async (gen, usageData, tierUsageId) => {
  for (const moveData of usageData.moves || []) {
    const move = await getEntityByUsageName("move", gen, moveData.move);
    if (!move) continue;
    await knex("usage_move").insert({
      tierUsageId,
      moveId: move.id,
      percent: parseFloat(moveData.percent),
    });
  }
};

const importTeraTypes = async (gen, usageData, tierUsageId) => {
  for (const teraData of usageData.teratypes || []) {
    if (!teraData.teratype) continue;
    const tera = await getEntityByName("type", gen, teraData.teratype);
    if (!tera) continue;
    await knex("usageTera").insert({
      tierUsageId,
      typeId: tera.id,
      percent: parseFloat(teraData.percent),
    });
  }
};

const importSpreads = async (usageData, tierUsageId) => {
  for (const spreadData of usageData.spreads || []) {
    const nature = await getNatureByName(spreadData.nature);
    if (!nature) continue;
    await knex("usageSpread").insert({
      tierUsageId,
      natureId: nature.id,
      evs: spreadData.evs,
      percent: parseFloat(spreadData.percent),
    });
  }
};

const importTeammates = async (gen, usageData, tierUsageId) => {
  for (const teammateData of usageData.team || []) {
    const pokemon = await getPokemonByUsageName(gen, teammateData.pokemon);
    if (!pokemon) continue;
    const dataToInsert = {
      tierUsageId,
      pokemonId: pokemon.id,
      percent: parseFloat(teammateData.percent || 0),
    };

    await knex("teamMate").insert(dataToInsert);
  }
};

const processPokemonsTierUsages = async (gen, tier, officialData) => {
  console.log(
    `Processing ${officialData.length} pokemons for tier ${tier.name}...`
  );

  let savedUsages = {};

  for (const pokemonData of officialData) {
    const pokemon = await getPokemonByUsageName(gen, pokemonData.name);
    if (!pokemon) {
      console.log(`Pokemon not found: ${pokemonData.name}`);
      continue;
    }

    // Calculer le pourcentage d'utilisation basé sur le ranking
    // Pour l'instant on utilise un calcul simple, à ajuster selon vos besoins
    const usage = 100 / pokemonData.ranking;

    if (usage < 1) break;

    const newUsage = await saveTierUsage(
      tier.id,
      pokemon.id,
      usage,
      pokemonData.ranking,
      "home"
    );
    const tierUsageId = newUsage[0];

    await importAbilities(gen, pokemonData, tierUsageId);
    await importItems(gen, pokemonData, tierUsageId);
    await importMoves(gen, pokemonData, tierUsageId);
    await importTeraTypes(gen, pokemonData, tierUsageId);
    await importSpreads(pokemonData, tierUsageId);

    const keyTierUsage = pokemonData.name + tier.id;
    savedUsages[keyTierUsage] = tierUsageId;
  }

  return savedUsages;
};

const processPokemonLinksUsages = async (
  gen,
  tier,
  officialData,
  savedUsages
) => {
  console.log("Inserting teammates...");

  for (const pokemonData of officialData) {
    const pokemon = await getPokemonByUsageName(gen, pokemonData.name);
    if (!pokemon) continue;

    // If tierUsageId couldn't be found, it means that it has been ignored
    // because its usage is less than 1%
    const keyTierUsage = pokemonData.name + tier.id;
    const tierUsageId = savedUsages[keyTierUsage];
    if (!tierUsageId) continue;

    await importTeammates(gen, pokemonData, tierUsageId);
  }
};

const importOfficialUsages = async (tierName) => {
  try {
    const tier = await getTierByName(tierName);
    if (!tier) {
      console.log(`The ${tierName} for gen ${gen} cannot be found`);
      return;
    }

    const dataFilePath = getDataFilePath(tierName);
    console.log(`Loading ${dataFilePath}...`);

    if (!fs.existsSync(dataFilePath)) {
      console.log(`${dataFilePath} doesn't exist : skipping...`);
      return;
    }

    const officialData = JSON.parse(fs.readFileSync(dataFilePath));

    // Clear usages
    await clearTierUsages(gen, tier);

    const savedUsages = await processPokemonsTierUsages(
      gen,
      tier,
      officialData
    );

    // Teammates must be inserted after
    // Because these tables ask tier_usage.id.
    await processPokemonLinksUsages(gen, tier, officialData, savedUsages);

    console.log(`Import completed for ${tierName}`);
  } catch (e) {
    console.log(e);
  }
};

(async () => {
  try {
    for (const tier of tiers) {
      if (
        tier.official &&
        tier.main &&
        tier.playable &&
        tier?.gen?.includes(Number(gen))
      ) {
        console.log(`Importing ${tier.usageName}...`);
        await importOfficialUsages(tier.usageName);
      }
    }
  } catch (e) {
    console.log(e);
  } finally {
    knex.destroy();
  }
})();
