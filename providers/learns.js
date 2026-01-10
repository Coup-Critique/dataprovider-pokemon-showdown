const { loadResource, PROVIDER } = require("../libs/fileLoader");
const { LAST_GEN } = require("../libs/util");
const { Dex } = require("../pokemon-showdown/dist/sim/index.js");
/**
 * Will be used to determine the moves belonging to each pokemon
 */
const DexSearch = require("../pokemon-showdown-client/play.pokemonshowdown.com/js/battle-dex-search.js");
const pokemons = loadResource(PROVIDER, "pokemon");
const searchEngine = new DexSearch();

const findMovesForPokemon = (pokemon, gen) => {
  searchEngine.setType("move", `gen${gen}`, pokemon);
  searchEngine.find();
  return searchEngine.results
    .filter(([resultType, _]) => resultType === "move")
    .map(([_, moveId]) => Dex.moves.get(moveId).name);
};

let learns = [];

for (let gen = 1; gen <= LAST_GEN; gen++) {
  const pokemonsForGen = pokemons.filter(({ gen: _gen }) => _gen === gen);

  for (const pokemonForGen of pokemonsForGen) {
    const moves = findMovesForPokemon(pokemonForGen.name, gen).map(
      (moveName) => {
        const matches = moveName.match(/(Hidden Power)\s(\w+)/);

        if (!!matches) {
          return `${matches[1]} \[${matches[2]}\]`;
        }
        return moveName;
      }
    );

    if (moves.length === 0) continue;
    learns.push({
      pokemon: pokemonForGen.name,
      moves,
      gen,
    });
  }
}

module.exports = learns;
