import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Redis } from '@upstash/redis';

export const GENERAL = 'general';

const byCreation = (a, b) => a.createdAt.localeCompare(b.createdAt);

// Participants are stored one per field, keyed by their normalized name, so that
// concurrent registrations never overwrite each other and duplicates are rejected atomically.
// A global name index ensures a collaborator belongs to a single draw (general or one team).
function redisStore(url, token) {
  const redis = new Redis({ url, token, automaticDeserialization: false });
  const GROUPS = 'tirage:groups';
  const NAMES = 'tirage:names';

  // Without automatic deserialization, HGETALL returns a flat [field, value, field, value…] array.
  const hvalues = (raw) => {
    if (!raw) return [];
    const values = Array.isArray(raw) ? raw.filter((_, i) => i % 2 === 1) : Object.values(raw);
    return values.map((v) => (typeof v === 'string' ? JSON.parse(v) : v));
  };

  const scope = (prefix) => {
    const PHASE = `${prefix}:phase`;
    const PARTICIPANTS = `${prefix}:participants`;
    return {
      async getPhase() {
        return (await redis.get(PHASE)) || 'inscription';
      },
      async setPhase(phase) {
        await redis.set(PHASE, phase);
      },
      async list() {
        return hvalues(await redis.hgetall(PARTICIPANTS)).sort(byCreation);
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
  };

  return {
    group: (slug) => scope(slug === GENERAL ? 'tirage' : `tirage:g:${slug}`),
    groups: {
      async list() {
        return hvalues(await redis.hgetall(GROUPS)).sort(byCreation);
      },
      async get(slug) {
        const raw = await redis.hget(GROUPS, slug);
        return raw ? JSON.parse(raw) : null;
      },
      async add(g) {
        return (await redis.hsetnx(GROUPS, g.slug, JSON.stringify(g))) === 1;
      },
      async remove(slug) {
        await redis.hdel(GROUPS, slug);
      },
    },
    names: {
      async get(key) {
        return (await redis.hget(NAMES, key)) || null;
      },
      async claim(key, slug) {
        if ((await redis.hsetnx(NAMES, key, slug)) === 1) return true;
        return (await redis.hget(NAMES, key)) === slug;
      },
      async release(keys) {
        if (keys.length) await redis.hdel(NAMES, ...keys);
      },
    },
  };
}

function fileStore() {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data.json');
  let db;
  try {
    db = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    db = {};
  }
  db.phase ??= 'inscription';
  db.participants ??= [];
  db.groups ??= {};
  db.teams ??= {};
  db.names ??= {};

  const save = () => {
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(db, null, 2));
    fs.renameSync(`${file}.tmp`, file);
  };

  const bucket = (slug) => {
    if (slug === GENERAL) return db;
    db.teams[slug] ??= { phase: 'inscription', participants: [] };
    return db.teams[slug];
  };

  const scope = (slug) => ({
    async getPhase() {
      return bucket(slug).phase;
    },
    async setPhase(phase) {
      bucket(slug).phase = phase;
      save();
    },
    async list() {
      return bucket(slug).participants.map((p) => ({ ...p })).sort(byCreation);
    },
    async add(p) {
      const b = bucket(slug);
      if (b.participants.some((x) => x.key === p.key)) return false;
      b.participants.push(p);
      save();
      return true;
    },
    async update(p) {
      const b = bucket(slug);
      b.participants = b.participants.map((x) => (x.key === p.key ? p : x));
      save();
    },
    async remove(p) {
      const b = bucket(slug);
      b.participants = b.participants.filter((x) => x.key !== p.key);
      save();
    },
    async replaceAll(participants) {
      bucket(slug).participants = participants;
      save();
    },
    async reset() {
      if (slug === GENERAL) {
        db.phase = 'inscription';
        db.participants = [];
      } else {
        delete db.teams[slug];
      }
      save();
    },
  });

  return {
    group: scope,
    groups: {
      async list() {
        return Object.values(db.groups).sort(byCreation);
      },
      async get(slug) {
        return db.groups[slug] || null;
      },
      async add(g) {
        if (db.groups[g.slug]) return false;
        db.groups[g.slug] = g;
        save();
        return true;
      },
      async remove(slug) {
        delete db.groups[slug];
        save();
      },
    },
    names: {
      async get(key) {
        return db.names[key] || null;
      },
      async claim(key, slug) {
        db.names[key] ??= slug;
        save();
        return db.names[key] === slug;
      },
      async release(keys) {
        keys.forEach((k) => delete db.names[k]);
        save();
      },
    },
  };
}

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const store = redisUrl && redisToken ? redisStore(redisUrl, redisToken) : fileStore();
export const storeKind = redisUrl && redisToken ? 'redis' : 'file';
