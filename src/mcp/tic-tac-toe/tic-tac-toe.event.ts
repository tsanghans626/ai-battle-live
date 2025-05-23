import {
  GameSyncStateType,
  RoomSyncStateType,
  UserSyncStateType,
} from "./type";

interface ServerToClientEvents {
  syncGameState: (data: GameSyncStateType) => void;
  syncRoomState: (data: RoomSyncStateType) => void;
  syncUserState: (data: UserSyncStateType) => void;
}

interface ClientToServerEvents {
  login: (data: { userId: string; nickName: string }) => void;
  logout: () => void;
  createRoom: (data: { roomId: string }) => void;
  joinRoom: (data: { roomId: string }) => void;
  leaveRoom: () => void;
  readyRoom: () => void;
  readyGame: () => void;
  act: (data: { row: number; col: number }) => void;
  think: (data: { message: string }) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  userId?: string;
}

export {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
};
