import { v4 as uuidv4 } from "uuid";

import { SocketError } from "../socket-exceptions";
import { GameStatus } from "./status/game.status";
import { RoomStatus } from "./status/room.status";
import { UserStatus } from "./status/user.status";
import {
  GameSyncStateType,
  PlayerType,
  RoomSyncStateType,
  TicTacToeAction,
  UserSyncStateType,
} from "./type";
import { TicTacToeLogic } from "./tic-tac-toe.logic";

export class GameManager {
  private _gamesStatus: Map<string, GameStatus>;
  private _roomsStatus: Map<string, RoomStatus>;
  private _usersStatus: Map<string, UserStatus>;
  private _roomCurrentGameRel: Map<string, string>;
  private _userCurrentGameRel: Map<string, string>;
  private _userCurrentRoomRel: Map<string, string>;
  private _logic: TicTacToeLogic;

  constructor() {
    this._gamesStatus = new Map();
    this._roomsStatus = new Map();
    this._usersStatus = new Map();
    this._roomCurrentGameRel = new Map();
    this._userCurrentGameRel = new Map();
    this._userCurrentRoomRel = new Map();
    this._logic = new TicTacToeLogic();
  }

  private getUser(userId: string): UserStatus {
    const user = this._usersStatus.get(userId);
    if (!user) {
      throw new SocketError("用户未上线");
    }
    return user;
  }

  public getUserSyncState(userId: string): UserSyncStateType {
    return this.getUser(userId);
  }

  private getRoom(roomId: string): RoomStatus {
    const room = this._roomsStatus.get(roomId);
    if (!room) {
      throw new SocketError("房间不存在");
    }
    return room;
  }

  public getRoomSyncState(roomId: string): RoomSyncStateType {
    const room = this.getRoom(roomId);
    return {
      id: room.id,
      players: room.players.map((p) => {
        const userStatus = this.getUser(p.userId);
        return { ...userStatus.user, ...p };
      }),
    };
  }

  public getRoomSyncStateByUserId(userId: string): RoomSyncStateType {
    const roomId = this.getUserCurrentRoomId(userId);
    return this.getRoomSyncState(roomId);
  }

  private getGame(gameId: string): GameStatus {
    const game = this._gamesStatus.get(gameId);
    if (!game) {
      throw new SocketError("游戏不存在");
    }
    return game;
  }

  public getGameSyncStateByUserId(userId: string): GameSyncStateType {
    const gameId = this.getUserCurrentGameId(userId);
    const game = this.getGame(gameId);
    const currentPlayer = game.currentPlayer;
    const currentPlayerUserStatus = this.getUser(currentPlayer.userId);
    return {
      id: game.id,
      players: game.players.map((p) => {
        const userStatus = this.getUser(p.userId);
        return { ...userStatus.user, ...p };
      }),
      board: game.checkerboard,
      currentPlayer: {
        ...currentPlayerUserStatus.user,
        ...currentPlayer,
      },
      status: game.status,
      winner: this._logic.computeWinner(game),
    };
  }

  private getUserCurrentRoomId(userId: string): string {
    const roomId = this._userCurrentRoomRel.get(userId);
    if (!roomId) {
      throw new SocketError("用户未在房间中");
    }
    return roomId;
  }

  private getUserCurrentGameId(userId: string): string {
    const gameId = this._userCurrentGameRel.get(userId);
    if (!gameId) {
      throw new SocketError("用户未在游戏中");
    }
    return gameId;
  }

  private getRoomCurrentGameId(roomId: string): string {
    const gameId = this._roomCurrentGameRel.get(roomId);
    if (!gameId) {
      throw new SocketError("房间未在游戏中");
    }
    return gameId;
  }

  public online(player: PlayerType): void {
    this._usersStatus.set(player.userId, new UserStatus(player));
  }

  public offline(player: PlayerType): void {
    this._usersStatus.delete(player.userId);
  }

