const { loadResource, LIBS, DEX } = require("../libs/fileLoader");
const { LAST_GEN, isStandard, range } = loadResource(LIBS, "util");
const { Dex } = loadResource(DEX);

const makeAbilityObject = ({ id: usageName, name }, gen) => ({
  usageName,
  name,
  gen,
});

let abilities = range(1, LAST_GEN).map((gen) => ({
  usageName: "noability",
  name: "No Ability",
  gen,
}));

for (let gen = 1; gen <= LAST_GEN; gen++) {
  const abilitiesFromShowdown = Dex.mod(`gen${gen}`)
    .abilities.all()
    .filter(
      (ability) => isStandard(ability, gen) && ability.name !== "No Ability"
    );
  for (const abilityFromShowdown of abilitiesFromShowdown)
    abilities.push(makeAbilityObject(abilityFromShowdown, gen));
}

module.exports = abilities;
