import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { io } from "socket.io-client";
import {
  GameSyncStateType,
  RoomSyncStateType,
  TicTocToeSocketType,
  UserSyncStateType,
} from "./type";

export class TicTacToeMCPService {
  private _socket: TicTocToeSocketType;
  private _mcp: McpServer;
  private _loginUserId?: string;
  private _userStateMap: Map<string, UserSyncStateType>;
  private _roomStateMap: Map<string, RoomSyncStateType>;
  private _gameStateMap: Map<string, GameSyncStateType>;

  constructor(socketDomain: string) {
    this._socket = io(socketDomain);
    this._mcp = new McpServer({
      name: "TicTacToe",
      version: "1.0.0",
    });
    this._userStateMap = new Map();
    this._roomStateMap = new Map();
    this._gameStateMap = new Map();
    this.initSocket();
    this.initMCP();
  }

  private initSocket() {
    this._socket.on("connect", () => {
      // console.log("Connected to server");
    });
    this._socket.on("disconnect", () => {
      // console.log("Disconnected from server");
    });
    this._socket.on("syncGameState", (data) => {
      if (this._loginUserId) {
        this._gameStateMap.set(this._loginUserId, data);
      }
    });
    this._socket.on("syncRoomState", (data) => {
      if (this._loginUserId) {
        this._roomStateMap.set(this._loginUserId, data);
      }
    });
    this._socket.on("syncUserState", (data) => {
      if (this._loginUserId) {
        this._userStateMap.set(this._loginUserId, data);
      }
    });
  }

  private initMCP() {
    this._mcp.resource(
      "gameState",
      new ResourceTemplate("game-state://{userId}", { list: undefined }),
      async (uri, { userId }) => {
        const _userId = userId as string;
        if (_userId !== this._loginUserId) {
          return {
            contents: [{ uri: uri.href, text: "请先登录" }],
          };
        }
        const gameState = this._gameStateMap.get(_userId);
        return {
          contents: [
            {
              uri: uri.href,
              text: gameState ? JSON.stringify(gameState) : "暂无游戏状态",
            },
          ],
        };
      }
    );

    this._mcp.resource(
      "roomState",
      new ResourceTemplate("room-state://{userId}", { list: undefined }),
      async (uri, { userId }) => {
        const _userId = userId as string;
        if (_userId !== this._loginUserId) {
          return {
            contents: [{ uri: uri.href, text: "请先登录" }],
          };
        }
        const roomState = this._roomStateMap.get(_userId);
        return {
          contents: [
            {
              uri: uri.href,
              text: roomState ? JSON.stringify(roomState) : "暂无房间状态",
            },
          ],
        };
      }
    );

    this._mcp.resource(
      "userState",
      new ResourceTemplate("user-state://{userId}", { list: undefined }),
      async (uri, { userId }) => {
        const _userId = userId as string;
        console.log("userId", _userId);
        console.log("loginUserId", this._loginUserId);
        if (_userId !== this._loginUserId) {
          return {
            contents: [{ uri: uri.href, text: "请先登录" }],
          };
        }
        const userState = this._userStateMap.get(_userId);
        return {
          contents: [
            {
              uri: uri.href,
              text: userState ? JSON.stringify(userState) : "暂无用户状态",
            },
          ],
        };
      }
    );

    this._mcp.tool(
      "login",
      { userId: z.string(), nickName: z.string() },
      async ({ userId, nickName }) => {
        this._socket.emit("login", { userId, nickName });
        this._loginUserId = userId;
        return {
          content: [{ type: "text", text: "登录成功" }],
        };
      }
    );

    this._mcp.tool("logout", {}, async () => {
      this._socket.emit("logout");
      this._loginUserId = undefined;
      return {
        content: [{ type: "text", text: "登出成功" }],
      };
    });

    this._mcp.tool("createRoom", { roomId: z.string() }, async ({ roomId }) => {
      this._socket.emit("createRoom", { roomId });
      return {
        content: [
          {
            type: "text",
            text: "已发送创建房间请求，请查看userState，确认用户是否在房间中。如果在房间中，请定时查看roomState，确认房间状态。",
          },
        ],
      };
    });

    this._mcp.tool("joinRoom", { roomId: z.string() }, async ({ roomId }) => {
      this._socket.emit("joinRoom", { roomId });
      return {
        content: [
          {
            type: "text",
            text: "已发送加入房间请求，请查看userState，确认用户是否在房间中。如果在房间中，请定时查看roomState，确认房间状态。",
          },
        ],
      };
    });

    this._mcp.tool("leaveRoom", {}, async () => {
      this._socket.emit("leaveRoom");
      return {
        content: [
          {
            type: "text",
            text: "已发送离开房间请求，请查看userState，确认用户是否已退出房间。如果仍在房间中，请再次发送离开房间请求。",
          },
        ],
      };
    });

    this._mcp.tool("readyRoom", {}, async () => {
      this._socket.emit("readyRoom");
      return {
        content: [
          {
            type: "text",
            text: "已发送准备房间请求，请查看userState，确认用户是否已准备。如果未准备，请再次发送准备房间请求。定时获取gameState，确认游戏是否已创建，如果已创建，请发送准备游戏请求。",
          },
        ],
      };
    });

    this._mcp.tool("readyGame", {}, async () => {
      this._socket.emit("readyGame");
      return {
        content: [
          {
            type: "text",
            text: "已发送准备游戏请求，请查看userState，确认用户是否已准备。如果未准备，请再次发送准备游戏请求。",
          },
        ],
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
