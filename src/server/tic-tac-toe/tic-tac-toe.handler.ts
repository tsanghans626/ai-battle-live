import { createLogger } from "../logger";
import { SocketError, SocketPanic } from "../socket-exceptions";
import { PlayerType, TicTocToeSocketType } from "./type";
import { GameManager } from "./game-manager.proxy";
import { v4 as uuidv4 } from "uuid";

const gameManager = new GameManager();
const logger = createLogger("tic-tac-toe");

function computeOptionalUserId(
  socket: TicTocToeSocketType
): string | undefined {
  const { userId } = socket.data;
  return userId;
}

function computeUserId(socket: TicTocToeSocketType): string {
  const userId = computeOptionalUserId(socket);
  if (!userId) {
    throw new SocketError("请先登录");
  }
  return userId;
}

function setOnline(socket: TicTocToeSocketType, data: PlayerType): void {
  const { userId, nickName } = data;
  const player = { userId, nickName };
  socket.data.userId = userId;
  gameManager.online(player);
  socket.join(`user:${userId}`);
}

function setOffline(socket: TicTocToeSocketType): void {
  const userId = computeUserId(socket);
  gameManager.offline(userId);
  socket.leave(`user:${userId}`);
  socket.data.userId = undefined;
}

function joinRoom(socket: TicTocToeSocketType, userId: string, roomId: string) {
  gameManager.joinRoom(roomId, userId);
  socket.join(`room:${roomId}`);
  logger.info(`Player ${userId} joined room: ${roomId}`);
}

function leaveRoom(socket: TicTocToeSocketType, userId: string): string {
  const roomId = gameManager.leaveRoom(userId);
  socket.leave(roomId);
  logger.info(`Player ${userId} left room: ${roomId}`);
  return roomId;
}

function batchSyncUserStateInGame(socket: TicTocToeSocketType, userId: string) {
  const usersSyncState = gameManager.getBatchUsersSyncStateInGame(userId);
  for (const userSyncState of usersSyncState) {
    if (userSyncState.user.userId === userId) {
      socket.emit("syncUserState", userSyncState);
    } else {
      socket
        .to(`user:${userSyncState.user.userId}`)
        .emit("syncUserState", userSyncState);
    }
  }
}

function syncUserState(socket: TicTocToeSocketType, userId: string) {
  socket.emit("syncUserState", gameManager.getUserSyncState(userId));
}

function syncRoomState(socket: TicTocToeSocketType, roomId: string) {
  const data = gameManager.getRoomSyncState(roomId);
  socket.to(`room:${roomId}`).emit("syncRoomState", data);
}

function syncRoomStateByUserId(socket: TicTocToeSocketType, userId: string) {
  const data = gameManager.getRoomSyncStateByUserId(userId);
  socket.emit("syncRoomState", data);
  socket.to(`room:${data.id}`).emit("syncRoomState", data);
}

function syncGameStateByUserId(socket: TicTocToeSocketType, userId: string) {
  const data = gameManager.getGameSyncStateByUserId(userId);
  socket.emit("syncGameState", data);
  socket.to(`game:${data.id}`).emit("syncGameState", data);
}

export const ticTacToeHandler: (socket: TicTocToeSocketType) => void = (
  socket
) => {
  logger.info(`New client ${socket.id} connected`);

  // 登录
  socket.on("login", (data: { userId: string; nickName: string }) => {
    const { userId, nickName } = data;
    setOnline(socket, { userId, nickName });
    syncUserState(socket, userId);
  });

  // 登出
  socket.on("logout", () => setOffline(socket));

  // 创建房间
  socket.on("createRoom", (data: { roomId?: string }) => {
    let { roomId } = data;
    if (!roomId) {
      roomId = uuidv4();
    }
    const userId = computeUserId(socket);
    gameManager.createRoom(userId, roomId);
    joinRoom(socket, userId, roomId);
    syncUserState(socket, userId);
    syncRoomStateByUserId(socket, userId);
  });

  // 加入房间
  socket.on("joinRoom", (data: { roomId: string }) => {
    const userId = computeUserId(socket);
    const { roomId } = data;
    if (roomId) {
      joinRoom(socket, userId, roomId);
      syncUserState(socket, userId);
      syncRoomStateByUserId(socket, userId);
    }
  });

  // 离开房间
  socket.on("leaveRoom", () => {
    const userId = computeUserId(socket);
    const roomId = leaveRoom(socket, userId);
    syncUserState(socket, userId);
    syncRoomState(socket, roomId);
  });

  // 断开连接
  socket.on("disconnect", () => {
    const userId = computeOptionalUserId(socket);
    if (userId) {
      const roomId = leaveRoom(socket, userId);
      syncUserState(socket, userId);
      syncRoomState(socket, roomId);
    }
    logger.info(`Client ${socket.id} disconnected`);
  });

  // 房间内准备
  socket.on("readyRoom", () => {
    const userId = computeUserId(socket);
    gameManager.setPlayerRoomReady(userId);
    if (gameManager.enableCreateGame(userId)) {
      const [roomId, gameId] = gameManager.createGame(userId);
      socket.in(`room:${roomId}`).socketsJoin(`game:${gameId}`);
      syncGameStateByUserId(socket, userId);
      batchSyncUserStateInGame(socket, userId);
    }
    syncRoomStateByUserId(socket, userId);
  });

  // 游戏内准备
  socket.on("readyGame", () => {
    const userId = computeUserId(socket);
    gameManager.setPlayerGameReady(userId);
    if (gameManager.enableStartGame(userId)) {
      const gameId = gameManager.startGame(userId);
      logger.info(`Game start: ${gameId}`);
    }
    syncGameStateByUserId(socket, userId);
  });

  // 行动
  socket.on("act", (data: { row: number; col: number }) => {
    const userId = computeUserId(socket);
    const { row, col } = data;
    const gameId = gameManager.actPiece(userId, { row, col });
    if (gameManager.enableEndGame(userId)) {
      gameManager.endGame(userId);
      socket.in(`game:${gameId}`).socketsLeave(`game:${gameId}`);
    }
    logger.info(`Player ${userId} acted in game: ${gameId}`);
    syncGameStateByUserId(socket, userId);
  });

  // 思考
  socket.on("think", () => {
    // socket.emit("noArg");
  });
};
