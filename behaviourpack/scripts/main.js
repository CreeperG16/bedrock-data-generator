import { ItemStack, ItemTypes, world } from "@minecraft/server";

world.afterEvents.chatSend.subscribe((ev) => {
    if (ev.message === "GIVE_ITEMS") {
        console.log("Giving " + ev.sender.name + " all items...");

        for (const item of ItemTypes.getAll()) {
            const stack = new ItemStack(item);

            const hasDura = stack.hasComponent("durability");
            const maxDura = hasDura ? stack.getComponent("durability").maxDurability.toString() : "null";

            ev.sender.sendMessage("ITEM_ID=" + item.id);
            ev.sender.sendMessage("ITEM_MAXSIZE=" + stack.maxAmount.toString());
            ev.sender.sendMessage("ITEM_DURA=" + maxDura);
            ev.sender.runCommand("give @s " + item.id);
        }

        ev.sender.sendMessage("ITEMS_DONE");
        console.log("Gave " + ev.sender.name + " all items.");
    }
});
