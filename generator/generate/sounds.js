const path = require("path");
const fs = require("fs");

module.exports = async (cwd) => {
  const soundsFilePath = path.join(cwd, "bedrock-samples/resource_pack/sounds/sound_definitions.json");
  const sounds = await fs.promises.readFile(soundsFilePath, "utf-8").then(x => JSON.parse(x));

  return Object.keys(sounds.sound_definitions).map((x, i) => ({ id: i, name: x }));
}
