import * as fs from "fs";
import * as path from "path";
import * as util from "util";

// 定义日志级别
type LogLevel = "ERROR" | "WARN" | "INFO" | "HTTP" | "DEBUG";

// 确保日志目录存在
const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 获取调用位置信息的函数
const getCallerInfo = () => {
  const stackTraceLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 5;

  const err = new Error();
  Error.captureStackTrace(err);
  const stack = err.stack || "";

  Error.stackTraceLimit = stackTraceLimit;

  const stackLines = stack.split("\n");
  const callerLine = stackLines[3] || stackLines[2] || "";

  const match =
    callerLine.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/) ||
    callerLine.match(/at\s+()(.*):(\d+):(\d+)/);

  if (match) {
    const filePath = match[2];
    const line = match[3];

    if (filePath) {
      const projectRoot = process.cwd();
      const relativePath = filePath
        .replace(projectRoot, "")
        .replace(/^[\/\\]/, "");
      return `${relativePath}:${line}`;
    }
  }

  return "unknown location";
};

// 获取当前格式化时间
const getFormattedTime = () => {
  const now = new Date();
  return now.toISOString().replace("T", " ").substring(0, 19);
};

// 日志文件写入流缓存
const logStreams: Record<string, fs.WriteStream> = {};

// 写入日志到文件
const writeToFile = (level: LogLevel, message: string) => {
  if (process.env.NODE_ENV !== "production") return;

  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const filename = `${date}-${level.toLowerCase()}.log`;
  const filePath = path.join(logDir, filename);

  if (!logStreams[filePath]) {
    logStreams[filePath] = fs.createWriteStream(filePath, { flags: "a" });
  }

  logStreams[filePath].write(message + "\n");
};

// 简单日志缓存
const loggerCache: Record<string, any> = {};

// 创建日志工厂函数
export const createLogger = (module: string) => {
  if (loggerCache[module]) {
    return loggerCache[module];
  }

  const logger = {
    error: (message: any) => {
      const time = getFormattedTime();
      const location = getCallerInfo();
      const logMessage = `${time} [ERROR] [${module}] [${location}]: ${util.format(
        message
      )}`;

      console.error(logMessage);
      writeToFile("ERROR", logMessage);
    },

    warn: (message: any) => {
      const time = getFormattedTime();
      const location = getCallerInfo();
      const logMessage = `${time} [WARN] [${module}] [${location}]: ${util.format(
        message
      )}`;

      console.warn(logMessage);

      if (process.env.NODE_ENV === "production") {
        writeToFile("WARN", logMessage);
      }
    },

    info: (message: any) => {
      const time = getFormattedTime();
      const location = getCallerInfo();
      const logMessage = `${time} [INFO] [${module}] [${location}]: ${util.format(
        message
      )}`;

      console.log(logMessage);

      if (process.env.NODE_ENV === "production") {
        writeToFile("INFO", logMessage);
      }
    },

    http: (message: any) => {
      if (process.env.NODE_ENV === "production") return;

      const time = getFormattedTime();
      const location = getCallerInfo();
      const logMessage = `${time} [HTTP] [${module}] [${location}]: ${util.format(
        message
      )}`;

      console.log(logMessage);
    },

    debug: (message: any) => {
      if (process.env.NODE_ENV === "production") return;

      const time = getFormattedTime();
      const location = getCallerInfo();
      const logMessage = `${time} [DEBUG] [${module}] [${location}]: ${util.format(
        message
      )}`;

      console.log(logMessage);
    },
  };

  loggerCache[module] = logger;
  return logger;
};

// 确保在程序退出时关闭所有日志文件流
process.on("exit", () => {
  Object.values(logStreams).forEach((stream) => {
    stream.end();
  });
});
