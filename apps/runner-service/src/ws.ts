import { Server, type Socket } from "socket.io";
import { type Server as HttpServer } from "http"
import { saveToS3 } from "@repo/awss3/S3"
import path from "path"
import { fetchDir, fetchFileContent, saveFile } from "./file";
import { TerminalManager } from "./pty";

const terminalManager = new TerminalManager();

export function initWs(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    }
  })
  io.on("connection", async (socket) => {
    //auth checks should happen here
    const host = socket.handshake.headers.host;
    console.log(`Host is ${host}`)
    const replId = host?.split(".")[0]

    if (!replId) {
      socket.disconnect();
      terminalManager.clear(socket.id);
      return;
    }

    socket.emit("loaded", {
      rootContent: await fetchDir("/workspace", "")
    })

    initHandlers(socket, replId)
  })
}

function initHandlers(socket: Socket, replId: string) {
  socket.on("disconnect", () => {
    console.log("user disconnected");
  })

  socket.on("fetchDir", async (dir: string, callback) => {
    const dirPath = `/workspace/${dir}`
    const contents = await fetchDir(dirPath, dir)
    callback(contents)
  })

  socket.on("fetchContent", async ({ path: filePath }: { path: string }, callback) => {
    const fullPath = `/workspace/${filePath}`
    const data = await fetchFileContent(fullPath)
    callback(data)
  })

  //TODO: contents should be sent as diff, not full file
  //TODO: Should be validated for size
  //TODO: Should be throttled before updating s3 (or use an S3 mount)

  socket.on("updateContent", async ({ path: filePath, content }: { path: string, content: string }) => {
    const fullPath = `/workspace/${filePath}`
    await saveFile(fullPath, content)
    await saveToS3(`code/${replId}`, filePath, content)
  });

  socket.on("requestTerminal", async () => {
    terminalManager.createPty(socket.id, replId, (data, id) => {
      socket.emit("terminal", {
        data: Buffer.from(data, "utf-8")
      });
    })
  })

  socket.on("terminalData", async ({ data }: { data: string, terminalId: number }) => {
    terminalManager.write(socket.id, data)
  })
}
