import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./tic-tac-toe.event";
import { Socket } from "socket.io";

export type PieceType = "O" | "X";

export type CheckerboardType = PieceType | "_";

export type GameStatusType = "waiting" | "playing" | "end";

export type PlayerStatusInGameType = {
  userId: string;
  piece: PieceType;
  isTurn: boolean;
  isReady: boolean;
};

export type PlayerType = {
  userId: string;
  nickName: string;
};

export type TicTocToeSocketType = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type GameSyncStateType = {
  id: string;
  players: (PlayerType & PlayerStatusInGameType)[];
  board: string[][];
  currentPlayer: PlayerType & PlayerStatusInGameType;
  status: GameStatusType;
  winner: string | null;
};

export type UserStatusType = "outsideRoom" | "inRoom" | "inGame";

export type UserSyncStateType = {
  user: PlayerType;
  status: UserStatusType;
};

export type PlayerStatusInRoomType = {
  userId: string;
  isReady: boolean;
};

export type TicTacToeAction = {
  col: number;
  row: number;
};

export type TicTacToeConfig = {
  maxPlayers: number;
};

export type RoomSyncStateType = {
  id: string;
  players: (PlayerType & PlayerStatusInRoomType)[];
};
