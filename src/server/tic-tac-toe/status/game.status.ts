import { v4 as uuidv4 } from "uuid";
import {
  CheckerboardType,
  GameStatusType,
  PieceType,
  PlayerStatusInGameType,
} from "../type";

export class GameStatus {
  private _id: string;
  private _checkerboard: CheckerboardType[][];
  private _status: GameStatusType;
  private _playerUserIds: PlayerStatusInGameType[];
  private _currentPlayerIndex: number;

  constructor(userIds: string[]) {
    this._id = uuidv4();
    this._checkerboard = [
      ["_", "_", "_"],
      ["_", "_", "_"],
      ["_", "_", "_"],
    ];
    this._status = "waiting";
    this._playerUserIds = this.randomizeUserIds(userIds);

    // 初始化当前玩家
    this._currentPlayerIndex = 0;
    this._playerUserIds[this._currentPlayerIndex].isTurn = true;
  }

  private randomizeUserIds(userIds: string[]): PlayerStatusInGameType[] {
    // 随机排序玩家数组
    const shuffledPlayers = [...userIds].sort(() => Math.random() - 0.5);

    // 分配棋子类型（X 和 O）
    const pieceTypes: PieceType[] = ["X", "O"];

    // 创建带有游戏状态的玩家数组
    return shuffledPlayers.map((userId, index) => {
      const piece = pieceTypes[index];
      // X 总是先行
      const isTurn = piece === "X";
      return { userId, piece, isTurn, isReady: false };
    });
  }

  get id(): string {
    return this._id;
  }

  public setPiece(row: number, col: number, piece: CheckerboardType): boolean {
    if (this._checkerboard[row][col] !== "_") {
      return false;
    }
    this._checkerboard[row][col] = piece;
    return true;
  }

  get checkerboard(): CheckerboardType[][] {
    return this._checkerboard.map((row) => [...row]);
  }

  get status(): GameStatusType {
    return this._status;
  }

  set status(status: GameStatusType) {
    this._status = status;
  }

  public setNextTurn(): boolean {
    this._playerUserIds.forEach((player) => {
      player.isTurn = false;
    });
    this._playerUserIds[this._currentPlayerIndex].isTurn = true;
    this._currentPlayerIndex =
      (this._currentPlayerIndex + 1) % this._playerUserIds.length;
    return true;
  }

  get currentPlayer(): PlayerStatusInGameType {
    return this._playerUserIds[this._currentPlayerIndex];
  }

  get players(): PlayerStatusInGameType[] {
    return this._playerUserIds.map((player) => ({ ...player }));
  }

  public setPlayerGameReadyByUserId(userId: string): boolean {
    const player = this._playerUserIds.find(
      (player) => player.userId === userId
    );
    if (!player) {
      return false;
    }
    player.isReady = true;
    return true;
  }
}
