const { Dex } = require("pokemon-showdown");

const natures = Object.entries(Dex.natures.all()).map(
  ({ id: key, name, plus, minus }) => {
    const nature = { name, usageName: key };
    if (plus) nature[plus] = 1;
    if (minus) nature[minus] = -1;
    return nature;
  }
);

module.exports = natures;
