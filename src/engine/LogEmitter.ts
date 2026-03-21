export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'raw';

export type LogCallback = (level: LogLevel, line: string) => void;

export class LogEmitter {
  private callback: LogCallback;

  constructor(callback: LogCallback) {
    this.callback = callback;
  }

  emit(level: LogLevel, line: string) {
    this.callback(level, line);
  }

  info(line: string) { this.emit('info', line); }
  warn(line: string) { this.emit('warn', line); }
  error(line: string) { this.emit('error', line); }
  success(line: string) { this.emit('success', line); }
  raw(line: string) { this.emit('raw', line); }
}
