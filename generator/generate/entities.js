const path = require("path");
const fs = require("fs");

/**
 * This takes all the entitiy definition files in the vanilla behaviour pack
 * provided in bedrock-samples, and extracts their width and height.
 * It attempts to get the display name from the game's translations, as entity
 * translation IDs are more consistent than items' ones. If a translation isn't found
 * it will default to the string ID of the entity.
 */
module.exports = async (cwd, translations) => {
  const entityFolderPath = path.join(cwd, "bedrock-samples/behavior_pack/entities");

  const entities = [];
  for (const [i, entityFile] of Object.entries(await fs.promises.readdir(entityFolderPath))) {
    const definitionStr = await fs.promises.readFile(path.join(entityFolderPath, entityFile), "utf-8");

    const lines = definitionStr.split("\n");
    const commentlessLines = lines.map((x) =>
      x
        .trim()
        .replace(/\/\/.*$/g, "")
        .trim()
    );
    const entityDefinition = JSON.parse(commentlessLines.join("\n"));

    const name = entityDefinition["minecraft:entity"].description.identifier.replace("minecraft:", "");
    const cbox = entityDefinition["minecraft:entity"].components?.["minecraft:collision_box"] ?? {
      width: 0,
      height: 0,
    };

    entities.push({
      id: parseInt(i),
      displayName: translations["entity." + name + ".name"] ?? name,
      name,
      type: "mob",
      width: cbox.width,
      height: cbox.height,
    });
  }

  return entities;
};
