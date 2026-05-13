const { loadResource, PROVIDER } = require("../libs/fileLoader");
const { LAST_GEN } = require("../libs/util");
const { Dex } = require("../pokemon-showdown/dist/sim/index.js");
const pokemons = loadResource(PROVIDER, "pokemon");
const championsDex = Dex.mod("champions");

const HP_TYPES = [
  "Bug",
  "Dark",
  "Dragon",
  "Electric",
  "Fighting",
  "Fire",
  "Flying",
  "Ghost",
  "Grass",
  "Ground",
  "Ice",
  "Poison",
  "Psychic",
  "Rock",
  "Steel",
  "Water",
];

const getMovesFromLearnset = (dex, pokemon, genFilter) => {
  const fullLearnset = dex.species.getFullLearnset(pokemon);
  if (!fullLearnset) return [];

  const moveIds = new Set();
  for (const entry of fullLearnset) {
    if (!entry.learnset) continue;
    for (const [moveId, methods] of Object.entries(entry.learnset)) {
      if (!genFilter || methods.some((m) => parseInt(m[0]) === genFilter)) {
        moveIds.add(moveId);
      }
    }
  }

  const moves = [];
  for (const moveId of moveIds) {
    const move = dex.moves.get(moveId);
    if (!move.exists) continue;
    moves.push(move.name);
    if (moveId === "hiddenpower") {
      HP_TYPES.forEach((type) => moves.push(`Hidden Power ${type}`));
    }
  }
  return moves;
};

const formatMoveName = (moveName) => {
  const matches = moveName.match(/(Hidden Power)\s(\w+)/);
  if (matches) return `${matches[1]} \[${matches[2]}\]`;
  return moveName;
};

const findMovesForPokemon = (pokemon, gen) =>
  getMovesFromLearnset(Dex.mod(`gen${gen}`), pokemon, gen);

const findMovesForChampions = (pokemon) =>
  getMovesFromLearnset(championsDex, pokemon);

let learns = [];

const lastGenDex = Dex.mod(`gen${LAST_GEN}`);
const unavailablePokemons = new Set();

for (let gen = 1; gen <= LAST_GEN; gen++) {
  const pokemonsForGen = pokemons.filter(({ gen: _gen }) => _gen === gen);

  for (const pokemonForGen of pokemonsForGen) {
    const isUnavailable =
      gen == LAST_GEN &&
      lastGenDex.species.get(pokemonForGen.name).isNonstandard === "Past";

    const moves = isUnavailable
      ? []
      : findMovesForPokemon(pokemonForGen.name, gen).map(formatMoveName);

    if (moves.length === 0 && !isUnavailable) continue;
    learns.push({ pokemon: pokemonForGen.name, moves, gen });
    if (isUnavailable) unavailablePokemons.add(pokemonForGen.name);
  }
}

const lastLearnByPokemon = new Map();
for (const learn of learns) {
  const prev = lastLearnByPokemon.get(learn.pokemon);
  if (!prev || learn.gen > prev.gen) {
    lastLearnByPokemon.set(learn.pokemon, learn);
  }
}

for (const learn of lastLearnByPokemon.values()) {
  const species = championsDex.species.get(learn.pokemon);
  if (!species.exists) continue;

  const championsMoves = findMovesForChampions(learn.pokemon).map(
    formatMoveName
  );
  if (championsMoves.length === 0) continue;

  const standardSet = new Set(learn.moves);
  const championsSet = new Set(championsMoves);

  learn.championsLoss = learn.moves.filter((m) => !championsSet.has(m));
  learn.championsAdd = championsMoves.filter((m) => !standardSet.has(m));

  if (
    learn.championsAdd.length > 0 &&
    !unavailablePokemons.has(learn.pokemon)
  ) {
    learn.moves = [...learn.moves, ...learn.championsAdd];
  }
}

module.exports = learns;
