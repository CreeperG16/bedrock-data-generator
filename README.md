# bedrock-data-generator

A script which generates json files for [minecraft-data][1]. This retrieves data from a combination of sources:
  - The official [samples repository][2]
  - Packets sent by the vanilla dedicated server
  - Information exposed by the vanilla scripting API 

This script is a work in progress.

## Usage
Specify the version while running the script. For example:
```bash
node generator/index.js --version 1.21.0
```
The output files will be in the `mcdata-output` folder.
This script currently generates:
  - biomes.json
  - blockStates.json
  - entities.json
  - foods.json
  - items.json
  - language.json
  - particles.json
  - recipes.json
  - sounds.json
  - versions.json (however this is already generated by the incrementVersion script in the minecraft-data repo)

[1]: https://github.com/PrismarineJS/minecraft-data
[2]: https://github.com/Mojang/bedrock-samples
