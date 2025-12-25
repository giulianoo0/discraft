import { WebSocketServer, WebSocket } from "ws";
import { updateServerState, updatePlayerCount } from "./database";

interface ModMessage {
    type: "status" | "player" | "chat";
    online?: boolean;
    playerCount?: number;
    count?: number;
    player?: string;
    message?: string;
}

let wss: WebSocketServer | null = null;
let onStatusUpdate: (() => void) | null = null;
let onChatMessage: ((player: string, message: string) => void) | null = null;

export function setStatusUpdateCallback(callback: () => void): void {
    onStatusUpdate = callback;
}

export function setOnChatMessage(
    callback: (player: string, message: string) => void
): void {
    onChatMessage = callback;
}

export function startWebSocketServer(port: number): WebSocketServer {
    wss = new WebSocketServer({ port });

    console.log(`[WebSocket] Server started on port ${port}`);

    wss.on("connection", (ws: WebSocket) => {
        console.log("[WebSocket] Minecraft mod connected");

        updateServerState(true);
        onStatusUpdate?.();

        ws.on("message", (data: Buffer) => {
            try {
                const message: ModMessage = JSON.parse(data.toString());
                handleModMessage(message);
            } catch { }
        });

        ws.on("close", () => {
            console.log("[WebSocket] Minecraft mod disconnected");
            updateServerState(false, 0);
            onStatusUpdate?.();
        });

        ws.on("error", () => { });
    });

    wss.on("error", () => { });

    return wss;
}

function handleModMessage(message: ModMessage): void {
    switch (message.type) {
        case "status":
            if (message.online !== undefined) {
                updateServerState(message.online, message.playerCount);
                onStatusUpdate?.();
            }
            break;

        case "player":
            if (message.count !== undefined) {
                updatePlayerCount(message.count);
                onStatusUpdate?.();
            }
            break;

        case "chat":
            if (message.player && message.message) {
                onChatMessage?.(message.player, message.message);
            }
            break;
    }
}

export function getConnectedClients(): number {
    return wss?.clients.size ?? 0;
}

export function sendToMinecraft(type: string, data: object): void {
    if (!wss) return;

    const message = JSON.stringify({ type, ...data });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

export function closeWebSocketServer(): void {
    wss?.close();
    wss = null;
}
