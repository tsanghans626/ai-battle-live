// 定义基础 Socket 异常类
export class SocketException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // 修复原型链
    Object.setPrototypeOf(this, SocketException.prototype);
  }
}

// 严重异常，会导致连接关闭
export class SocketPanic extends SocketException {
  constructor(message: string) {
    super(message);
    // 修复原型链
    Object.setPrototypeOf(this, SocketPanic.prototype);
  }
}

// 一般异常，不会关闭连接
export class SocketError extends SocketException {
  constructor(message: string) {
    super(message);
    // 修复原型链
    Object.setPrototypeOf(this, SocketError.prototype);
  }
}
