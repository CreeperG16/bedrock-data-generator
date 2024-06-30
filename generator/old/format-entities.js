const fs = require("fs");
const path = require("path");

module.exports = async (entityFolderPath, translations) => {
  const entities = [];
  for (const [i, entityFile] of Object.entries(await fs.promises.readdir(entityFolderPath))) {
    const definitionStr = await fs.promises.readFile(path.join(entityFolderPath, entityFile), "utf-8");

    const lines = definitionStr.split("\n");
    const commentlessLines = lines.map((x) => x.trim().replace(/\/\/.*$/g, "").trim());
    const entityDefinition = JSON.parse(commentlessLines.join("\n"));

    const name = entityDefinition["minecraft:entity"].description.identifier.replace("minecraft:", "");
    const cbox = entityDefinition["minecraft:entity"].components?.["minecraft:collision_box"] ?? { width: 0, height: 0 };

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
