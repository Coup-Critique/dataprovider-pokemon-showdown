const { loadResource, PROVIDER } = require("../libs/fileLoader");
const { LAST_GEN } = require("../libs/util");
const { Dex } = require("../pokemon-showdown/dist/sim/index.js");
const DexSearch = require("../pokemon-showdown-client/play.pokemonshowdown.com/js/battle-dex-search.js");
const pokemons = loadResource(PROVIDER, "pokemon");
const searchEngine = new DexSearch();
const championsDex = Dex.mod("champions");

const formatMoveName = (moveName) => {
  const matches = moveName.match(/(Hidden Power)\s(\w+)/);
  if (matches) return `${matches[1]} \[${matches[2]}\]`;
  return moveName;
};

const findMovesForPokemon = (pokemon, gen) => {
  searchEngine.setType("move", `gen${gen}`, pokemon);
  searchEngine.find();
  return searchEngine.results
    .filter(([resultType]) => resultType === "move")
    .map(([, moveId]) => Dex.moves.get(moveId).name);
};

const findMovesForChampions = (pokemon) => {
  searchEngine.setType("move", "championsou", pokemon);
  searchEngine.find();
  return searchEngine.results
    .filter(([resultType]) => resultType === "move")
    .map(([, moveId]) => Dex.moves.get(moveId).name);
};

let learns = [];

for (let gen = 1; gen <= LAST_GEN; gen++) {
  const pokemonsForGen = pokemons.filter(({ gen: _gen }) => _gen === gen);

  for (const pokemonForGen of pokemonsForGen) {
    const moves = findMovesForPokemon(pokemonForGen.name, gen).map(
      formatMoveName
    );
    if (moves.length === 0) continue;
    learns.push({ pokemon: pokemonForGen.name, moves, gen });
  }
}

const lastGenPokemonSet = new Set(
  learns.filter((l) => l.gen == LAST_GEN).map((l) => l.pokemon)
);

for (const learn of learns) {
  if (learn.gen != LAST_GEN) continue;

  const species = championsDex.species.get(learn.pokemon);
  if (!species.exists || species.isNonstandard) continue;

  const championsMoves = findMovesForChampions(learn.pokemon).map(
    formatMoveName
  );
  if (championsMoves.length === 0) continue;

  const standardSet = new Set(learn.moves);
  const championsSet = new Set(championsMoves);

  learn.championsLoss = learn.moves.filter((m) => !championsSet.has(m));
  learn.championsAdd = championsMoves.filter((m) => !standardSet.has(m));

  if (learn.championsAdd.length > 0) {
    learn.moves = [...learn.moves, ...learn.championsAdd];
  }
}

// const championsSpeciesAll = championsDex.species
//   .all()
//   .filter((s) => s.exists && !s.isNonstandard);

// for (const species of championsSpeciesAll) {
//   if (lastGenPokemonSet.has(species.name)) continue;

//   const championsMoves = findMovesForChampions(species.name).map(formatMoveName);
//   if (championsMoves.length === 0) continue;

//   learns.push({
//     pokemon: species.name,
//     moves: championsMoves,
//     gen: parseInt(LAST_GEN),
//     championsLoss: [],
//     championsAdd: championsMoves,
//   });
// }

module.exports = learns;
