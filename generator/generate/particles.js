const path = require("path");
const fs = require("fs");

module.exports = async (cwd) => {
    const particlesFolderPath = path.join(cwd, "bedrock-samples/resource_pack/particles");
    const particleFiles = await fs.promises.readdir(particlesFolderPath);

    const particles = [];
    for (const [index, particleFile] of Object.entries(particleFiles)) {
        const definitionStr = await fs.promises.readFile(path.join(particlesFolderPath, particleFile), "utf-8");

        const lines = definitionStr.split("\n");
        const commentlessLines = lines.map((x) =>
            x
                .trim()
                .replace(/\/\/.*$/g, "")
                .trim()
        );
        const particleDefinition = JSON.parse(commentlessLines.join("\n"));

        const name = particleDefinition.particle_effect.description.identifier.replace("minecraft:", "");

        particles.push({ id: parseInt(index), name });
    }

    return particles;
};
