import express from 'express';
import crypto from 'node:crypto';
import { GENERAL, store, storeKind } from './store.js';

const ADMIN_CODE = process.env.ADMIN_CODE || 'septeo2026';
const MIN_PARTICIPANTS = 3;
const GENERAL_NAME = 'Tirage général';

const hashPin = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString('hex');
const normalize = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
const nameKey = (firstName, lastName) => `${normalize(firstName)}|${normalize(lastName)}`;
const clean = (s) => String(s || '').trim().replace(/\s+/g, ' ').slice(0, 40);
const slugify = (s) =>
  normalize(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);

const publicParticipant = (p) => ({
  id: p.id,
  firstName: p.firstName,
  lastName: p.lastName,
  hasDrawn: Boolean(p.drawnAt),
});

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A single random cycle guarantees nobody gets themselves and everyone gives exactly one gift.
function assignReceivers(participants) {
  const order = shuffle(participants);
  return order.map((p, i) => ({ ...p, receiverId: order[(i + 1) % order.length].id, drawnAt: null }));
}

// Participants registered before the name index existed belong to the general draw.
let indexReady;
const ensureNameIndex = () => {
  indexReady ??= store
    .group(GENERAL)
    .list()
    .then((list) => Promise.all(list.map((p) => store.names.claim(p.key, GENERAL))))
    .catch((err) => {
      indexReady = undefined;
      throw err;
    });
  return indexReady;
};

const groupName = async (slug) => (slug === GENERAL ? GENERAL_NAME : (await store.groups.get(slug))?.name || slug);

const route = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const app = express();

app.use((req, res, next) => (req.body && typeof req.body === 'object' ? next() : express.json()(req, res, next)));

app.use('/api', route(async (req, res, next) => {
  await ensureNameIndex();
  const slug = slugify(req.get('x-group')) || GENERAL;
  if (slug === GENERAL) {
    req.group = { slug: GENERAL, name: GENERAL_NAME };
  } else {
    const group = await store.groups.get(slug);
    if (!group) return res.status(404).json({ error: 'Ce lien de tirage n’existe pas ou a été supprimé.' });
    req.group = group;
  }
  req.draw = store.group(req.group.slug);
  next();
}));

const requireAdmin = (req, res, next) => {
  const code = req.get('x-admin-code') || '';
  if (code === ADMIN_CODE) {
    req.role = 'super';
    return next();
  }
  const g = req.group;
  if (g.slug !== GENERAL && g.codeHash && hashPin(code, g.salt) === g.codeHash) {
    req.role = 'manager';
    return next();
  }
  res.status(401).json({ error: 'Code organisateur invalide.' });
};

const requireSuperAdmin = (req, res, next) => {
  if (req.get('x-admin-code') !== ADMIN_CODE) {
    return res.status(401).json({ error: 'Réservé à l’administrateur principal.' });
  }
  next();
};

app.get('/api/state', route(async (req, res) => {
  const [phase, participants] = await Promise.all([req.draw.getPhase(), req.draw.list()]);
  res.json({
    group: { slug: req.group.slug, name: req.group.name },
    phase,
    storage: storeKind,
    minParticipants: MIN_PARTICIPANTS,
    count: participants.length,
    drawnCount: participants.filter((p) => p.drawnAt).length,
  });
}));

app.post('/api/register', route(async (req, res) => {
  if ((await req.draw.getPhase()) !== 'inscription') {
    return res.status(409).json({ error: 'Les inscriptions sont clôturées.' });
  }
  const firstName = clean(req.body.firstName);
  const lastName = clean(req.body.lastName);
  const pin = String(req.body.pin || '');
  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'Merci de saisir ton prénom et ton nom.' });
  }
  if (!/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'Le code secret doit contenir 4 chiffres.' });
  }
  const key = nameKey(firstName, lastName);
  if (!(await store.names.claim(key, req.group.slug))) {
    const other = await groupName(await store.names.get(key));
    return res.status(409).json({
      error: `Tu es déjà inscrit(e) dans « ${other} ». Chaque collaborateur ne participe qu’à un seul tirage.`,
    });
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const participant = {
    id: crypto.randomUUID(),
    key,
    firstName,
    lastName,
    salt,
    pinHash: hashPin(pin, salt),
    token: crypto.randomBytes(24).toString('hex'),
    receiverId: null,
    drawnAt: null,
    createdAt: new Date().toISOString(),
  };
  if (!(await req.draw.add(participant))) {
    return res.status(409).json({ error: 'Ce collaborateur est déjà inscrit. Connecte-toi avec ton code.' });
  }
  res.status(201).json({ token: participant.token, me: publicParticipant(participant) });
}));

app.post('/api/login', route(async (req, res) => {
  const key = nameKey(req.body.firstName, req.body.lastName);
  const p = (await req.draw.list()).find((x) => x.key === key);
  if (p && hashPin(req.body.pin, p.salt) === p.pinHash) {
    return res.json({ token: p.token, me: publicParticipant(p) });
  }
  const otherSlug = await store.names.get(key);
  if (otherSlug && otherSlug !== req.group.slug) {
    const other = (await store.group(otherSlug).list()).find((x) => x.key === key);
    if (other && hashPin(req.body.pin, other.salt) === other.pinHash) {
      return res.status(409).json({
        error: `Tu es inscrit(e) dans « ${await groupName(otherSlug)} ». Utilise le lien de ce tirage pour te connecter.`,
      });
    }
  }
  res.status(401).json({ error: 'Nom ou code secret incorrect.' });
}));

