const deletedPokemons = [
  // "Keldeo-Resolute", => à voir
  // "Basculin-Blue-Striped", => à voir
  // "Basculin-Red-Striped", => à voir
  // "Morpeko-Hangry", => à voir
  // "Eiscue-Noice", => diff stats like darumacho zen
  // "Eiscue-Ice", => diff stats
  // "Gimmighoul-Roaming", => diff ability
  // 'Pumpkaboo-Super', => diff stats
  // 'Pumpkaboo-Large', => diff stats
  // 'Pumpkaboo-Small', => diff stats
  // 'Gourgeist-Super', => diff stats
  // 'Gourgeist-Large', => diff stats
  // 'Gourgeist-Small', => diff stats
  // 'Squawkabilly-Green', => diff hidden ability
  // 'Squawkabilly-Blue', => diff hidden ability
  // 'Squawkabilly-Yellow', => diff hidden ability
  // 'Squawkabilly-White', => diff hidden ability
  "Genesect-Douse", // => pas sûr
  "Genesect-Shock", // => pas sûr
  "Genesect-Burn", // => pas sûr
  "Genesect-Chill", // => pas sûr
  // 'Rockruff-Dusk', => diff ability
  "Greninja-Bond",
  "Magearna-Original",
  "Zarude-Dada",
  "Mimikyu-Busted",
  "Cramorant-Gulping",
  "Cramorant-Gorging",
  "Dudunsparce-Three-Segment",
  "Maushold-Four",
  "Pichu-Spiky-eared",
  "Polteageist-Antique",
  "Sinistea-Antique",
  "Poltchageist-Artisan",
  "Sinistcha-Masterpiece",
  "Eevee-Partner",
  "Pikachu-Cosplay",
  "Pikachu-Rock-Star",
  "Pikachu-Belle",
  "Pikachu-Pop-Star",
  "Pikachu-PhD",
  "Pikachu-Libre",
  "Pikachu-World",
  "Pikachu-Original",
  "Pikachu-Hoenn",
  "Pikachu-Sinnoh",
  "Pikachu-Unova",
  "Pikachu-Kalos",
  "Pikachu-Partner",
];

const comseticFormes = [
  "Burmy-Trash", // => à voir
  "Burmy-Sandy", // => à voir
  "Burmy-Plant", // => à voir
  "Gastrodon-East",
  "Shellos-East",
  "Gastrodon-West",
  "Shellos-West",
  "Florges-Blue",
  "Florges-Orange",
  "Florges-White",
  "Florges-Yellow",
  "Floette-Blue",
  "Floette-Orange",
  "Floette-White",
  "Floette-Yellow",
  "Flabébé-Blue",
  "Flabébé-Orange",
  "Flabébé-White",
  "Flabébé-Yellow",
  "Sawsbuck-Spring",
  "Sawsbuck-Summer",
  "Sawsbuck-Autumn",
  "Sawsbuck-Winter",
  "Deerling-Spring",
  "Deerling-Summer",
  "Deerling-Autumn",
  "Deerling-Winter",
  "Alcremie-Matcha-Cream",
  "Alcremie-Mint-Cream",
  "Alcremie-Lemon-Cream",
  "Alcremie-Salted-Cream",
  "Alcremie-Matcha-Swirl",
  "Alcremie-Mint-Swirl",
  "Alcremie-Lemon-Swirl",
  "Alcremie-Salted-Swirl",
  "Vivillon-Archipelago",
  "Vivillon-Continental",
  "Vivillon-Elegant",
  "Vivillon-Garden",
  "Vivillon-High Plains",
  "Vivillon-Icy Snow",
  "Vivillon-Jungle",
  "Vivillon-Marine",
  "Vivillon-Modern",
  "Vivillon-Monsoon",
  "Vivillon-Ocean",
  "Vivillon-Polar",
  "Vivillon-River",
  "Vivillon-Sandstorm",
  "Vivillon-Savanna",
  "Vivillon-Sun",
  "Vivillon-Tundra",
  "Vivillon-Fancy",
  "Vivillon-Pokeball",
  "Vivillon-Meadow",
  "Furfrou-Dandy",
  "Furfrou-Debutante",
  "Furfrou-Diamond",
  "Furfrou-Heart",
  "Furfrou-Kabuki",
  "Furfrou-La Reine",
  "Furfrou-Matron",
  "Furfrou-Pharaoh",
  "Furfrou-Star",
  "Minior-Orange",
  "Minior-Yellow",
  "Minior-Green",
  "Minior-Blue",
  "Minior-Indigo",
  "Minior-Violet",
  "Tatsugiri-Droopy",
  "Tatsugiri-Stretchy",
  "Tatsugiri-Curly",
  "Unown-A",
  "Unown-B",
  "Unown-C",
  "Unown-D",
  "Unown-E",
  "Unown-F",
  "Unown-G",
  "Unown-H",
  "Unown-I",
  "Unown-J",
  "Unown-K",
  "Unown-L",
  "Unown-M",
  "Unown-N",
  "Unown-O",
  "Unown-P",
  "Unown-Q",
  "Unown-R",
  "Unown-S",
  "Unown-T",
  "Unown-U",
  "Unown-V",
  "Unown-W",
  "Unown-X",
  "Unown-Y",
  "Unown-Z",
  "Unown-Exclamation",
  "Unown-Question",
];

module.exports = { deletedPokemons, comseticFormes };
