import { Client, GatewayIntentBits, TextChannel, REST, Routes, ChatInputCommandInteraction } from "discord.js";
import { DISCORD_TOKEN, CHANNEL_ID, CHAT_CHANNEL_ID, GUILD_ID, SERVER_IP, WS_PORT, validateConfig } from "./config";
import { commands } from "./commands";
import { createStatusEmbed, createShutdownEmbed, createChatEmbed } from "./embeds";
import { getStatusMessage, saveStatusMessage, getServerState, updatePublicIp } from "./database";
import { startWebSocketServer, setStatusUpdateCallback, setOnChatMessage, sendToMinecraft, closeWebSocketServer } from "./websocket";

validateConfig();

export const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

async function fetchPublicIp(): Promise<string | null> {
    try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = (await response.json()) as { ip: string };
        return data.ip;
    } catch {
        return null;
    }
}

async function sendChatToDiscord(playerName: string, message: string): Promise<void> {
    const chatChannelId = CHAT_CHANNEL_ID || CHANNEL_ID;
    if (!chatChannelId) return;

    try {
        const channel = (await client.channels.fetch(chatChannelId)) as TextChannel;
        if (!channel) return;

        await channel.send({ embeds: [createChatEmbed(playerName, message)] });
    } catch { }
}

async function updateStatusMessage(): Promise<void> {
    try {
        const channel = (await client.channels.fetch(CHANNEL_ID!)) as TextChannel;
        if (!channel) return;

        const embed = createStatusEmbed();
        const savedMessage = getStatusMessage();

        if (savedMessage) {
            try {
                const message = await channel.messages.fetch(savedMessage.message_id);
                if (message) {
                    await message.edit({ embeds: [embed] });
                    return;
                }
            } catch { }
        }

        const message = await channel.send({ embeds: [embed] });
        saveStatusMessage(message.id, CHANNEL_ID!);
    } catch { }
}

export async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const state = getServerState();
    const ip = SERVER_IP || state.public_ip || "Desconhecido";

    switch (interaction.commandName) {
        case "jogadores": {
            if (!state.is_online) {
                await interaction.reply({ content: "🔴 O servidor está offline no momento.", flags: ["Ephemeral"] });
                return;
            }
            await interaction.reply({ content: `👥 **Jogadores online:** ${state.player_count}`, flags: ["Ephemeral"] });
            break;
        }

        case "ip": {
            await interaction.reply({ content: `🌐 **IP do servidor:** \`${ip}\``, flags: ["Ephemeral"] });
            break;
        }

        case "status": {
            await interaction.reply({ embeds: [createStatusEmbed()], flags: ["Ephemeral"] });
            break;
        }

        case "minechat": {
            if (!state.is_online) {
                await interaction.reply({ content: "🔴 O servidor está offline no momento.", flags: ["Ephemeral"] });
                return;
            }

            const message = interaction.options.getString("mensagem", true);
            const discordUser = interaction.user.displayName || interaction.user.username;
            const avatarUrl = interaction.user.displayAvatarURL({ size: 64 });

            sendToMinecraft("chat", { sender: discordUser, message });

            await interaction.reply({ content: `✅ Mensagem enviada para o servidor: "${message}"`, flags: ["Ephemeral"] });

            const chatChannelId = CHAT_CHANNEL_ID || CHANNEL_ID;
            if (chatChannelId) {
                try {
                    const channel = (await client.channels.fetch(chatChannelId)) as TextChannel;
                    if (channel) {
                        await channel.send({ embeds: [createChatEmbed(discordUser, message, true, avatarUrl)] });
                    }
                } catch { }
            }
            break;
        }
    }
}

async function registerCommands(): Promise<void> {
    const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN!);

    try {
        if (GUILD_ID) {
            await rest.put(
                Routes.applicationGuildCommands(client.user!.id, GUILD_ID),
                { body: commands.map((cmd) => cmd.toJSON()) }
            );
            console.log("[Discord] Slash commands registered to guild");
        } else {
            await rest.put(Routes.applicationCommands(client.user!.id), {
                body: commands.map((cmd) => cmd.toJSON()),
            });
            console.log("[Discord] Global slash commands registered");
        }
    } catch { }
}

export async function gracefulShutdown(): Promise<void> {
    console.log("\n[Bot] Shutting down...");

    try {
        const channel = (await client.channels.fetch(CHANNEL_ID!)) as TextChannel;
        if (channel) {
            const savedMessage = getStatusMessage();
            if (savedMessage) {
                try {
                    const message = await channel.messages.fetch(savedMessage.message_id);
                    if (message) {
                        await message.edit({ embeds: [createShutdownEmbed()] });
                    }
                } catch { }
            }
        }
    } catch { }

    closeWebSocketServer();
    client.destroy();
    process.exit(0);
}

export async function initializeBot(): Promise<void> {
    console.log(`[Discord] Logged in as ${client.user?.tag}`);

    await registerCommands();

    if (!SERVER_IP) {
        const ip = await fetchPublicIp();
        if (ip) {
            updatePublicIp(ip);
            console.log(`[Discord] Public IP: ${ip}`);
        }
    }

    setStatusUpdateCallback(() => updateStatusMessage());
    setOnChatMessage((player, message) => sendChatToDiscord(player, message));

    startWebSocketServer(WS_PORT);
    await updateStatusMessage();
}
