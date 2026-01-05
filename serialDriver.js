
// serialDriver.js
import { SerialPort } from 'serialport';
import { DelimiterParser } from '@serialport/parser-delimiter';

// Explicit delimiter — default to CR ('\r') which your amp uses.
// If you ever need LF, set SERIAL_DELIM=$'\n' in the service environment.
const DELIMITER = process.env.SERIAL_DELIM || '\r';

export class SerialDriver {
  constructor(path, baudRate = 9600) {
    this.port = new SerialPort({ path, baudRate, autoOpen: false });

    // Use Buffer delimiter to avoid accidental embedded characters
    this.parser = this.port.pipe(new DelimiterParser({
      delimiter: Buffer.from(DELIMITER, 'utf8')
    }));
  }

  async open() {
    if (this.port.isOpen) return;
    await new Promise((resolve, reject) => this.port.open(err => err ? reject(err) : resolve()));
  }

  onData(fn) {
    this.parser.on('data', buf => {
      // Convert Buffer to ASCII string; trim to remove residual \n if present
      const line = buf.toString('ascii').trim();
      fn(line);
    });
  }

  send(cmd) {
    return new Promise((resolve, reject) => {
      // Amp expects ASCII command + carriage return
      const wire = `${cmd}\r`;
      this.port.write(wire, err => err ? reject(err) : resolve());
    });
  }
}


