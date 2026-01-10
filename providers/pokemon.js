const { loadResource, LIBS } = require("../libs/fileLoader");
const { LAST_GEN, isStandard } = loadResource(LIBS, "util");
const { Dex } = require("../pokemon-showdown/dist/sim/index.js");
const { deletedPokemons } = require("../json/deleted_pokemons");
let pokemonsCollection = [];

const isDeleted = (name) =>
  /.*-Totem./.test(name) || deletedPokemons.includes(name);

const getBaseForm = ({ name, changesFrom, baseSpecies }) => {
  // Take in priority changesFrom (for not basic form)
  let baseForm = changesFrom || baseSpecies || null;
  if (baseForm == name) baseForm = null;
  return baseForm;
};

const getNotDeletedForm = (name, gen) => {
  if (!isDeleted(name)) return name;

  const pokemon = Dex.mod(`gen${gen}`).species.get(name);
  const baseForm = getBaseForm(pokemon);
  if (!baseForm) return null;

  return getNotDeletedForm(baseForm, gen);
};

const getAbilities = (abilities, gen) => {
  if (gen < 5) {
    abilities["H"] = null;
  } else if (gen < 3) {
    abilities["0"] = null;
    abilities["1"] = null;
  }
  // Sometimes abilities are not put in the pokemon's data with the correct gen
  for (const abilityClassifier of ["0", "1", "H", "S"]) {
    if (abilities[abilityClassifier]) {
      const DexAbility = Dex.mod(`gen${gen}`).abilities.get(
        abilities[abilityClassifier]
      );
      abilities[abilityClassifier] = DexAbility.exists ? DexAbility.name : null;
    } else {
      abilities[abilityClassifier] = null;
    }
  }
  return abilities;
};

const makePokemonObject = (
  {
    abilities,
    id: usageName,
    num: pokedex,
    name,
    types,
    baseSpecies,
    changesFrom,
    weighthg: weight,
    baseStats,
    prevo,
  },
  gen,
  cosmetic = false
) => {
  const { hp, atk, def, spa, spd, spe } = baseStats;
  const [type_1, type_2] = types;
  abilities = getAbilities(abilities, gen);

  const pokemon = {
    pokedex,
    usageName,
    name,
    type_1,
    type_2,
    hp,
    atk,
    def,
    spa,
    spd,
    spe,
    weight,
    baseForm: getBaseForm({ name, changesFrom, baseSpecies }),
    prevo: prevo || null,
    gen,
    ability_1: abilities["0"],
    ability_2: abilities["1"] || abilities["S"],
    ability_hidden: abilities["H"],
  };
  if (cosmetic || isDeleted(name)) {
    pokemon.deleted = true;
  } else {
    // pokemon.baseForm = getNotDeletedForm(pokemon.baseForm); => should not happen => if your baseform is deleted, you are deleted
    pokemon.prevo = getNotDeletedForm(pokemon.prevo, gen);
  }
  return pokemon;
};

for (let gen = 1; gen <= LAST_GEN; gen++) {
  const pokemonsFromShowdown = Dex.mod(`gen${gen}`)
    .species.all()
    .filter(
      (pokemon) =>
        isStandard(pokemon, gen, pokemon.num > 0) &&
        !(pokemon.forme && /.*-Totem/.test(pokemon.forme) && gen != 7)
    );
  for (const pokemonFromShowdown of pokemonsFromShowdown) {
    pokemonsCollection.push(makePokemonObject(pokemonFromShowdown, gen));
    if (pokemonFromShowdown.cosmeticFormes)
      pokemonFromShowdown.cosmeticFormes.forEach((cosmeticFormName) => {
        pokemonsCollection.push(
          makePokemonObject(
            Dex.mod(`gen${gen}`).species.get(cosmeticFormName),
            gen,
            true
          )
        );
      });
  }
}

module.exports = pokemonsCollection;
