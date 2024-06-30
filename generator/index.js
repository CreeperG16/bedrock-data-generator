const bedrockServer = require("minecraft-bedrock-server");
const bedrockProto = require("bedrock-protocol");
const mcdata = require("minecraft-data");
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const { BEDROCK_SAMPLES_URL, SERVER_PROPERTIES, SERVER_PERMISSIONS } = require("./constants");

// Data generators
const generators = {
  language: require("./generate/language"),
  sounds: require("./generate/sounds"),
  particles: require("./generate/particles"),
  entities: require("./generate/entities"),
  items: require("./generate/items"),
  foods: require("./generate/foods"),
  biomes: require("./generate/biomes"),
  recipes: require("./generate/recipes"),
  blockStates: require("./generate/blockStates"),
  version: require("./generate/version"),
};

const hasArg = (arg) => process.argv.includes("--" + arg);
const getArg = (arg) => process.argv.at(process.argv.indexOf("--" + arg) + 1);

const exec = (command, options = {}) => new Promise((resolve) => cp.exec(command, options, (...a) => resolve(a)));

const cwd = path.resolve("..");
const p = (...a) => path.join(cwd, ...a);

console.log("Running generator in directory '%s'...", cwd);

if (!hasArg("version")) throw new Error("Please provide a version!");
const mcversion = getArg("version");
if (mcversion.split(".").length < 3) throw new Error("Version must have three parts. e.g: '1.21.0'");

async function saveMcdata(file, data) {
  await fs.promises.writeFile(p("mcdata-output", file + ".json"), JSON.stringify(data, null, 2));
}

async function download() {
  console.log("Cloning samples repo...");
  await exec(`git clone ${BEDROCK_SAMPLES_URL} ${p("bedrock-samples")}`);

  let [, tag] = await exec(`git tag -l "v${mcversion}.[0-8]"`, { cwd: p("bedrock-samples") });
  if (tag.trim().length === 0) {
    const [, major, minor] = mcversion.split(".");
    [, tag] = await exec(`git tag -l "v1.${major}.${minor.substring(0, minor.length-1)}[0-9].[0-9]"`, { cwd: p("bedrock-samples") });
  }
  if (tag.trim().length === 0) {
    throw new Error("Could not find tag for version '" + mcversion + "'.");
  }

  await exec(`git checkout tags/${tag.trim()}`, { cwd: p("bedrock-samples") });
  console.log("Checked out tag '%s'.", tag.trim());

  console.log("Downloading bedrock server...");
  const isDownloaded = fs.existsSync(p("server"));
  if (isDownloaded) {
    const downloadedVersion = await fs.promises.readFile(p("server/version.txt"), "utf-8");
    if (downloadedVersion === mcversion) return;

    console.log("Removing old server...");
    await fs.promises.rm(p("server"), { recursive: true, force: true });
  }
  await bedrockServer.downloadServer(mcversion, { path: p("server"), ...SERVER_PROPERTIES });
  await fs.promises.writeFile(p("server/version.txt"), mcversion);
}

