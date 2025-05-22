import { PlayerType, UserStatusType } from "../type";

export class UserStatus {
  private _user: PlayerType;
  private _status: UserStatusType;

  constructor(user: PlayerType) {
    this._user = { ...user };
    this._status = "outsideRoom";
  }

  get user(): PlayerType {
    return { ...this._user };
  }

  get status(): UserStatusType {
    return this._status;
  }

  set status(status: UserStatusType) {
    this._status = status;
  }
}
