export class Logger {
  constructor(tag = '') {
    this.tag = tag
  }

  get prefix() {
    return `${new Date().toLocaleTimeString('en-US')}${this.tag ? '::[' + this.tag + ']' : ''}`
  }

  _print(method, args, colorCode = '\x1b[0m') {
    if (process.env.NODE_ENV === 'dev') {
      // eslint-disable-next-line no-console
      console[method](`${this.prefix} ${colorCode}`, ...args, '\x1b[0m');
    } else {
      switch (method) {
        case 'log':
        case 'debug':
          return;
      }
      // eslint-disable-next-line no-console
      console[method](`${this.prefix} ${colorCode}`, ...args, '\x1b[0m');
    }
  }

  log() {
    // COLOR: Green
    this._print('log', arguments, '\x1b[32m%s\x1b[0m')
  }

  trace() {
    // COLOR: White
    this._print('trace', arguments, '\x1b[37m%s\x1b[0m')
  }

  debug() {
    // COLOR: Magenta
    this._print('debug', arguments, '\x1b[35m%s\x1b[0m')
  }

  info() {
    // COLOR: Cyan
    this._print('info', arguments, '\x1b[36m%s\x1b[0m')
  }

  warn() {
    // COLOR: Yellow
    this._print('warn', arguments, '\x1b[33m%s\x1b[0m')
  }

  error() {
    // COLOR: Red
    this._print('error', arguments, '\x1b[31m%s\x1b[0m')
  }
}

export const logger = new Logger()
