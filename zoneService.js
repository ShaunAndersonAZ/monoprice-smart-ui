
export const ZONES = [11, 12, 13, 14, 15, 16];

const CMD_PREFIX   = '<';  // set commands: e.g., "<11VO20"
const QUERY_PREFIX = '?';  // queries: e.g., "?11"

export function buildCmd(zone, attr, value) {
  const map = { power: 'PR', volume: 'VO', source: 'CH', mute: 'MU', treble: 'TR', bass: 'BS', balance: 'BL' };
  const code = map[attr];
  if (!code) throw new Error(`Unsupported attribute: ${attr}`);
  const vv = typeof value === 'boolean' ? (value ? '01' : '00') : value.toString().padStart(2, '0');
  return `${CMD_PREFIX}${zone}${code}${vv}`;
}

export function queryZone(zone) {
  return `${QUERY_PREFIX}${zone}`;
}

/**
 * Parse status lines of the form:
 *   "#>1100010000302007100500" (or possibly without '#')
 * We ignore echo lines like "#?11".
 */
export function parseStatusLine(line) {
  if (!line) return null;

  // Ignore query echoes
  if (line.startsWith('#?') || line.startsWith('?')) return null;

  // Strip leading markers
  let cleaned = line.replace(/^#?>\s*/, ''); // remove leading "#>", ">", and spaces

  // Must be 22+ digits and even length (pairs)
  if (!/^\d{22,}$/.test(cleaned) || cleaned.length % 2 !== 0) {
    return null;
  }

  const tokens = cleaned.match(/.{1,2}/g) || [];
  if (tokens.length < 11) return null;

  const [zone, pa, pr, mu, dt, vo, tr, bs, bl, ch, ls] = tokens;
  const toInt = v => /^\d+$/.test(v) ? parseInt(v, 10) : v;
  return {
    zone: toInt(zone),
    pa, pr, mu, dt,
    vo: toInt(vo),
    tr: toInt(tr),
    bs: toInt(bs),
    bl: toInt(bl),
    ch: toInt(ch),
    ls
  };
}
``

