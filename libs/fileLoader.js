const path = require("path");
module.exports.PROVIDER = "PROVIDER";
module.exports.LIBS = "LIBS";
module.exports.JSON = "JSON";

module.exports.loadResource = (resourceType, ...pathArray) => {
  switch (resourceType) {
    case this.LIBS:
      return require(path.join(__dirname, "..", "libs", ...pathArray));
    case this.PROVIDER:
      return require(path.join(__dirname, "..", "providers", ...pathArray));
    case this.JSON:
      return require(path.join(__dirname, "..", "json", ...pathArray));
  }
};
