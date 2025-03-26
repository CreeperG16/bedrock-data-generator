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
    blocks: require("./generate/blocks"),
    version: require("./generate/version"),
};

const hasArg = (arg) => process.argv.includes("--" + arg);
const getArg = (arg) => process.argv.at(process.argv.indexOf("--" + arg) + 1);

const exec = (command, options = {}) => new Promise((resolve) => cp.exec(command, options, (...a) => resolve(a)));

const cwd = path.basename(path.resolve()) === "generator" ? path.resolve("..") : path.resolve();
const p = (...a) => path.join(cwd, ...a);

console.log("Running generator in directory '%s'...", cwd);

if (!hasArg("version")) throw new Error("Please provide a version!");
const mcversion = getArg("version").split(".").slice(0, 3).join("."); // Don't use the build number for now, let the downloaders find that automatically
if (mcversion.split(".").length < 3) throw new Error("Version must have three parts. e.g: '1.21.0'");

/** Helper function to save data to a file.
 * @param {string} file
 * @param {any} data
 **/
async function saveMcdata(file, data) {
    await fs.promises.writeFile(p("mcdata-output", file + ".json"), JSON.stringify(data, null, 2));
}

/** Download the needed resources (bedrock-samples repo, BDS) */
async function download() {
    console.log("Cloning samples repo...");
    await exec(`git clone ${BEDROCK_SAMPLES_URL} ${p("bedrock-samples")}`);

    // This attempts to checkout the version specified
    // Not all minor versions are added as tags, so will attempt to find one which matches
    // For example, 1.20.81 doesn't exist on the repo, so it will match 1.20.80
    let [, tag] = await exec(`git tag -l "v${mcversion}.*"`, { cwd: p("bedrock-samples") });
    if (tag.trim().length === 0) {
        const [, major, minor] = mcversion.split(".");
        [, tag] = await exec(`git tag -l "v1.${major}.${minor.substring(0, minor.length - 1)}[0-9].[0-9]"`, {
            cwd: p("bedrock-samples"),
        });
    }

    tag = tag.split("\n").find((t) => !t.includes("preview")) ?? "";

    // Terminate for now if we don't find the version tag, as we don't want to generate incorrect data
    if (tag.trim().length === 0) {
        throw new Error("Could not find tag for version '" + mcversion + "'.");
    }

    // Checkout the found tag
    await exec(`git checkout tags/${tag.trim()}`, { cwd: p("bedrock-samples") });
    console.log("Checked out tag '%s'.", tag.trim());

    console.log("Downloading bedrock server...");
    const isDownloaded = fs.existsSync(p("server"));
    if (isDownloaded) {
        // Redownload the server if the saved server's version is different
        const downloadedVersion = await fs.promises.readFile(p("server/version.txt"), "utf-8");
        if (downloadedVersion === mcversion) return;

        console.log("Removing old server...");
        await fs.promises.rm(p("server"), { recursive: true, force: true });
    }
    await bedrockServer.downloadServer(mcversion, { path: p("server"), ...SERVER_PROPERTIES });
    await fs.promises.writeFile(p("server/version.txt"), mcversion); // Save the version for future runs of the script
}

