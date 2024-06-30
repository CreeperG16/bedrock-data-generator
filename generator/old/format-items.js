//const DYES = {
//  ink_sac: "item.dye.black.name",
//  black_dye: "item.dye.black_new.name",
//  lapis_lazuli: "item.dye.blue.name",
//  blue_dye: "item.dye.blue_new.name",
//  cocoa_beans: "item.dye.brown.name",
//  brown_dye: "item.dye.brown_new.name",
//  cyan_dye: "item.dye.cyan.name",
//  gray_dye: "item.dye.gray.name",
//  green_dye: "item.dye.green.name",
//  light_blue_dye: "item.dye.lightBlue.name",
//  lime_dye: "item.dye.lime.name",
//  magenta_dye: "item.dye.magenta.name",
//  orange_dye: "item.dye.orange.name",
//  pink_dye: "item.dye.pink.name",
//  purple_dye: "item.dye.purple.name",
//  red_dye: "item.dye.red.name",
//  light_gray_dye: "item.dye.silver.name",
//  bone_meal: "item.dye.white.name",
//  white_dye: "item.dye.white_new.name",
//  yellow_dye: "item.dye.yellow.name",
//}

//const BUCKETS = {
//  lava_bucket: "item.bucketLava.name",
//  water_bucket: "item.bucketWater.name",
//  cod_bucket: "item.bucketFish.name",
//  salmon_bucket: "item.bucketSalmon.name",
//  tropical_fish_bucket: "item.bucketTropical.name",
//  pufferfish_bucket: "item.bucketPuffer.name",
//  axolotl_bucket: "item.bucketAxolotl.name",
//}

//const spawnegg = (itemName) => "item.spawn_egg.entity." + itemName.replace("_spawn_egg", "") + ".name"

//const genericSlab = (itemName) => "tile.stone_slab." + itemName.replace("_slab", "") + ".name";
//const OTHER_SLABS = {
//  stone_brick_slab: "tile.stone_slab.smoothStoneBrick.name",
//  brick_slab: "tile.stone_slab.brick.name",
//  cobblestone_slab: "tile.stone_slab.cobble.name",
//  smooth_stone_slab: "tile.stone_slab.name",
//}

//module.exports = (itemData, languageData) => {
//  return itemData.map(({ id, stackSize }, index) => {
//    /** @type {string} */
//    const name = id.replace("minecraft:", "");
//    /** @type {string} */
//    let displayName =
//      languageData["item." + name + ".name"] ??
//      languageData["tile." + name + ".name"] ??
//      languageData[DYES[name]] ??
//      languageData[BUCKETS[name]] ??
//      languageData[spawnegg(name)] ??
//      "N/A";

//    return {
//      id: index,
//      displayName,
//      stackSize,
//      name,
//    };
//  });
//};

module.exports = (itemData, itemMap) => {
  return itemData.map((item) => {
    const name = item.id.replace("minecraft:", "");
    const mapEntry = itemMap.get(item.id);

    return {
      ...item,
      id: mapEntry?.id ?? "N/A",
      displayName: mapEntry?.displayName ?? "N/A",
      name,
    }
  })
}
