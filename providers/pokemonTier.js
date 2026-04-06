const { loadResource, LIBS } = require("../libs/fileLoader");
const { removeParenthesis, LAST_GEN, isStandard } = loadResource(LIBS, "util");
const { Dex } = require("../pokemon-showdown/dist/sim/index.js");

Dex.includeFormats();

const vgcFormatsByGen = {};
Dex.formats
  .all()
  .filter((f) => f.id.includes("vgc") && !f.id.endsWith("bo3"))
  .forEach((f) => {
    const match = f.id.match(/^gen(\d+)/);
    if (!match) return;
    const gen = Number(match[1]);
    (vgcFormatsByGen[gen] ??= []).push({
      id: f.id,
      mod: f.mod,
      ruleTable: Dex.formats.getRuleTable(f),
    });
  });

const isLegalInFormat = (pokemonId, { mod, ruleTable }) => {
  const species = Dex.mod(mod).species.get(pokemonId);
  if (species.isNonstandard === "Past") return false;
  return !ruleTable.isBannedSpecies(species);
};

const getVGCLegal = (pokemonId, gen) =>
  Object.fromEntries(
    (vgcFormatsByGen[gen] ?? []).map((f) => [
      f.id.replace(/gen\d+/, "").replace(/202\d/, ""),
      isLegalInFormat(pokemonId, f),
    ])
  );

let pokemonTier = [];

const makePokemonTierObject = (pokemon, gen) => ({
  pokemon: pokemon.name,
  technically: pokemon.tier.startsWith("("),
  tier: removeParenthesis(pokemon.tier),
  doubleTiers: pokemon.doubleTiers,
  regulations: getVGCLegal(pokemon.id, gen),
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
