const bedrockServer = require("minecraft-bedrock-server");
const bedrockProto = require("bedrock-protocol");
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const { BEDROCK_SAMPLES_URL, SERVER_PROPERTIES, SERVER_PERMISSIONS } = require("../constants");
const httpResponse = require("./http-server");
const parseLang = require("./parse-lang");
const formatItems = require("./format-items");
const formatEntities = require("./format-entities");

const hasArg = (arg) => process.argv.includes("--" + arg);
const getArg = (arg) => process.argv.at(process.argv.indexOf("--" + arg) + 1);

const exec = (command) => new Promise((resolve) => cp.exec(command, resolve));

const cwd = path.resolve("..");

if (!hasArg("version")) throw new Error("Please provide a version!");
const version = getArg("version");

async function writeData(file, data) {
  await fs.promises.writeFile(path.join(cwd, "data-output", file + ".json"), JSON.stringify(data, null, 2));
}

async function main() {
  if (fs.existsSync(path.join(cwd, "data-output"))) {
    console.log("Deleting old output directory...");
    await fs.promises.rmdir(path.join(cwd, "data-output"), { recursive: true });
  }

  console.log("Creating output directory...");
  await fs.promises.mkdir(path.join(cwd, "data-output"));

  console.log("Downloading bedrock server...");
  await bedrockServer.downloadServer(version, { path: path.join(cwd, "server"), ...SERVER_PROPERTIES });

  console.log("Cloning samples repo...");
  await exec(`git clone ${BEDROCK_SAMPLES_URL} ${path.join(cwd, "bedrock-samples")}`);

  console.log("Parsing lang file...");
  const lang = await parseLang(path.join(cwd, "bedrock-samples/resource_pack/texts/en_US.lang"));
  await writeData("language", lang);

  console.log("Saving sounds...");
  const sounds = await fs.promises
    .readFile(path.join(cwd, "bedrock-samples/resource_pack/sounds/sound_definitions.json"), "utf-8")
    .then((x) => JSON.parse(x));
  await writeData(
    "sounds",
    Object.keys(sounds.sound_definitions).map((x, i) => ({ id: i, name: x }))
  );

  console.log("Saving particles...");

  console.log("Copying world to server...");
  await fs.promises.cp(path.join(cwd, "world"), path.join(cwd, "server/worlds/bedrock-data-generator"), {
    recursive: true,
  });

  console.log("Starting HTTP server...");
  const httpRes = httpResponse(3000);

  console.log("Starting Minecraft server...");
  const server = await bedrockServer.prepare(version, { path: path.join(cwd, "server"), ...SERVER_PROPERTIES });

  const packManifest = await fs.promises
    .readFile(path.join(cwd, "behaviourpack/manifest.json"), "utf-8")
    .then((x) => JSON.parse(x));

  // broken as it uses fs.copyFile instead of fs.cp, which doesn't work on directories
  //await server.addBehaviorPack(path.join(cwd, "behaviourpack"), packManifest.header.name);

  if (fs.existsSync(path.join(cwd, "server/behaviourpacks", packManifest.header.name))) {
    await fs.promises.rmdir(path.join(cwd, "server/behavior_packs", packManifest.header.name), { recursive: true });
  }
  await fs.promises.cp(
    path.join(cwd, "behaviourpack"),
    path.join(cwd, "server/behavior_packs", packManifest.header.name),
    { recursive: true }
  );
  await server.enableBehaviorPack(packManifest.header.uuid, packManifest.header.version.join("."));

  await server.toggleExperiments({ gametest: true });

  await fs.promises.writeFile(
    path.join(cwd, "server/config/default/permissions.json"),
    JSON.stringify(SERVER_PERMISSIONS),
    { recursive: true }
  );

  await server.startAndWaitReady();
  console.log("Minecraft server started.");

  const httpData = await httpRes;

  // Connecting client
  const client = bedrockProto.createClient({
    host: "127.0.0.1",
    port: SERVER_PROPERTIES["server-port"],
    username: "bedrock-data-generator",
    offline: true,
  });

  async function finish() {
    client.disconnect();
    await server.stop();

    console.log("Done!");
    process.exit(0);
  }

  const itemMap = new Map();
  client.once("start_game", (packet) => {
    for (const item of packet.itemstates) itemMap.set(item.name, { id: item.runtime_id });
  });

  let lastItem = "";
  client.on("text", async (packet) => {
    if (packet.type !== "json") return;

    const {
      rawtext: [msg],
    } = JSON.parse(packet.message);

    if (typeof msg.text !== "undefined") {
      if (msg.text === "ITEMS_DONE") {
        console.log("Writing item data...");
        const itemData = formatItems(httpData.items, itemMap);
        await writeData(
          "items",
          itemData.sort((a, b) => a.id - b.id)
        );

        await finish();
      }
      lastItem = msg.text;
    } else {
      const itm = itemMap.get(lastItem);
      if (!itm) console.warn("Item %s does not exist in itemstates.", lastItem);

      const displayName = msg.with.rawtext[0].text;

      itemMap.set(lastItem, { ...itm, displayName });
    }
  });

  const entityData = await formatEntities(path.join(cwd, "bedrock-samples/behavior_pack/entities"), lang);
  await writeData("entities", entityData);
}

main();
