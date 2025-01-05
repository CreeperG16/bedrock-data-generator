const BEDROCK_SAMPLES_URL = "https://github.com/Mojang/bedrock-samples";

/** @type {import("minecraft-bedrock-server").ServerOptions} */
const SERVER_PROPERTIES = {
    "allow-cheats": true,
    "default-player-permission-level": "operator",
    "level-name": "bedrock-data-generator",
    gamemode: "creative",
    "online-mode": false,
    "server-port": 25565,
};

const SERVER_PERMISSIONS = {
    allowed_modules: [
        "@minecraft/server-gametest",
        "@minecraft/server",
        "@minecraft/server-ui",
        "@minecraft/server-admin",
        "@minecraft/server-editor",
        "@minecraft/server-net",
    ],
};

module.exports = {
    BEDROCK_SAMPLES_URL,
    SERVER_PROPERTIES,
    SERVER_PERMISSIONS,
};
