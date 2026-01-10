const { loadResource, LIBS } = require("../libs/fileLoader");
const { removeParenthesis, LAST_GEN, isStandard } = loadResource(LIBS, "util");
const { Dex } = require("../pokemon-showdown/dist/sim/index.js");
let pokemonTier = [];

const makePokemonTierObject = ({ name, tier, doubleTiers }, gen) => ({
  pokemon: name,
  technically: tier.includes("ZUBL") ?? tier.startsWith("("),
  tier: removeParenthesis(tier.replace("ZUBL", "PU")),
  doubleTiers,
  gen,
});

for (let gen = 1; gen <= LAST_GEN; gen++) {
  const pokemonsFromShowdown = Dex.mod(`gen${gen}`)
    .species.all()
    .filter((pokemon) => isStandard(pokemon, gen, pokemon.num > 0));
  for (const pokemonFromShowdown of pokemonsFromShowdown) {
    pokemonTier.push(makePokemonTierObject(pokemonFromShowdown, gen));
    if (pokemonFromShowdown.cosmeticFormes)
      pokemonFromShowdown.cosmeticFormes.forEach((cosmeticFormName) => {
        pokemonTier.push(
          makePokemonTierObject(
            Dex.mod(`gen${gen}`).species.get(cosmeticFormName),
            gen
          )
        );
      });
  }
}

module.exports = pokemonTier;
