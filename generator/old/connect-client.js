const { createClient } = require("bedrock-protocol");
const { randomUUID } = require("crypto");

let client = null;

const itemMap = new Map();

const connectClient = (port) =>
  new Promise((resolve) => {
    client = createClient({ host: "127.0.0.1", port, username: "bedrock-data-generator", offline: true });
    client.once("start_game", (pak) => {
      for (const item of pak.itemstates) itemMap.set(item.name, { id: item.runtime_id, displayName: "" });
    });

    let lastItem = "";
    client.on("text", (packet) => {
      if (packet.type !== "json") return;

      const { rawtext: [msg] } = JSON.parse(packet.message);
      
      if (typeof msg.text !== "undefined") {
        if (msg.text === "DONE") return resolve(itemMap);
        lastItem = msg.text;
      } else {
        const itm = itemMap.get(lastItem);
        if (!itm) console.log("!!! ITEM DONT EXIST", lastItem);

        const displayName = msg.with.rawtext[0].text;

        itemMap.set(lastItem, { ...itm, displayName });
      }
    });
  });

const runCommands = (cmds, timeout = 10_000) =>
  new Promise((resolve) => {
    if (!client) throw new Error("Client is not connected yet!");

    const requestIDs = cmds.map((cmd) => ({ command: cmd, id: randomUUID() }));

    const outputs = [];

    const time = setTimeout(() => {
      client.off("command_output", outputListener);
      resolve(outputs);
    }, timeout);

    const outputListener = (packet) => {
      const cmd = requestIDs.find((x) => x.id === packet.origin.uuid);
      if (!cmd) return;

      outputs.push({ ...cmd, output: packet.output });
      if (outputs.length < requestIDs.length) return;

      client.off("command_output", outputListener);
      clearTimeout(time);
      resolve(outputs);
    };

    client.on("command_output", outputListener);

    for (const { command, id } of requestIDs)
      client.queue("command_request", {
        command,
        origin: { type: "player", uuid: id, request_id: id },
        version: 0,
        internal: false,
      });
  });

function queuePacket(name, params) {
  client.queue(name, params);
}

module.exports = {
  connectClient,
  runCommands,
  queuePacket,
};
