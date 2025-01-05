/**
 *  Items schema:
 *      id!: number
 *      displayName!: string
 *      stackSize!: number
 *      name!: string
 *      enchantCategories: string[] // describes categories of enchants this item can use
 *      repairWith: string[] // describes what items this item can be fixed with in an anvil
 *      maxDurability: number // the amount of durability an item has before being damaged/used
 *      variations: {
 *          metadata!: number
 *          displayName!: string
 *      }[]
 */

module.exports = (client, itemstates) =>
    new Promise((resolve) => {
        const itemMap = new Map();
        for (const item of itemstates)
            itemMap.set(item.name, { id: item.runtime_id, name: item.name.replace("minecraft:", "") });

        const update = (key, obj) => itemMap.set(key, { ...itemMap.get(key), ...obj });

        let lastItem = "";
        const textListener = (packet) => {
            if (packet.type !== "json") return;

            const { rawtext } = JSON.parse(packet.message);

            if (typeof rawtext[0].text !== "undefined") {
                if (rawtext[0].text === "ITEMS_DONE") {
                    client.off("text", textListener);

                    // The filter is for items which show up in startgame, but
                    // not in the scripting API. These are mostly old names/IDs
                    // for generic items such as "wool" "log2" "shulker_box"
                    // whose variations have since been flattened into their own items.
                    // These also include education edition items which should get
                    // filtered out too.
                    resolve(
                        [...itemMap.values()]
                            .filter((item) => typeof item.stackSize !== "undefined")
                            .sort((a, b) => a.id - b.id)
                    );
                }

                const [key, val] = rawtext[0].text.split("=");

                if (key === "ITEM_ID") lastItem = val;
                if (key === "ITEM_MAXSIZE") update(lastItem, { stackSize: parseInt(val) });
                if (key === "ITEM_DURA" && val !== "null") update(lastItem, { maxDurability: parseInt(val) });
            } else {
                // Use the output of the /give command to get the display name
                // This is easier than trying to use the item's ID to find its translation key
                // as a LOT of items use nonstandard translation keys
                const displayName = rawtext[0].with.rawtext[0].text;
                update(lastItem, { displayName });
            }
        };

        client.on("text", textListener);
        client.queue("text", {
            type: "chat",
            needs_translation: false,
            source_name: "bedrock-data-generator",
            message: "GIVE_ITEMS",
            xuid: "",
            platform_chat_id: "",
            filtered_message: "",
        });
    });
