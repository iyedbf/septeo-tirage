import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Redis } from '@upstash/redis';

const byCreation = (a, b) => a.createdAt.localeCompare(b.createdAt);

// Participants are stored one per field, keyed by their normalized name, so that
// concurrent registrations never overwrite each other and duplicates are rejected atomically.
function redisStore(url, token) {
  const redis = new Redis({ url, token, automaticDeserialization: false });
  const PHASE = 'tirage:phase';
  const PARTICIPANTS = 'tirage:participants';

  return {
    async getPhase() {
      return (await redis.get(PHASE)) || 'inscription';
    },
    async setPhase(phase) {
      await redis.set(PHASE, phase);
    },
    async list() {
      // Without automatic deserialization, HGETALL returns a flat [field, value, field, value…] array.
      const raw = (await redis.hgetall(PARTICIPANTS)) || [];
      const values = Array.isArray(raw) ? raw.filter((_, i) => i % 2 === 1) : Object.values(raw);
      return values.map((v) => (typeof v === 'string' ? JSON.parse(v) : v)).sort(byCreation);
    },
    async add(p) {
      return (await redis.hsetnx(PARTICIPANTS, p.key, JSON.stringify(p))) === 1;
    },
    async update(p) {
      await redis.hset(PARTICIPANTS, { [p.key]: JSON.stringify(p) });
    },
    async remove(p) {
      await redis.hdel(PARTICIPANTS, p.key);
    },
    async replaceAll(participants) {
      const tx = redis.multi();
      tx.del(PARTICIPANTS);
      if (participants.length) {
        tx.hset(PARTICIPANTS, Object.fromEntries(participants.map((p) => [p.key, JSON.stringify(p)])));
      }
      await tx.exec();
    },
    async reset() {
      await redis.del(PHASE, PARTICIPANTS);
    },
  };
}

function fileStore() {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data.json');
  let db;
  try {
    db = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    db = { phase: 'inscription', participants: [] };
  }
  const save = () => {
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(db, null, 2));
    fs.renameSync(`${file}.tmp`, file);
  };

  return {
    async getPhase() {
      return db.phase;
    },
    async setPhase(phase) {
      db.phase = phase;
      save();
    },
    async list() {
      return db.participants.map((p) => ({ ...p })).sort(byCreation);
    },
    async add(p) {
      if (db.participants.some((x) => x.key === p.key)) return false;
      db.participants.push(p);
      save();
      return true;
    },
    async update(p) {
      db.participants = db.participants.map((x) => (x.key === p.key ? p : x));
      save();
    },
    async remove(p) {
      db.participants = db.participants.filter((x) => x.key !== p.key);
      save();
    },
    async replaceAll(participants) {
      db.participants = participants;
      save();
    },
    async reset() {
      db = { phase: 'inscription', participants: [] };
      save();
    },
  };
}

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const store = redisUrl && redisToken ? redisStore(redisUrl, redisToken) : fileStore();
export const storeKind = redisUrl && redisToken ? 'redis' : 'file';
