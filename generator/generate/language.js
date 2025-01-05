const path = require("path");
const fs = require("fs");

module.exports = async (cwd) => {
    const langFilePath = path.join(cwd, "bedrock-samples/resource_pack/texts/en_US.lang");
    const langText = await fs.promises.readFile(langFilePath, "utf-8");
    const langArr = langText
        .split("\n")
        .filter((x) => !x.startsWith("#") && x.trim().length > 0) // Remove empty and comment lines
        .map((x) => x.trim().replace(/#.*$/g, "").trim()) // Remove comments
        .map((x) => x.split("=")); // Key + value

    return Object.fromEntries(langArr);
};
