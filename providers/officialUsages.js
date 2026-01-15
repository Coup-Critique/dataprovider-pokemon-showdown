const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const { loadResource, LIBS } = require("../libs/fileLoader");
const { LAST_GEN } = loadResource(LIBS, "util");
const months = require("../usages/months.json").list || [];
const tiers = require("../json/tiers.json");

const officialTiersMapping = {
  VGC: "bsd", // battle stadium double
  BSS: "bss", // battle stadium singles
};

const wait = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getPikalyticsTierUrl = (tierName, period) =>
  `https://www.pikalytics.com/api/l/${period}/home${officialTiersMapping[tierName]}-1760`;

const getPikalyticsPokemonDataUrl = (tierName, period, pokemonName) =>
  `https://www.pikalytics.com/api/p/${period}/home${officialTiersMapping[tierName]}-1760/${pokemonName}`;

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const getTierKey = ({ name = "", usageName = "" }) => {
  if (name.includes("VGC") || usageName.includes("vgc")) return "VGC";
  if (name.includes("BSS") || usageName.includes("bss")) return "BSS";
  return null;
};

getEligibleTiers = () => {
  return tiers.filter(({ main, gen = [], usageName, name }) => {
    if (!main) return false;
    if (!Array.isArray(gen) || !gen.includes(Number(LAST_GEN))) return false;
    return !!getTierKey({ name, usageName });
  });
};

(async () => {
  const periods = Array.isArray(months) ? months : [];

  const eligibleTiers = getEligibleTiers();

  for (const period of periods) {
    const officialsDir = path.join(
      __dirname,
      "..",
      "usages",
      "months",
      period,
      "officials"
    );
    ensureDir(officialsDir);

    for (const tier of eligibleTiers) {
      const tierKey = getTierKey(tier);
      if (!tierKey) {
        console.error({
          period,
          tier: tier.usageName,
          error: "Tier non trouvé",
        });
        continue;
      }

      const url = getPikalyticsTierUrl(tierKey, period);
      let response = null;
      let payload = [];
      try {
        response = await fetch(url);
        payload = await response.json();
      } catch (error) {
        console.error("failed for tier " + tierKey + " on period " + period);
        continue;
      }
      console.log("run " + tierKey + " on period " + period);

      const top100 = payload.slice(0, 100);
      const pokemonData = [];
      for (const pokemon of top100) {
        const url = getPikalyticsPokemonDataUrl(tierKey, period, pokemon.name);
        await wait(1000);
        let response = null;
        let payload = null;
        try {
          response = await fetch(url);
          payload = await response.json();
          pokemonData.push(payload);
        } catch (error) {
          console.error({
            url,
            period,
            pokemon: pokemon.name,
            tier: tier.usageName,
            error: error.message,
            response,
          });
          continue;
        }
      }

      const filePath = path.join(officialsDir, `${tier.usageName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(pokemonData, null, 2));

      console.log({
        url,
        success: true,
        period,
        tier: tier.usageName,
        filePath,
        count: top100.length,
      });
    }
  }
})();