async function start() {
    console.log("Preparing server...");

    // Copy the world into the server. This copy will also be modified later.
    await fs.promises.cp(p("world"), p("server/worlds/bedrock-data-generator"), { recursive: true });

    const server = await bedrockServer.prepare(mcversion, { path: p("server"), ...SERVER_PROPERTIES });

    // Set permissions. BDS by default disables the @minecraft/server-net permission.
    // This script doesn't currently use the scripting API's HTTP capabilities, but might in the future
    // for more efficient and reliable data transfer.
    await fs.promises.writeFile(p("server/config/default/permissions.json"), JSON.stringify(SERVER_PERMISSIONS), {
        recursive: true,
    });

    // Get information about the behaviour pack from the manifest (name, UUID)
    // The name is used to move the pack into its own folder in BDS's behavior_packs folder
    // The UUID is needed to set the pack as enabled in the BDS's world_behavior_packs.json file
    // Additionally modify the manifest to use the correct beta version of the @minecraft/server module
    const bpManifest = await fs.promises
        .readFile(p("behaviourpack/manifest.json"), "utf-8")
        .then((file) => JSON.parse(file));

    await fs.promises.cp(p("behaviourpack"), p("server/behavior_packs", bpManifest.header.name), { recursive: true });
    await server.enableBehaviorPack(bpManifest.header.uuid, bpManifest.header.version.join("."));

    // Set gametest version to latest beta
    // Find the specific version by the name of the module in bedrock-samples
    // the API definition JSON files in script_modules are named according to version,
    // so this way we can find the current latest beta version
    const scriptVersions = await fs.promises
        .readdir(p("bedrock-samples/metadata/script_modules/@minecraft"))
        .then((files) => files.filter((f) => f.startsWith("server_")));

    const scriptVersion = scriptVersions
        .find((file) => file.endsWith("-beta.json"))
        .replace("server_", "")
        .replace(".json", "");
    bpManifest.dependencies.find((d) => d.module_name === "@minecraft/server").version = scriptVersion;

    // Set the min_engine_version to the current version
    const minEngineVersion = mcversion.split(".").map(Number);
    bpManifest.header.min_engine_version = minEngineVersion;

    // Write the updated manifest to the server's behaviour pack directory
    await fs.promises.writeFile(
        p("server/behavior_packs/", bpManifest.header.name, "manifest.json"),
        JSON.stringify(bpManifest, null, 2)
    );

    // This enables the "Beta APIs" experiment and exposes useful classes in the scripting API
    // most *Types classes are behind this toggle, which are useful as they have the .getAll() method which returns all
    // of the specified object (items, blocks, entities, etc.)
    await server.toggleExperiments({ gametest: true });

    // Start the server and disable stdout to keep the script output clean.
    // When debugging an issue, try to reenable stdout by commenting the unpipe() call
    const handle = await server.startAndWaitReady();
    handle.stdout.unpipe(process.stdout);

    // Sleep a second so the server has time to start and allow the client to join
    await new Promise((r) => setTimeout(r, 1000));

    // Connect a bedrock-protocol client to the started vanilla server
    // We can then look at vanilla data sent in packets, such as biome definitions, items and crafting recipes
    // This script also uses the client to get the display names of items, as their translation IDs are extremely inconsistent
    console.log("Connecting client...");

    const pong = await bedrockProto.ping({ host: "127.0.0.1", port: SERVER_PROPERTIES["server-port"] });
    console.log("Connecting to dedicated server with protocol version %s.", pong.protocol);

    // Make sure the client connects to the server with the same protocol version
    const clientVer = mcdata.versions.bedrock.find((x) => x.version == pong.protocol)?.minecraftVersion;
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

// Helper function to create promises for specific packets/events
// Either to halt the code until an event happens with await, or to
// keep an event's data for later without await
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
    const data = mcdata("bedrock_" + mcversion);
    const { server, client, finish } = await start();

    // These packets are sent during the login process, but we need their data
    // later on, so we create promises which we can then await the resolved data of later
    const startGame = waitClientEvent("start_game", client);
    const itemRegistry = waitClientEvent("item_registry", client);
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

    const items = await generators.items(
        client,
        (data.supportFeature("itemRegistryPacket") ? await itemRegistry : await startGame).itemstates
    );
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

    // This is still a WIP
    // const blockStates = await generators.blockStates(cwd);
    // await saveMcdata("blockStates", blockStates);
    // console.log(" - Saved blockStates.json");

    const blocks = await generators.blocks(cwd, language, items);
    await saveMcdata("blocks", blocks);
    console.log(" - Saved blocks.json");

    const version = await generators.version(client.options.version);
    await saveMcdata("version", version);
    console.log(" - Saved version.json");

    await finish();

    console.log("\nDone!");
    process.exit(0);
}

main();
