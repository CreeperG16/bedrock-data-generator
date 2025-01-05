import { BlockTypes, ItemStack, ItemTypes, system, world } from "@minecraft/server";
import * as GameTest from "@minecraft/server-gametest";

//GameTest.register("data-generator", "generate-block-data", async (test) => {
//    const player = test.spawnSimulatedPlayer({ x: 2, y: 2, z: 1 }, "hello");
//    player.addEffect("haste", 200_000, { amplifier: 255, showParticles: false });

//    const blockLoc = { x: 2, y: 2, z: 2 }

//    for (const block of BlockTypes.getAll()) {
//        try {
//            test.setBlockType(block, blockLoc);
//        } catch (err) {
//            world.sendMessage("Block " + block.id + " could not be placed?");
//            console.error(err);
//            continue;
//        }
//        player.breakBlock(blockLoc);

//        await new Promise(r => system.runTimeout(r, 2));

//        const broken = test.getBlock(blockLoc).isAir || test.getBlock(blockLoc).isLiquid;
//        if (!broken) world.sendMessage("Not broken " + block.id);
//    }
//})
//    .maxTicks(200_000)
//    .structureName("generator:bedrock-data-generator");

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

    if (ev.message === "GIVE_BLOCKS") {
        console.log("Giving " + ev.sendMessage + " all blocks...");
    }
});
