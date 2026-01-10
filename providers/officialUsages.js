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

const getPikalyticsTierUrl = (tierName, period) =>
  `https://www.pikalytics.com/api/l/${period}/home${officialTiersMapping[tierName]}-1760`;

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

getOfficialUsages = async () => {
  const results = [];
  const periods = Array.isArray(months) ? months : [];

  const eligibleTiers = getEligibleTiers();

  await Promise.all(
    periods.map(async (period) => {
      const officialsDir = path.join(
        __dirname,
        "..",
        "usages",
        "months",
        period,
        "officials"
      );
      ensureDir(officialsDir);

      return await Promise.all(
        eligibleTiers.map(async (tier) => {
          const tierKey = getTierKey(tier);
          if (!tierKey) {
            console.error({
              period,
              tier: tier.usageName,
              message: "Tier non trouvé",
            });
            return;
          }

          const url = getPikalyticsTierUrl(tierKey, period);
          let response = null;
          let payload = [];
          try {
            response = await fetch(url);
            payload = await response.json();
          } catch (error) {
            console.error({
              url,
              period,
              tier: tier.usageName,
              message: "Erreur lors de la récupération des données",
              error: error.message,
              response,
            });
            return;
          }

          const top100 = payload.slice(0, 100);
          const filePath = path.join(officialsDir, `${tier.usageName}.json`);
          fs.writeFileSync(filePath, JSON.stringify(top100, null, 2));

          console.log({
            url,
            success: true,
            period,
            tier: tier.usageName,
            filePath,
            count: top100.length,
          });
          return;
        })
      );
    })
  );

  return results;
};

getOfficialUsages();

module.exports = getOfficialUsages;