app.get('/api/me', route(async (req, res) => {
  const participants = await req.draw.list();
  const token = req.get('x-token');
  const p = token && participants.find((x) => x.token === token);
  if (!p) return res.status(401).json({ error: 'Session inconnue.' });
  const receiver = p.drawnAt ? participants.find((r) => r.id === p.receiverId) : null;
  res.json({
    me: publicParticipant(p),
    receiver: receiver ? { firstName: receiver.firstName, lastName: receiver.lastName } : null,
  });
}));

app.post('/api/draw', route(async (req, res) => {
  const [phase, participants] = await Promise.all([req.draw.getPhase(), req.draw.list()]);
  const token = req.get('x-token');
  const p = token && participants.find((x) => x.token === token);
  if (!p) return res.status(401).json({ error: 'Session inconnue.' });
  if (phase !== 'tirage') {
    return res.status(409).json({ error: "Le tirage n'est pas encore ouvert." });
  }
  const receiver = participants.find((r) => r.id === p.receiverId);
  if (!receiver) return res.status(500).json({ error: 'Tirage introuvable, contacte l’organisateur.' });
  if (!p.drawnAt) {
    p.drawnAt = new Date().toISOString();
    await req.draw.update(p);
  }
  res.json({ receiver: { firstName: receiver.firstName, lastName: receiver.lastName } });
}));

app.post('/api/admin/verify', requireAdmin, (req, res) => res.json({ ok: true, role: req.role }));

app.get('/api/admin/participants', requireAdmin, route(async (req, res) => {
  res.json({ participants: (await req.draw.list()).map(publicParticipant) });
}));

app.post('/api/admin/close', requireAdmin, route(async (req, res) => {
  const [phase, participants] = await Promise.all([req.draw.getPhase(), req.draw.list()]);
  if (phase !== 'inscription') return res.status(409).json({ error: 'Le tirage est déjà ouvert.' });
  if (participants.length < MIN_PARTICIPANTS) {
    return res.status(400).json({ error: `Il faut au moins ${MIN_PARTICIPANTS} participants.` });
  }
  await req.draw.setPhase('fermeture');
  await req.draw.replaceAll(assignReceivers(participants));
  await req.draw.setPhase('tirage');
  res.json({ ok: true });
}));

app.post('/api/admin/reopen', requireAdmin, route(async (req, res) => {
  const participants = await req.draw.list();
  await req.draw.replaceAll(participants.map((p) => ({ ...p, receiverId: null, drawnAt: null })));
  await req.draw.setPhase('inscription');
  res.json({ ok: true });
}));

app.delete('/api/admin/participants/:id', requireAdmin, route(async (req, res) => {
  if ((await req.draw.getPhase()) !== 'inscription') {
    return res.status(409).json({ error: 'Rouvre les inscriptions avant de retirer un participant.' });
  }
  const p = (await req.draw.list()).find((x) => x.id === req.params.id);
  if (p) {
    await req.draw.remove(p);
    await store.names.release([p.key]);
  }
  res.json({ ok: true });
}));

async function wipe(slug) {
  const draw = store.group(slug);
  await store.names.release((await draw.list()).map((p) => p.key));
  await draw.reset();
}

app.post('/api/admin/reset', requireAdmin, route(async (req, res) => {
  await wipe(req.group.slug);
  res.json({ ok: true });
}));

app.get('/api/admin/groups', requireSuperAdmin, route(async (_req, res) => {
  const groups = await store.groups.list();
  const details = await Promise.all(
    groups.map(async (g) => {
      const draw = store.group(g.slug);
      const [phase, participants] = await Promise.all([draw.getPhase(), draw.list()]);
      return {
        slug: g.slug,
        name: g.name,
        phase,
        count: participants.length,
        drawnCount: participants.filter((p) => p.drawnAt).length,
      };
    }),
  );
  res.json({ groups: details });
}));

app.post('/api/admin/groups', requireSuperAdmin, route(async (req, res) => {
  const name = clean(req.body.name);
  const code = String(req.body.code || '').trim();
  const slug = slugify(name);
  if (!name || !slug) return res.status(400).json({ error: 'Merci de donner un nom à l’équipe.' });
  if (slug === GENERAL) return res.status(400).json({ error: 'Ce nom est réservé, choisis-en un autre.' });
  if (code.length < 4) return res.status(400).json({ error: 'Le code du manager doit contenir au moins 4 caractères.' });
  if (code === ADMIN_CODE) return res.status(400).json({ error: 'Le code du manager doit être différent du tien.' });
  const salt = crypto.randomBytes(16).toString('hex');
  const created = await store.groups.add({
    slug,
    name,
    salt,
    codeHash: hashPin(code, salt),
    createdAt: new Date().toISOString(),
  });
  if (!created) return res.status(409).json({ error: 'Une équipe avec ce nom existe déjà.' });
  res.status(201).json({ group: { slug, name } });
}));

app.delete('/api/admin/groups/:slug', requireSuperAdmin, route(async (req, res) => {
  const slug = slugify(req.params.slug);
  if (!slug || slug === GENERAL) return res.status(400).json({ error: 'Impossible de supprimer le tirage général.' });
  await wipe(slug);
  await store.groups.remove(slug);
  res.json({ ok: true });
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur, réessaie dans un instant.' });
});

export default app;
