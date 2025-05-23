import { TicTacToeMCPService } from "./tic-tac-toe.mcp";

const domain = "http://localhost:3000/tic-tac-toe";
const mcp = new TicTacToeMCPService(domain);

mcp.start();
