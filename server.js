
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { SerialDriver } from './serialDriver.js';
import { ZONES, buildCmd, queryZone, parseStatusLine } from './zoneService.js';
import db, { upsertZoneName, upsertDefaults, getZonePrefs, getSources, setSourceName } from './db.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Env
const PORT = parseInt(process.env.PORT || '8080', 10);
const SERIAL_PORT = process.env.SERIAL_PORT || '/dev/ttyUSB0';
const BAUD = parseInt(process.env.BAUD || '9600', 10);

// Serial init
const sd = new SerialDriver(SERIAL_PORT, BAUD);
await sd.open();

// --- State cache + waiters per zone ---
const lastState = new Map();                  // Map<zone, state>
const waiters   = new Map();                  // Map<zone, Array<resolve>>

function resolveWaiters(zone, state) {
  const list = waiters.get(zone);
  if (list && list.length) {
    list.forEach(res => res(state));
    waiters.set(zone, []); // clear
  }
}

sd.onData(line => {
  const parsed = parseStatusLine(line);
  if (parsed && parsed.zone) {
    lastState.set(parsed.zone, parsed);
    resolveWaiters(parsed.zone, parsed);
    console.log('[AMP:parsed]', parsed);
  } else {
    console.log('[AMP]', line); // echo or unrecognized line
  }
});

// Ask amp and wait for the next parsed reply for this zone
async function waitForZoneStatus(zone, timeoutMs = 1200) {
  // Start by sending a fresh query
  await sd.send(queryZone(zone));

  // If we already have state, we can return it faster—but we still wait briefly to allow an update
  if (lastState.has(zone)) {
    const current = lastState.get(zone);
    return new Promise((resolve) => {
      // queue a waiter; if nothing arrives within timeout, resolve with current
      const arr = waiters.get(zone) || [];
      const timer = setTimeout(() => {
        resolve(current);
      }, timeoutMs);
      arr.push(state => { clearTimeout(timer); resolve(state); });
      waiters.set(zone, arr);
    });
  }

  // No cached state: wait for first status or timeout
  return new Promise((resolve) => {
    const arr = waiters.get(zone) || [];
    const timer = setTimeout(() => resolve({ zone }), timeoutMs);
    arr.push(state => { clearTimeout(timer); resolve(state); });
    waiters.set(zone, arr);
  });
}

// --- API ---
app.get('/api/amps', (req,res)=> res.json({ amps: 1 }));

// Live states for all zones
app.get('/api/zones', async (req,res)=>{
  const states = [];
  for (const z of ZONES) {
    const s = await waitForZoneStatus(z);
    states.push(s);
  }
  res.json(states);
});

// Live state for one zone
app.get('/api/zones/:zone', async (req,res)=>{
  const z = parseInt(req.params.zone, 10);
  const s = await waitForZoneStatus(z);
  res.json(s);
});

// Control endpoints (write)
app.post('/api/zones/:zone/:attr', async (req,res)=>{
  const z = parseInt(req.params.zone, 10);
  const attr = req.params.attr; // power | volume | source | mute | treble | bass | balance
  const { value } = req.body;
  const cmd = buildCmd(z, attr, value); // e.g., "<11VO20"
  await sd.send(cmd);
  const s = await waitForZoneStatus(z); // return refreshed state after write
  res.json({ ok: true, cmd, state: s });
});

// Prefs: zones
app.get('/api/prefs', (req,res)=> res.json(getZonePrefs()));
app.post('/api/prefs/zone-name', (req,res)=>{
  const { zone, name } = req.body;
  upsertZoneName.run(zone, name);
  res.json({ ok: true });
});
app.post('/api/prefs/defaults', (req,res)=>{
  const { zone, source, treble, bass, balance } = req.body;
  upsertDefaults.run(zone, source, treble, bass, balance);
  res.json({ ok: true });
});

// Prefs: sources
app.get('/api/sources', (req,res)=> res.json(getSources()));
app.post('/api/sources', (req,res)=>{
  const { id, name } = req.body;
  setSourceName.run(id, name);
  res.json({ ok: true });
});

// Static UI
app.use(express.static('public'));

app.listen(PORT, ()=> {
  console.log(`Smart UI on port ${PORT} (serial ${SERIAL_PORT} @ ${BAUD})`);
});

