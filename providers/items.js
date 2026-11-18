const { loadResource, LIBS, DEX } = require("../libs/fileLoader");
const { LAST_GEN, range, isStandard } = loadResource(LIBS, "util");
const { Dex } = require("../pokemon-showdown/dist/sim/index.js");
let itemsCollection = range(1, LAST_GEN).map((gen) => ({
  usageName: "noitem",
  name: "No Item",
  description: "Pas d'objet tenu",
  descriptionEn: "No held item",
  gen,
}));

const makeItemObject = (rawObject, gen, text) => ({
  usageName: rawObject.id,
  name: rawObject.name,
  description: text.desc,
  descriptionEn: text.desc,
  gen,
  itemUserId: rawObject.itemUser?.[0] ?? null,
  megaId: rawObject.megaStone ? Object.values(rawObject.megaStone)[0] : null,
  zMoveId: typeof rawObject.zMove === "string" ? rawObject.zMove : null,
  zMoveFromId: rawObject.zMoveFrom ?? null,
});

for (let gen = 1; gen <= LAST_GEN; gen++) {
  const dex = Dex.mod(`gen${gen}`);
  const itemsFromShowdown = dex.items
    .all()
    .filter(
      (item) =>
        isStandard(item, gen, item.num > 0) &&
        item.name !== "No Item" &&
        !/TR\d+/.test(item.name)
    );
  for (const itemFromShowdown of itemsFromShowdown)
    itemsCollection.push(
      makeItemObject(itemFromShowdown, gen, dex.text.get(itemFromShowdown))
    );
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
