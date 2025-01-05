const fs = require("fs");
const path = require("path");

// TODO - !!! get incomplete data from somewhere else

/**
 * This takes the mojang-blocks.json file that Mojang provides in bedrock-samples, and converts
 * it into the blocks.json file for minecraft-data.
 * @param {string} cwd
 */
module.exports = async (cwd, language, items) => {
    const blocksPath = path.join(cwd, "bedrock-samples/metadata/vanilladata_modules/mojang-blocks.json");
    const blocksJson = await fs.promises.readFile(blocksPath, "utf-8").then((x) => JSON.parse(x));

    const blocks = blocksJson.data_items.map((block) => {
        const name = block.name.replace("minecraft:", "")

        return {
            id: block.raw_id,
            name,
            displayName: language[block.serialization_id],

            // TODO - all of this data
            stackSize: items.find(item => item.name === name)?.stackSize ?? "NOTFOUND",

            defaultState: 0,
            minStateId: 0,
            maxStateId: 0,

            hardness: 0,
            diggable: true,
            transparent: false,
            emitLight: 0,
            filterLight: 0,
            drops: [],
            boundingBox: "block",
        }
    })

    return blocks;
};
