const { loadResource, LIBS, DEX } = require("../libs/fileLoader");
const { LAST_GEN, range, isStandard } = loadResource(LIBS, "util");
const { Dex } = require("../pokemon-showdown/dist/sim/index.js");
let itemsCollection = range(1, LAST_GEN).map((gen) => ({
  usageName: "noitem",
  name: "No Item",
  description: "Pas d'objet tenu",
  gen,
}));

const makeItemObject = (rawObject, gen) => ({
  usageName: rawObject.id,
  name: rawObject.name,
  description: rawObject.desc,
  gen,
  itemUserId: rawObject.itemUser?.[0] ?? null,
  megaId: rawObject.megaStone ? Object.values(rawObject.megaStone)[0] : null,
  zMoveId: typeof rawObject.zMove === "string" ? rawObject.zMove : null,
  zMoveFromId: rawObject.zMoveFrom ?? null,
});

for (let gen = 1; gen <= LAST_GEN; gen++) {
  const itemsFromShowdown = Dex.mod(`gen${gen}`)
    .items.all()
    .filter(
      (item) =>
        isStandard(item, gen, item.num > 0) &&
        item.name !== "No Item" &&
        !/TR\d+/.test(item.name)
    );
  for (const itemFromShowdown of itemsFromShowdown)
    itemsCollection.push(makeItemObject(itemFromShowdown, gen));
}

// After for Dex mod
const championsDex = Dex.mod("champions");

for (const item of itemsCollection) {
  if (item.gen == LAST_GEN && item.name !== "No Item") {
    const champItem = championsDex.items.get(item.usageName);
    item.champions = champItem.exists && !champItem.isNonstandard;
  }
}

module.exports = itemsCollection;
