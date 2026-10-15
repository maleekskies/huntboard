import { lookup } from 'dns/promises';
import { isIP } from 'net';

// "Paste a job URL and we'll fetch it" is a server-side request to an address
// a stranger chose. Without checks it can be pointed at localhost, cloud
// metadata (169.254.169.254) or private networks. This resolves the host,
// refuses private/loopback/link-local addresses, only allows http(s) on the
// normal ports, follows redirects by hand so every hop is checked again, and
// caps how much it will read.

const MAX_REDIRECTS = 3;
const MAX_BYTES = 2 * 1024 * 1024;

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === '::' || v === '::1') return true;
  if (v.startsWith('fe80') || v.startsWith('fc') || v.startsWith('fd')) return true;
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  // URL parsing rewrites ::ffff:127.0.0.1 as ::ffff:7f00:1, so check that form too.
  const hex = v.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return isPrivateIPv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  return false;
}

function isPrivateAddress(ip: string): boolean {
  return isIP(ip) === 4 ? isPrivateIPv4(ip) : isPrivateIPv6(ip);
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('That is not a valid URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only http(s) links are allowed.');
  if (url.username || url.password) throw new Error('Links with embedded credentials are not allowed.');
  if (url.port && url.port !== '80' && url.port !== '443') throw new Error('That port is not allowed.');

  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new Error('That address is not allowed.');
  }

  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error('That address is not allowed.');
  }
  return url;
}

export async function safeFetchText(
  rawUrl: string,
  opts: { timeoutMs?: number; headers?: Record<string, string> } = {}
): Promise<{ ok: boolean; status: number; text: string }> {
  let current = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);
    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal, redirect: 'manual', headers: opts.headers });
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location')!, url).toString();
      continue;
    }

    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > MAX_BYTES) throw new Error('That page is too large.');

    const reader = res.body?.getReader();
    if (!reader) return { ok: res.ok, status: res.status, text: '' };
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        throw new Error('That page is too large.');
      }
      chunks.push(value);
    }
    return { ok: res.ok, status: res.status, text: Buffer.concat(chunks).toString('utf8') };
  }

  throw new Error('Too many redirects.');
}