async function start() {
  console.log("Preparing server...");

  // Copy world
  await fs.promises.cp(p("world"), p("server/worlds/bedrock-data-generator"), { recursive: true });

  // Prepare server
  const server = await bedrockServer.prepare(mcversion, { path: p("server"), ...SERVER_PROPERTIES });

  // Set permissions
  await fs.promises.writeFile(p("server/config/default/permissions.json"), JSON.stringify(SERVER_PERMISSIONS), {
    recursive: true,
  });

  // Add behaviour pack
  const bpManifest = await fs.promises
    .readFile(p("behaviourpack/manifest.json"), "utf-8")
    .then((file) => JSON.parse(file));

  await fs.promises.cp(p("behaviourpack"), p("server/behavior_packs", bpManifest.header.name), { recursive: true });
  await server.enableBehaviorPack(bpManifest.header.uuid, bpManifest.header.version.join("."));

  // Set gametest version to latest beta
  const scriptVersions = await fs.promises
    .readdir(p("bedrock-samples/metadata/script_modules/@minecraft"))
    .then((files) => files.filter((f) => f.startsWith("server_")));

  const scriptVersion = scriptVersions.find(file => file.endsWith("-beta.json")).replace("server_", "").replace(".json", "");
  bpManifest.dependencies.find(d => d.module_name === "@minecraft/server").version = scriptVersion;
  await fs.promises.writeFile(p("server/behavior_packs/", bpManifest.header.name, "manifest.json"), JSON.stringify(bpManifest));

  // Turn on beta APIs experiment
  await server.toggleExperiments({ gametest: true });

  // Start server
  const handle = await server.startAndWaitReady();
  handle.stdout.unpipe(process.stdout);

  console.log("Connecting client...");
  // Connect client
  const pong = await bedrockProto.ping({ host: "127.0.0.1", port: SERVER_PROPERTIES["server-port"] });
  console.log("Connecting to server with protocol version %s.", pong.protocol);

  const clientVer = mcdata.versions.bedrock.find(x => x.version == pong.protocol)?.minecraftVersion;
  if (!clientVer) {
    throw new Error("Version '" + pong.protocol + "' (" + pong.version + ") not supported by bedrock-protocol.");
  }

  const client = bedrockProto.createClient({
    host: "127.0.0.1",
    port: SERVER_PROPERTIES["server-port"],
    username: "bedrock-data-generator",
    offline: true,
    version: clientVer,
    skipPing: true,
  });

  const finish = async () => {
    client.disconnect();
    await server.stop();
  };

  return { server, client, finish };
}

const waitClientEvent = (name, client) => new Promise((r) => client.once(name, r));

async function main() {
  if (fs.existsSync(p("mcdata-output"))) {
    console.log("Deleting old mcdata output directory...");
    await fs.promises.rm(p("mcdata-output"), { recursive: true, force: true });
  }

  console.log("Creating mcdata output directory...");
  await fs.promises.mkdir(p("mcdata-output"));

  console.log("\n-------- Downloading resources --------");
  await download();

  console.log("\n----- Starting server and client ------");
  const { server, client, finish } = await start();

  // Save some packets for later
  const startGame = waitClientEvent("start_game", client);
  const biomeDefList = waitClientEvent("biome_definition_list", client);
  const craftingData = waitClientEvent("crafting_data", client);

  await waitClientEvent("spawn", client);

  console.log("\nSaving data...");

  const language = await generators.language(cwd);
  await saveMcdata("language", language);
  console.log(" - Saved language.json");

  const sounds = await generators.sounds(cwd);
  await saveMcdata("sounds", sounds);
  console.log(" - Saved sounds.json");

  const entities = await generators.entities(cwd, language);
  await saveMcdata("entities", entities);
  console.log(" - Saved entities.json");

  const particles = await generators.particles(cwd);
  await saveMcdata("particles", particles);
  console.log(" - Saved particles.json");

  const items = await generators.items(client, (await startGame).itemstates);
  await saveMcdata("items", items);
  console.log(" - Saved items.json");

  const foods = await generators.foods(cwd, items);
  await saveMcdata("foods", foods);
  console.log(" - Saved foods.json");

  const biomes = await generators.biomes(await biomeDefList);
  await saveMcdata("biomes", biomes);
  console.log(" - Saved biomes.json");

  const recipes = await generators.recipes(await craftingData);
  await saveMcdata("recipes", recipes);
  console.log(" - Saved recipes.json");

  const blockStates = await generators.blockStates(cwd);
  await saveMcdata("blockStates", blockStates);
  console.log(" - Saved blockStates.json");

  const version = await generators.version(client.options.version);
  await saveMcdata("version", version);
  console.log(" - Saved version.json");

  await finish();

  console.log("\nDone!");
  process.exit(0);
}

main();
