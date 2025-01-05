const nbt = require("prismarine-nbt");

/**
 * This extracts biome data from a vanilla BiomeDefinitionList packet's NBT data.
 * the "category" field needs refining, as the packet data just returns multiple
 * related tags for each biome, including their dimension, in no specific order.
 * The game does not seem to use seperate display names for biomes. The "/locate biome"
 * command's output uses the same ID string the biome is referenced by.
 */
module.exports = async (biomeDefList) => {
    const biomeDefs = nbt.simplify(biomeDefList.nbt);

    let id = 0;
    const biomes = [];
    for (const [name, definition] of Object.entries(biomeDefs)) {
        biomes.push({
            id: id++,
            name,
            category: definition.tags.filter((x) => !["animal", "monster", "stone"].includes(x))[0], // TODO: refine this
            temperature: definition.temperature,
            has_percipitation: definition.rain === 1,
            dimension: definition.tags.find((x) => ["overworld", "nether", "the_end"].includes(x)) ?? "overworld",
            displayName: name, // TODO - Find out whether the game actually stores display names for biomes on bedrock?
            color:
                ((definition.waterColorR * 255) << 16) |
                ((definition.waterColorG * 255) << 8) |
                (definition.waterColorB * 255),
        });
    }

    return biomes;
};
