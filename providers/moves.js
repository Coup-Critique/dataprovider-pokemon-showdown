const { LAST_GEN, isStandard } = require("../libs/util");
const { Dex } = require("../pokemon-showdown/dist/sim/index.js");

const makeMoveObject = (rawObject, gen) => ({
  usageName: rawObject.id,
  name: rawObject.name,
  category: rawObject.category,
  description: rawObject.desc,
  shortDescription: rawObject.shortDesc,
  power: rawObject.basePower,
  pp: rawObject.pp,
  accuracy: rawObject.accuracy,
  type: rawObject.type,
  priority: rawObject.priority,
  flags: rawObject.flags,
  target: rawObject.target,
  gen,
});

let movesCollection = [];
for (let gen = 1; gen <= LAST_GEN; gen++) {
  const movesFromShowdown = Dex.mod(`gen${gen}`)
    .moves.all()
    .filter((move) => isStandard(move, gen, move.num > 0))
    .map((move) => {
      if (/Hidden Power (\w+)/.test(move.name)) {
        move.name = `Hidden Power [${move.type}]`;
        move.id = ("hiddenpower" + move.type).toLowerCase();
      }
      return makeMoveObject(move, gen);
    });
  movesCollection.push(...movesFromShowdown);
}

// After for Dex mod
const championsDex = Dex.mod("champions");

for (const move of movesCollection) {
  if (move.gen == LAST_GEN) {
    const champMove = championsDex.moves.get(move.usageName);
    move.champions = champMove.exists && !champMove.isNonstandard;
  }
}

module.exports = movesCollection;
