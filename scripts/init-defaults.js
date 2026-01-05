
import dotenv from 'dotenv';
import { SerialDriver } from '../serialDriver.js';
import { ZONES, buildCmd } from '../zoneService.js';

dotenv.config();
const sd = new SerialDriver(process.env.SERIAL_PORT || '/dev/ttyUSB0', parseInt(process.env.BAUD || '9600', 10));
await sd.open();
console.log('Applying defaults: Bass=13, Treble=8, Balance=7 to zones 11..16');
for (const z of ZONES) {
  await sd.send(buildCmd(z, 'bass',   13));
  await sd.send(buildCmd(z, 'treble', 8));
  await sd.send(buildCmd(z, 'balance',7));
}
console.log('Done.');
process.exit(0);
