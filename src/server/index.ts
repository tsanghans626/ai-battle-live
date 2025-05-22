import { Server, Socket } from "socket.io";
import { ticTacToeHandler } from "./tic-tac-toe/tic-tac-toe.handler";
import { createLogger } from "./logger";
import * as http from "http";

const logger = createLogger("server");

// 创建 HTTP 服务器
const httpServer = http.createServer();

// 创建 Socket.IO 实例并附加到 HTTP 服务器
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["my-custom-header"],
  },
  transports: ["websocket", "polling"],
});
// 创建一个通用的异常处理函数
const createSocketErrorHandler = (namespace: string) => {
  return (socket: Socket, next: (err?: Error) => void) => {
    // 保存原始 on 方法
    const originalOn = socket.on;

    // 捕获错误的函数
    const handleError = (error: any, eventName: string) => {
      logger.error(
        `[${namespace}] Socket exception in event ${eventName}: ${error.message}`
      );

      // 发送异常通知到客户端
      try {
        if (error.name === "SocketPanic") {
          socket.emit("exception", { type: "panic", message: error.message });
          logger.error(`Socket panic, closing connection: ${socket.id}`);
          socket.disconnect(true);
        } else if (error.name === "SocketError") {
          socket.emit("exception", { type: "error", message: error.message });
          logger.warn(`Socket error: ${error.message}`);
        } else {
          socket.emit("exception", {
            type: "unknown",
            message: "Internal server error",
          });
          logger.error(`Unhandled exception: ${error.stack}`);
        }
      } catch (err) {
        logger.error(`Error while handling error: ${err}`);
      }
    };

    // 错误处理包装函数
    const wrapHandler = (eventName: string, handler: Function) => {
      return function (this: Socket, ...args: any[]) {
        try {
          const result = handler.apply(this, args);
          if (result instanceof Promise) {
            return result.catch((err: any) => {
              handleError(err, eventName);
              return undefined; // 防止错误继续传播
            });
          }
          return result;
        } catch (err) {
          handleError(err as Error, eventName);
          return undefined; // 防止错误继续传播
        }
      };
    };

    // 重写 socket.on 方法
    socket.on = function (event: string, handler: Function) {
      const wrappedHandler = wrapHandler(event, handler);
      return originalOn.call(this, event, wrappedHandler);
    };

    // 添加全局错误处理
    process.on("uncaughtException", (err) => {
      logger.error(`Uncaught exception: ${err.message}`);
      logger.error(err.stack);
      // 不退出进程
    });

    next();
  };
};

// 为主命名空间应用错误处理
io.use(createSocketErrorHandler("main"));

// 为 tic-tac-toe 命名空间应用错误处理
const ticTacToeNamespace = io.of("/tic-tac-toe");
ticTacToeNamespace.use(createSocketErrorHandler("tic-tac-toe"));

// 连接处理
ticTacToeNamespace.on("connection", (socket) => {
  logger.info(`New client connected to tic-tac-toe: ${socket.id}`);

  try {
    ticTacToeHandler(socket);
  } catch (err) {
    const error = err as Error;
    logger.error(`Error in connection handler: ${error.message}`);

    if (error.name === "SocketPanic") {
      socket.emit("exception", { type: "panic", message: error.message });
      socket.disconnect(true);
    } else if (error.name === "SocketError") {
      socket.emit("exception", { type: "error", message: error.message });
    } else {
      socket.emit("exception", {
        type: "unknown",
        message: "Internal server error",
      });
    }
  }
});

// 添加全局未捕获的异常处理器
process.on("uncaughtException", (err) => {
  logger.error(`CRITICAL: Uncaught exception: ${err.message}`);
  logger.error(err.stack);
  // 不退出进程
});

logger.info("Tic-Tac-Toe module is running");

// 启动 HTTP 服务器
httpServer.listen(3000, () => {
  logger.info("Server is running on port 3000");
});
