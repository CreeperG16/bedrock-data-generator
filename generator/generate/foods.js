const path = require("path");
const fs = require("fs");

const SATURATION_VALUES = {
  poor: 0.1,
  low: 0.3,
  normal: 0.6,
  //"high": ??
  good: 0.8,
  //"max": ??
  supernatural: 1.2,
};

const NAME_CONVERSIONS = {
  appleEnchanted: "enchanted_golden_apple",
  clownfish: "tropical_fish",
  cooked_fish: "cooked_cod",
  fish: "cod",
  melon: "melon_slice",
  muttonCooked: "cooked_mutton",
  muttonRaw: "mutton",
};

const round1 = (num) => Math.round(num * 10) / 10;

/**
 * This takes all the items and returns only the foods, with
 * food specific data - nutrition and saturation. As the Scripting API's
 * minecraft:food component getter is not yet fully implemented, it reads
 * the item definitions from the vanilla behaviour pack.
 * @param {string} cwd
 * @param {any[]} itemData
 */
module.exports = async (cwd, itemData) => {
  const bpItemsPath = path.join(cwd, "bedrock-samples/behavior_pack/items");
  const bpItems = await fs.promises.readdir(bpItemsPath);

  const foods = [];

  for (const file of bpItems) {
    const itemDefStr = await fs.promises.readFile(path.join(bpItemsPath, file), "utf-8");

    // Mojang put comments in their JSON, so this just removes them before parsing the definition file.
    const itemDef = JSON.parse(
      itemDefStr
        .split("\n")
        .map((line) =>
          line
            .trim()
            .replace(/\/\/.*$/g, "")
            .trim()
        )
        .join("\n")
    );

    const components = itemDef["minecraft:item"].components;
    let name = itemDef["minecraft:item"].description.identifier.replace("minecraft:", "");
    if (name in NAME_CONVERSIONS) name = NAME_CONVERSIONS[name];

    if (!components?.["minecraft:food"]) continue;
    const item = itemData.find((i) => i.name === name);
    if (!item) {
      console.log({ name });
      continue;
    }

    const saturationModifier =
      typeof components["minecraft:food"].saturation_modifier === "string"
        ? SATURATION_VALUES[components["minecraft:food"].saturation_modifier]
        : components["minecraft:food"].saturation_modifier;

    const saturationPoints = components["minecraft:food"].nutrition * saturationModifier * 2;

    foods.push({
      id: item.id,
      displayName: item.displayName,
      name,
      stackSize: item.stackSize,
      foodPoints: components["minecraft:food"].nutrition,
      saruration: round1(saturationPoints),
      effectiveQuality: round1(components["minecraft:food"].nutrition + saturationPoints),
      saturationRatio: round1(saturationModifier * 2),
    });
  }

  return foods;
};
