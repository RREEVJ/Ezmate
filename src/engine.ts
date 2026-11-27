/** score from side to move: centipawns, or mate in n */
export interface Result { best: string; cp?: number; mate?: number }

export class Engine {
  private worker = new Worker(`${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`);
  private queue: Promise<unknown> = Promise.resolve();
  private abort?: (reason: Error) => void;
  private dead = false;

  constructor() {
    this.worker.postMessage('uci');
  }

  /** searches run one at a time */
  search(fen: string, opts: { depth: number; skill?: number }): Promise<Result> {
    const run = this.queue.then(() => new Promise<Result>((resolve, reject) => {
      if (this.dead) return reject(new Error('Engine stopped'));
      let cp: number | undefined;
      let mate: number | undefined;
      this.abort = reject;
      this.worker.onerror = () => reject(new Error('Engine failed to load'));
      this.worker.onmessage = ({ data }: MessageEvent<string>) => {
        const score = /^info .*score (cp|mate) (-?\d+)/.exec(data);
        if (score) {
          cp = score[1] === 'cp' ? Number(score[2]) : undefined;
          mate = score[1] === 'mate' ? Number(score[2]) : undefined;
        }
        if (data.startsWith('bestmove')) resolve({ best: data.split(' ')[1], cp, mate });
      };
      this.worker.postMessage(`setoption name Skill Level value ${opts.skill ?? 20}`);
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${opts.depth}`);
    }));
    this.queue = run.catch(() => {});
    return run;
  }

  stop() {
    this.dead = true;
    this.worker.terminate();
    this.abort?.(new Error('Engine stopped'));
  }
}
