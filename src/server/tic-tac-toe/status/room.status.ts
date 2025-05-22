import { PlayerStatusInRoomType } from "../type";

export class RoomStatus {
  private _maxPlayers: number;
  private _id: string;
  private _playerStatus: Map<string, PlayerStatusInRoomType>;

  constructor(id: string, userId: string, maxPlayers: number) {
    this._id = id;
    this._playerStatus = new Map();
    this._maxPlayers = maxPlayers;
    // 初始化玩家状态
    this.initPlayerStatus(userId);
  }

  private initPlayerStatus(userId: string): void {
    this._playerStatus.set(userId, { userId, isReady: false });
  }

  get id(): string {
    return this._id;
  }

  public join(userId: string): boolean {
    if (this._playerStatus.keys.length >= this._maxPlayers) {
      return false;
    }
    this.initPlayerStatus(userId);
    return true;
  }

  public leaveByUserId(userId: string): boolean {
    this._playerStatus.delete(userId);
    return true;
  }

  get players(): PlayerStatusInRoomType[] {
    return Array.from(this._playerStatus.values());
  }

  get maxPlayers(): number {
    return this._maxPlayers;
  }

  public setPlayerRoomReadyByUserId(userId: string): boolean {
    const playerStatus = this._playerStatus.get(userId);
    if (!playerStatus) {
      return false;
    }
    playerStatus.isReady = true;
    return true;
  }
}
