export const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
export const CHANNEL_ID = process.env.CHANNEL_ID;
export const CHAT_CHANNEL_ID = process.env.CHAT_CHANNEL_ID;
export const GUILD_ID = process.env.GUILD_ID;
export const WS_PORT = parseInt(process.env.WS_PORT || "8080", 10);
export const SERVER_IP = process.env.SERVER_IP;

export function validateConfig(): void {
    if (!DISCORD_TOKEN) {
        console.error("Missing DISCORD_TOKEN environment variable");
        process.exit(1);
    }
    if (!CHANNEL_ID) {
        console.error("Missing CHANNEL_ID environment variable");
        process.exit(1);
    }
}