  public createRoom(userId: string, roomId?: string): RoomStatus {
    if (!roomId) {
      roomId = uuidv4();
    }

    const room = new RoomStatus(roomId, userId, this._logic.config.maxPlayers);
    this._roomsStatus.set(roomId, room);
    return room;
  }

  public joinRoom(roomId: string, userId: string): void {
    const room = this.getRoom(roomId);
    const userStatus = this.getUser(userId);
    this._logic.joinRoom(room, userStatus.user.userId);
    this._userCurrentRoomRel.set(userId, roomId);
    userStatus.status = "inRoom";
  }

  public leaveRoom(userId: string): string {
    const roomId = this.getUserCurrentRoomId(userId);
    const room = this.getRoom(roomId);
    const userStatus = this.getUser(userId);
    this._logic.leaveRoom(room, userStatus.user);
    this._userCurrentRoomRel.delete(userId);
    userStatus.status = "outsideRoom";
    if (room.players.length === 0) {
      this._roomsStatus.delete(roomId);
    }
    return roomId;
  }

  public createGame(userId: string): [string, string] {
    const roomId = this.getUserCurrentRoomId(userId);
    const room = this.getRoom(roomId);
    const gameStatus = this._logic.createGame(room);
    this._gamesStatus.set(gameStatus.id, gameStatus);
    this._roomCurrentGameRel.set(roomId, gameStatus.id);
    for (const player of room.players) {
      this._userCurrentGameRel.set(player.userId, gameStatus.id);
      const userStatus = this.getUser(player.userId);
      userStatus.status = "inGame";
    }
    return [room.id, gameStatus.id];
  }

  public startGame(userId: string): string {
    const gameId = this.getUserCurrentGameId(userId);
    const game = this.getGame(gameId);
    this._logic.startGame(game);
    return gameId;
  }

  public endGame(userId: string): string {
    const roomId = this.getUserCurrentRoomId(userId);
    const room = this.getRoom(roomId);
    const gameId = this.getRoomCurrentGameId(room.id);
    const game = this.getGame(gameId);
    this._logic.endGame(game);
    this._gamesStatus.delete(gameId);
    this._roomCurrentGameRel.delete(roomId);

    for (const player of room.players) {
      this._userCurrentGameRel.delete(player.userId);
      const userStatus = this.getUser(player.userId);
      userStatus.status = "inRoom";
    }

    return gameId;
  }

  public actPiece(userId: string, data: TicTacToeAction): string {
    const gameId = this.getUserCurrentGameId(userId);
    const game = this.getGame(gameId);
    this._logic.actPiece(game, userId, data);
    return gameId;
  }

  public setPlayerRoomReady(userId: string) {
    const roomId = this.getUserCurrentRoomId(userId);
    const room = this.getRoom(roomId);
    this._logic.setPlayerRoomReady(room, userId);
  }

  public enableCreateGame(userId: string): boolean {
    const roomId = this.getUserCurrentRoomId(userId);
    const room = this.getRoom(roomId);
    return this._logic.enableCreateGame(room);
  }

  public enableStartGame(userId: string): boolean {
    const gameId = this.getUserCurrentGameId(userId);
    const game = this.getGame(gameId);
    return this._logic.enableStartGame(game);
  }

  public enableEndGame(userId: string): boolean {
    const gameId = this.getUserCurrentGameId(userId);
    const game = this.getGame(gameId);
    return this._logic.enableEndGame(game);
  }

  public getBatchUsersSyncStateInGame(userId: string): UserSyncStateType[] {
    const gameId = this.getUserCurrentGameId(userId);
    const game = this.getGame(gameId);
    return game.players.map((p) => this.getUserSyncState(p.userId));
  }

  public setPlayerGameReady(userId: string) {
    const gameId = this.getUserCurrentGameId(userId);
    const game = this.getGame(gameId);
    this._logic.setPlayerGameReady(game, userId);
  }
}
