const nbt = require("prismarine-nbt");

module.exports = async (biomeDefList) => {
  const biomeDefs = nbt.simplify(biomeDefList.nbt)

  let id = 0;
  const biomes = [];
  for (const [name, definition] of Object.entries(biomeDefs)) {
    //console.log(name, definition);

    biomes.push({
      id: id++,
      name,
      category: definition.tags.filter(x => !["animal", "monster", "stone"].includes(x))[0], // TODO: refine this
      temperature: definition.temperature,
      has_percipitation: definition.rain === 1,
      dimension: definition.tags.find(x => ["overworld", "nether", "the_end"].includes(x)) ?? "overworld",
      displayName: "N/A",
      color: ((definition.waterColorR * 255) << 16) | ((definition.waterColorG * 255) << 8) | (definition.waterColorB * 255),
    });
  }

  return biomes;
}
