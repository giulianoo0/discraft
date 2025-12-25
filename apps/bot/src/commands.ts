import { SlashCommandBuilder } from "discord.js";

export const commands = [
    new SlashCommandBuilder()
        .setName("jogadores")
        .setDescription("Mostra a quantidade de jogadores online"),
    new SlashCommandBuilder()
        .setName("ip")
        .setDescription("Mostra o IP do servidor"),
    new SlashCommandBuilder()
        .setName("status")
        .setDescription("Mostra o status completo do servidor"),
    new SlashCommandBuilder()
        .setName("minechat")
        .setDescription("Enviar mensagem para o servidor Minecraft")
        .addStringOption((option) =>
            option
                .setName("mensagem")
                .setDescription("A mensagem a ser enviada")
                .setRequired(true)
        ),
];
