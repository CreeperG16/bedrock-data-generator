const mcdata = require("minecraft-data");

module.exports = async (version) => {
    const proto = mcdata("bedrock_" + version).version.version;

    return {
        version: proto,
        minecraftVersion: version,
        majorVersion: version.split(".").slice(0, 2).join("."),
        releaseType: "release",
    };
};
