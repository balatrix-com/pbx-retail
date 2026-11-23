// Run with: node --env-file=.env scripts/reconcile-voicemail-greetings.js [--apply]
// Existing greeting WAVs are never modified. Ambiguous or missing sources stay unnamed.
const { createHash } = require('node:crypto');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const greetingRoot = process.env.VOICEMAIL_GREETING_ROOT || '/opt/ivr_audio';
const audioRoot = process.env.FS_AUDIO_BASE_PATH || '/opt/ivr_audio';
const ffmpeg = process.env.FFMPEG_BINARY || 'ffmpeg';
const fingerprintCache = new Map();

function fingerprint(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    let bytes = 0;
    let failed = false;
    const child = spawn(ffmpeg, [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-i', file,
      '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', '-t', '60',
      '-f', 's16le', 'pipe:1',
    ], { stdio: ['ignore', 'pipe', 'ignore'] });
    const timer = setTimeout(() => { failed = true; child.kill('SIGKILL'); }, 30000);
    child.stdout.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > 4 * 1024 * 1024) { failed = true; child.kill('SIGKILL'); }
      else hash.update(chunk);
    });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => {
      clearTimeout(timer);
      if (failed || code !== 0 || bytes === 0) reject(new Error('Audio fingerprint failed'));
      else resolve(`${bytes}:${hash.digest('hex')}`);
    });
  });
}

async function sourceFingerprint(audio, tenantRoot) {
  if (fingerprintCache.has(audio.id)) return fingerprintCache.get(audio.id);
  let result = null;
  try {
    const source = await fs.realpath(audio.storageUrl);
    if (source.startsWith(tenantRoot + path.sep)) result = await fingerprint(source);
  } catch { /* Missing library file: leave its old greeting metadata untouched. */ }
  fingerprintCache.set(audio.id, result);
  return result;
}

async function main() {
  const boxes = await prisma.voicemailBox.findMany({
    where: { greetingPath: { not: null }, greetingAudioFileId: null },
    select: { id: true, tenantId: true, greetingPath: true },
    orderBy: [{ tenantId: 'asc' }, { sequenceId: 'asc' }],
  });
  const libraryByTenant = new Map();
  let matched = 0;
  let unresolved = 0;
  for (const box of boxes) {
    const expected = path.resolve(greetingRoot, box.tenantId, 'voicemail', box.id, 'greeting.wav');
    if (path.resolve(box.greetingPath) !== expected) {
      console.log(`${box.tenantId}/${box.id}: skipped unexpected greeting path`);
      unresolved++;
      continue;
    }
    let greetingHash;
    let tenantRoot;
    try {
      [greetingHash, tenantRoot] = await Promise.all([
        fingerprint(expected), fs.realpath(path.join(audioRoot, box.tenantId)),
      ]);
    } catch {
      console.log(`${box.tenantId}/${box.id}: greeting or Audio Library directory unavailable`);
      unresolved++;
      continue;
    }
    if (!libraryByTenant.has(box.tenantId)) {
      libraryByTenant.set(box.tenantId, await prisma.audioFile.findMany({
        where: { tenantId: box.tenantId },
        select: { id: true, name: true, originalName: true, filename: true, storageUrl: true },
        orderBy: { createdAt: 'desc' }, take: 501,
      }));
    }
    const library = libraryByTenant.get(box.tenantId);
    if (library.length > 500) {
      console.log(`${box.tenantId}/${box.id}: skipped library with over 500 files`);
      unresolved++;
      continue;
    }
    const matches = [];
    for (const audio of library) {
      if (await sourceFingerprint(audio, tenantRoot) === greetingHash) matches.push(audio);
      if (matches.length > 1) break;
    }
    if (matches.length !== 1) {
      console.log(`${box.tenantId}/${box.id}: ${matches.length ? 'ambiguous' : 'no'} source match`);
      unresolved++;
      continue;
    }
    const audio = matches[0];
    const name = audio.name || audio.originalName || audio.filename;
    if (apply) {
      const result = await prisma.voicemailBox.updateMany({
        where: { id: box.id, tenantId: box.tenantId, greetingPath: box.greetingPath, greetingAudioFileId: null },
        data: { greetingAudioFileId: audio.id, greetingAudioName: name },
      });
      if (!result.count) {
        console.log(`${box.tenantId}/${box.id}: changed during scan; skipped`);
        unresolved++;
        continue;
      }
    }
    matched++;
    console.log(`${box.tenantId}/${box.id}: ${apply ? 'restored' : 'would restore'} "${name}"`);
  }
  console.log(`${apply ? 'Restored' : 'Would restore'} ${matched}; unresolved ${unresolved}. No greeting audio was changed.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
