import { DISCORD_TOKEN } from "./config";
import { client, handleCommand, initializeBot, gracefulShutdown } from "./discord";

client.once("clientReady", initializeBot);

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    await handleCommand(interaction);
});

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

console.log("[Discord] Connecting...");
client.login(DISCORD_TOKEN);
