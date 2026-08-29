const path = require("path");
const fs = require("fs");
const { loadResource, LIBS } = require("../libs/fileLoader");
const { LAST_GEN } = loadResource(LIBS, "util");
const tiers = require("../json/tiers.json");
const months = require("../usages/months.json").list || [];
const lastMonth = months[months.length - 1];
// On remonte jusqu'à 6 mois en arrière si le mois courant n'a pas de données
const MAX_MONTHS_BACK = 6;
const periodsToTry = Array.from({ length: MAX_MONTHS_BACK }, (_, i) => {
  const date = new Date(`${lastMonth}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - i);
  return date.toISOString().slice(0, 7);
});

const officialTiersMapping = {
  championsvgc: "championstournaments", // champions double
  championsbss: "championsbss", // champions singles
  VGC: "homebsd", // battle stadium double
  BSS: "homebss", // battle stadium singles
};

const wait = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getPikalyticsTierUrl = (tierName, period) =>
  `https://www.pikalytics.com/api/l/${period}/${officialTiersMapping[tierName]}-1760`;

const getPikalyticsPokemonDataUrl = (tierName, period, pokemonName) =>
  `https://www.pikalytics.com/api/p/${period}/${officialTiersMapping[tierName]}-1760/${pokemonName}`;

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const getTierKey = ({ name = "", usageName = "" }) => {
  if (name.includes("Champions Duo") || usageName.includes("championsvgc")) {
    return "championsvgc";
  }
  // if (name.includes('Champions Solo') || usageName.includes('championsbss')) {
  // 	return null;
  // }
  // if (name.includes('VGC') || usageName.includes('vgc')) return 'VGC';
  // if (name.includes('BSS') || usageName.includes('bss')) return 'BSS';
  return null;
};

/**
 * Récupère le classement d'un tier sur la période la plus récente qui
 * renvoie effectivement des données.
 * @returns {Promise<{period: string, url: string, payload: Array}|null>}
 */
const fetchTierRanking = async (tierKey) => {
  for (const period of periodsToTry) {
    const url = getPikalyticsTierUrl(tierKey, period);
    let payload = null;
    try {
      const response = await fetch(url);
      payload = await response.json();
    } catch (error) {
      console.error("failed for tier " + tierKey + " on period " + period);
      continue;
    }
    if (!Array.isArray(payload) || !payload.length) {
      console.log("no data for tier " + tierKey + " on period " + period);
      continue;
    }
    return { period, url, payload };
  }
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
  const eligibleTiers = getEligibleTiers();

  for (const tier of eligibleTiers) {
    const tierKey = getTierKey(tier);
    if (!tierKey) {
      console.error({
        period: lastMonth,
        tier: tier.usageName,
        error: "Tier non trouvé",
      });
      continue;
    }

    const result = await fetchTierRanking(tierKey);
    if (!result) {
      console.error({
        tier: tier.usageName,
        periods: periodsToTry,
        error: "Aucune donnée sur les périodes testées",
      });
      continue;
    }
    const { period, url, payload } = result;
    console.log("run " + tierKey + " on period " + period);

    // Les données sont écrites dans le dossier du mois dont elles viennent
    // réellement. C'est l'import qui remonte au mois précédent si le
    // dernier mois n'a rien.
    const officialsDir = path.join(
      __dirname,
      "..",
      "usages",
      "months",
      period,
      "officials"
    );
    ensureDir(officialsDir);

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
        pokemonData.push(
          pokemon.percent ? { ...payload, percent: pokemon.percent } : payload
        );
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
})();
