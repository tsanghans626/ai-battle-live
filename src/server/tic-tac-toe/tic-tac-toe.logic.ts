import { GameStatus } from "./status/game.status";
import { RoomStatus } from "./status/room.status";
import {
  PlayerStatusInGameType,
  PlayerType,
  TicTacToeAction,
  TicTacToeConfig,
} from "./type";
import { SocketError } from "../socket-exceptions";

export class TicTacToeLogic {
  private _config: TicTacToeConfig;

  constructor() {
    this._config = {
      maxPlayers: 2,
    };
  }

  get config(): TicTacToeConfig {
    return this._config;
  }

  private isWin(
    gameStatus: GameStatus,
    player: PlayerStatusInGameType
  ): boolean {
    const _checkerboard = gameStatus.checkerboard;
    const sideType = player.piece;

    // Check rows
    for (let i = 0; i < 3; i++) {
      if (_checkerboard[i].every((piece) => piece === sideType)) {
        return true;
      }
    }

    // Check columns
    for (let i = 0; i < 3; i++) {
      if (
        _checkerboard[0][i] === sideType &&
        _checkerboard[1][i] === sideType &&
        _checkerboard[2][i] === sideType
      ) {
        return true;
      }
    }

    // Check diagonals
    if (
      _checkerboard[0][0] === sideType &&
      _checkerboard[1][1] === sideType &&
      _checkerboard[2][2] === sideType
    ) {
      return true;
    }

    if (
      _checkerboard[0][2] === sideType &&
      _checkerboard[1][1] === sideType &&
      _checkerboard[2][0] === sideType
    ) {
      return true;
    }

    return false;
  }

  public computeWinner(gameStatus: GameStatus): string | null {
    let winner: string | null = null;

    for (const player of gameStatus.players) {
      if (this.isWin(gameStatus, player)) {
        winner = player.userId;
        break;
      }
    }

    return winner;
  }

  private computeIsDraw(gameStatus: GameStatus): boolean {
    const _checkerboard = gameStatus.checkerboard;
    // Check if all cells are filled
    return _checkerboard.every((row) => row.every((piece) => piece !== "_"));
  }

  public joinRoom(roomStatus: RoomStatus, userId: string): void {
    if (roomStatus.players.length >= roomStatus.maxPlayers) {
      throw new SocketError("玩家数量已满");
    }

    roomStatus.join(userId);
  }

  public leaveRoom(roomStatus: RoomStatus, player: PlayerType): void {
    roomStatus.leaveByUserId(player.userId);
  }

  public setPlayerRoomReady(roomStatus: RoomStatus, userId: string): void {
    const res = roomStatus.setPlayerRoomReadyByUserId(userId);
    if (!res) {
      throw new SocketError("玩家不存在");
    }
  }

  public createGame(roomStatus: RoomStatus): GameStatus {
    const gameStatus = new GameStatus(roomStatus.players.map((p) => p.userId));
    return gameStatus;
  }

  public actPiece(
    gameStatus: GameStatus,
    userId: string,
    data: TicTacToeAction
  ): void {
    if (gameStatus.status !== "playing") {
      throw new SocketError("游戏未开始");
    }

    if (gameStatus.currentPlayer.userId !== userId) {
      throw new SocketError("目前不是你的回合");
    }

    const res = gameStatus.setPiece(
      data.row,
      data.col,
      gameStatus.currentPlayer.piece
    );
    if (!res) {
      throw new SocketError("该位置已经有棋子了");
    }

    gameStatus.setNextTurn();
  }

  public enableCreateGame(roomStatus: RoomStatus): boolean {
    const players = roomStatus.players;
    if (players.length < roomStatus.maxPlayers) {
      return false;
    }
    for (const player of players) {
      if (!player.isReady) {
        return false;
      }
    }
    return true;
  }

  public enableEndGame(gameStatus: GameStatus): boolean {
    let res = false;

    if (gameStatus.status === "playing") {
      const isDraw = this.computeIsDraw(gameStatus);
      const winner = this.computeWinner(gameStatus);

      if (isDraw || winner) {
        res = true;
      }
    }

    return res;
  }

  public startGame(gameStatus: GameStatus): void {
    gameStatus.status = "playing";
  }

  public endGame(gameStatus: GameStatus): void {
    gameStatus.status = "end";
  }

  public setPlayerGameReady(gameStatus: GameStatus, userId: string): void {
    const res = gameStatus.setPlayerGameReadyByUserId(userId);
    if (!res) {
      throw new SocketError("玩家不存在");
    }
  }

  public enableStartGame(gameStatus: GameStatus): boolean {
    const players = gameStatus.players;
    for (const player of players) {
      if (!player.isReady) {
        return false;
      }
    }
    return true;
  }
}
