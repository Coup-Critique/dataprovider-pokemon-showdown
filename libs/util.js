require("dotenv").config();

const fileSystem = require("fs");

const LAST_GEN = process.env.LAST_GEN;

const log = (name, e) => {
  if (e) {
    console.error(`Erreur lors de la création du  fichier ${name}.json :`, e);
  } else {
    console.info(`Création du fichier ${name}.json réussi`);
  }
};

const removeParenthesis = (string) =>
  string.replace(/\(+/g, "").replace(/\)+/g, "");

// prettier-ignore
const writeFile = (fileName, values) => fileSystem.writeFile(
    `json/${fileName}.json`,
    JSON.stringify(values),
    e => log(fileName, e)
);

const isStandard = ({ isNonstandard }, gen = null, otherCondition = true) =>
  otherCondition &&
  (!isNonstandard ||
    isNonstandard === "Gigantamax" || // keep Gmax forms
    isNonstandard === "Unobtainable" || // keep Unobtainable real mons
    (gen &&
      gen == LAST_GEN &&
      (isNonstandard === "Past" || isNonstandard === "Future")));
/**
 * Returns an array of sequential numbers
 * like in python with the native range statement
 * @param {number} start
 * @param {number} end
 * @returns an array of numbers
 */
const range = (start, end) =>
  Array(end - start + 1)
    .fill()
    .map((_, idx) => start + idx);

const folderUsage = `usages/months/${fileSystem
  .readdirSync(require("path").resolve("usages/months"))
  .pop()}`;

const withoutSpaces = (s) =>
  s
    .replace(/['\s\-.:’%\[\]]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const selectAbilityUsages = (
  abilities,
  { formeAbilities = [], baseAbilities = [] } = {}
) => {
  const entries = [];
  for (const abilityData of abilities || []) {
    const percent = parseFloat(abilityData.percent ?? abilityData.usage);
    if (isNaN(percent) || percent < 1) continue;
    const name = abilityData.ability ?? abilityData.name;
    const fromBase = baseAbilities.includes(name);
    if (!fromBase && !formeAbilities.includes(name)) continue;
    entries.push({ name, percent, fromBase });
  }

  const kept = entries.some((entry) => entry.fromBase)
    ? entries.filter((entry) => entry.fromBase)
    : entries;
  const total = kept.reduce((sum, entry) => sum + entry.percent, 0);

  return kept.map(({ name, percent }) => ({
    name,
    percent: total ? Math.round((percent * 10000) / total) / 100 : percent,
  }));
};

module.exports = {
  writeFile,
  selectAbilityUsages,
  isStandard,
  removeParenthesis,
  LAST_GEN,
  range,
  withoutSpaces,
  folderUsage,
};
