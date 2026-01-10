const { loadResource, LIBS } = require("../libs/fileLoader");
const { Dex } = require("../pokemon-showdown/dist/sim/index.js");
const { LAST_GEN, isStandard } = loadResource(LIBS, "util");
/**
 * Smogon's damageTaken property with its different values
 */
const NORMAL = 0;
const STRONG = 1;
const WEAK = 2;
const IMMUNE = 3;

const WEAKNESS = {
  [NORMAL]: 1,
  [STRONG]: 2,
  [WEAK]: 0.5,
  [IMMUNE]: 0,
}; // translate weakness ratio

let types = [];

for (let gen = 1; gen <= LAST_GEN; gen++) {
  Dex.mod(`gen${gen}`)
    .types.all()
    .filter((type) => isStandard(type))
    .forEach((type) => {
      type.weaknesses = Object.entries(type.damageTaken)
        .filter(([typeAttacker, _]) =>
          isStandard(Dex.mod(`gen${gen}`).types.get(typeAttacker))
        )
        .map(([typeAttacker, value]) => ({
          name: typeAttacker,
          ratio: WEAKNESS[value],
        }));

      [
        "exists",
        "id",
        "effectType",
        "gen",
        "isNonstandard",
        "HPivs",
        "HPdvs",
        "damageTaken",
      ].forEach((attributeToRemove) => delete type[attributeToRemove]);
      type.gen = gen;
      types.push(type);
    });
}

[1, 2, 3, 4].forEach((gen) => types.push({ name: "???", weaknesses: [], gen }));

module.exports = types;
