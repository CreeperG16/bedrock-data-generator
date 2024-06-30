const fs = require("fs");
const path = require("path");

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

  const blockStates = [];
  for (const block of blocksJson.data_items) {
    const permutations = generatePermutations(
      block.properties.map((x) => blocksJson.block_properties.find((y) => y.name === x.name))
    );

    blockStates.push(...permutations.map((x) => ({ name: block.name.replace("minecraft:", ""), states: x })));
  }

  return blockStates;
};
