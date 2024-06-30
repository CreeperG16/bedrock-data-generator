const fs = require("fs");

/** @returns {Promise<Record<string, string>>} */
module.exports = async (langFilePath) => {
  const langText = await fs.promises.readFile(langFilePath, "utf-8");
  const langArr = langText
    .split("\n")
    .filter((x) => !x.startsWith("#") && x.trim().length > 0) // Remove empty and comment lines
    .map((x) => x.trim().replace(/#.*$/g, "").trim()) // Remove comments
    .map((x) => x.split("=")); // Key + value

  return Object.fromEntries(langArr);
};
