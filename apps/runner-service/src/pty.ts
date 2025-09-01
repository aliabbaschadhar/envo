import { spawn, type IPty } from "node-pty"

const SHELL = "bash"
interface SessionType {
  terminal: IPty;
  replId: string;
}

export class TerminalManager {
  sessions: {
    [id: string]: SessionType;
  } = {}

  constructor() {
    this.sessions = {}
  }

  createPty(id: string, replId: string, onData: (data: string, id: number) => void) {
    let term = spawn(SHELL, [], {
      cols: 100,
      name: "xterm",
      cwd: `/${replId}`
    });

    term.onData((data: string) => onData(data, term.pid));

    this.sessions[id] = {
      terminal: term,
      replId: replId
    }

    term.onExit(() => {
      delete this.sessions[term.pid];
    })

    return term;
  }
  write(terminalId: string, data: string) {
    this.sessions[terminalId]?.terminal.write(data)
  }
  clear(terminalId: string) {
    this.sessions[terminalId]?.terminal.kill();
    delete this.sessions[terminalId]
  }
}
