import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { io, Socket } from "socket.io-client";
import {
  ServerToClientEvents,
  ClientToServerEvents,
} from "./tic-tac-toe.event";
import {
  GameSyncStateType,
  RoomSyncStateType,
  UserSyncStateType,
} from "./type";

export class TicTacToeMCPService {
  private _socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  private _mcp: McpServer;
  private _userState?: UserSyncStateType;
  private _roomState?: RoomSyncStateType;
  private _gameState?: GameSyncStateType;

  constructor(socketDomain: string) {
    this._socket = io(socketDomain);
    this._mcp = new McpServer({
      name: "TicTacToe",
      version: "1.0.0",
    });
    this.initSocket();
    this.initMCP();
  }

  private initSocket() {
    this._socket.on("connect", () => {
      console.log("Connected to server");
    });
    this._socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });
    this._socket.on("syncGameState", (data) => {
      this._gameState = data;
    });
    this._socket.on("syncRoomState", (data) => {
      this._roomState = data;
    });
    this._socket.on("syncUserState", (data) => {
      this._userState = data;
    });
  }

  private initMCP() {
    this._mcp.resource(
      "gameState",
      new ResourceTemplate("gameState///", { list: undefined }),
      async (uri, {}) => {
        return {
          contents: [
            {
              uri: uri.href,
              text: this._gameState
                ? JSON.stringify(this._gameState)
                : "暂无游戏状态",
            },
          ],
        };
      }
    );

    this._mcp.resource(
      "roomState",
      new ResourceTemplate("roomState///", { list: undefined }),
      async (uri, {}) => {
        return {
          contents: [
            {
              uri: uri.href,
              text: this._roomState
                ? JSON.stringify(this._roomState)
                : "暂无房间状态",
            },
          ],
        };
      }
    );

    this._mcp.resource(
      "userState",
      new ResourceTemplate("userState///", { list: undefined }),
      async (uri, {}) => {
        return {
          contents: [
            {
              uri: uri.href,
              text: this._userState
                ? JSON.stringify(this._userState)
                : "暂无用户状态",
            },
          ],
        };
      }
    );

    this._mcp.tool("createRoom", { roomId: z.string() }, async ({ roomId }) => {
      this._socket.emit("createRoom", { roomId });
      return {
        content: [{ type: "text", text: "Room created" }],
      };
    });

    this._mcp.tool("joinRoom", { roomId: z.string() }, async ({ roomId }) => {
      this._socket.emit("joinRoom", { roomId });
      return {
        content: [{ type: "text", text: "Room joined" }],
      };
    });

    this._mcp.tool("readyRoom", {}, async () => {
      this._socket.emit("readyRoom");
      return {
        content: [{ type: "text", text: "Room ready" }],
      };
    });

    this._mcp.tool("readyGame", {}, async () => {
      this._socket.emit("readyGame");
      return {
        content: [{ type: "text", text: "Game ready" }],
      };
    });

    this._mcp.tool(
      "act",
      { row: z.number(), col: z.number() },
      async ({ row, col }) => {
        this._socket.emit("act", { row, col });
        return {
          content: [{ type: "text", text: "Action performed" }],
        };
      }
    );

    this._mcp.tool("think", { message: z.string() }, async ({ message }) => {
      this._socket.emit("think", { message });
      return {
        content: [{ type: "text", text: "Thinking" }],
      };
    });
  }

  public async start() {
    const transport = new StdioServerTransport();
    await this._mcp.connect(transport);
  }
}
