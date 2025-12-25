import { EmbedBuilder, Colors } from "discord.js";
import { getServerState } from "./database";
import { SERVER_IP } from "./config";

export function getPlayerAvatarUrl(playerName: string): string {
    return `https://minotar.net/avatar/${playerName}/64`;
}

export function createStatusEmbed(): EmbedBuilder {
    const state = getServerState();
    const ip = SERVER_IP || state.public_ip || "Desconhecido";

    return new EmbedBuilder()
        .setTitle("🎮 Status do Servidor Minecraft")
        .setColor(state.is_online ? Colors.Green : Colors.Red)
        .addFields(
            { name: "📡 Status", value: state.is_online ? "🟢 Online" : "🔴 Offline", inline: true },
            { name: "👥 Jogadores", value: state.is_online ? `${state.player_count}` : "-", inline: true },
            { name: "🌐 IP", value: `\`${ip}\``, inline: true }
        )
        .setFooter({ text: "Última atualização" })
        .setTimestamp();
}

export function createShutdownEmbed(): EmbedBuilder {
    const ip = SERVER_IP || "Desconhecido";

    return new EmbedBuilder()
        .setTitle("🎮 Status do Servidor Minecraft")
        .setColor(Colors.Orange)
        .addFields(
            { name: "📡 Status", value: "🟠 Bot Desligado", inline: true },
            { name: "👥 Jogadores", value: "-", inline: true },
            { name: "🌐 IP", value: `\`${ip}\``, inline: true }
        )
        .setFooter({ text: "Bot desligado em" })
        .setTimestamp();
}

export function createChatEmbed(playerName: string, message: string, isDiscord = false, avatarUrl?: string): EmbedBuilder {
    return new EmbedBuilder()
        .setAuthor({
            name: playerName,
            iconURL: avatarUrl || getPlayerAvatarUrl(playerName),
        })
        .setDescription(message)
        .setColor(isDiscord ? Colors.Blue : Colors.Green)
        .setTimestamp();
}
