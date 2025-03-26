// WIP

const fs = require("fs");
const path = require("path");
const nbt = require("prismarine-nbt");

/**
 * This takes the mojang-blocks.json file that Mojang provides in bedrock-samples, and converts
 * it into the blockStates.json file for minecraft-data.
 * @param {string} cwd
 */
module.exports = async (cwd) => {
    const blocksPath = path.join(cwd, "bedrock-samples/metadata/vanilladata_modules/mojang-blocks.json");
    const blocksJson = await fs.promises.readFile(blocksPath, "utf-8").then((x) => JSON.parse(x));

    function generatePermutations(properties, index = 0, currentPermutation = {}) {
        if (index === properties.length) return [currentPermutation];

        const currentProperty = properties[index];
        const permutations = [];

        for (const valueObj of currentProperty.values) {
            const newPermutation = {
                ...currentPermutation,
                [currentProperty.name]: { type: currentProperty.type, value: valueObj.value },
            };
            permutations.push(...generatePermutations(properties, index + 1, newPermutation));
        }

        return permutations;
    }

    function sortStates(states) {
        const sorted = {};
        for (const key of Object.keys(states).sort()) sorted[key] = states[key];
        return sorted;
    }

    function computeFnv1a32Hash(buf) {
        const FNV1_OFFSET_32 = 0x811c9dc5;
        let h = FNV1_OFFSET_32;
        for (let i = 0; i < buf.length; i++) {
            h ^= buf[i] & 0xff;
            h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
        }
        return h & 0xffffffff;
    }

    function getPermutationHash(permutation) {
        const tag = nbt.comp({
            name: nbt.string("minecraft:" + permutation.name),
            states: nbt.comp(permutation.states),
        });

        const buffer = nbt.writeUncompressed(tag, "little");
        return computeFnv1a32Hash(buffer);
    }

    const blockStates = [];
    for (const block of blocksJson.data_items) {
        const permutations = generatePermutations(
            block.properties.map((x) => blocksJson.block_properties.find((y) => y.name === x.name))
        );

        for (const permutation of permutations) {
            blockStates.push({
                name: block.name.replace("minecraft:", "")
            })
        }

        blockStates.push(
            ...permutations.map((x) => ({ name: block.name.replace("minecraft:", ""), states: sortStates(x) }))
        );
    }

    return blockStates;
};
