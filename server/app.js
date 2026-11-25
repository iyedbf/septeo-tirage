import express from 'express';
import crypto from 'node:crypto';
import { store } from './store.js';

const ADMIN_CODE = process.env.ADMIN_CODE || 'septeo2026';
const MIN_PARTICIPANTS = 3;

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

const route = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const requireAdmin = (req, res, next) => {
  if (req.get('x-admin-code') !== ADMIN_CODE) {
    return res.status(401).json({ error: 'Code organisateur invalide.' });
  }
  next();
};

const app = express();

app.use((req, res, next) => (req.body && typeof req.body === 'object' ? next() : express.json()(req, res, next)));

app.get('/api/state', route(async (_req, res) => {
  const [phase, participants] = await Promise.all([store.getPhase(), store.list()]);
  res.json({ phase, minParticipants: MIN_PARTICIPANTS, participants: participants.map(publicParticipant) });
}));

app.post('/api/register', route(async (req, res) => {
  if ((await store.getPhase()) !== 'inscription') {
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
  const salt = crypto.randomBytes(16).toString('hex');
  const participant = {
    id: crypto.randomUUID(),
    key: nameKey(firstName, lastName),
    firstName,
    lastName,
    salt,
    pinHash: hashPin(pin, salt),
    token: crypto.randomBytes(24).toString('hex'),
    receiverId: null,
    drawnAt: null,
    createdAt: new Date().toISOString(),
  };
  if (!(await store.add(participant))) {
    return res.status(409).json({ error: 'Ce collaborateur est déjà inscrit. Connecte-toi avec ton code.' });
  }
  res.status(201).json({ token: participant.token, me: publicParticipant(participant) });
}));

app.post('/api/login', route(async (req, res) => {
  const key = nameKey(req.body.firstName, req.body.lastName);
  const p = (await store.list()).find((x) => x.key === key);
  if (!p || hashPin(req.body.pin, p.salt) !== p.pinHash) {
    return res.status(401).json({ error: 'Nom ou code secret incorrect.' });
  }
  res.json({ token: p.token, me: publicParticipant(p) });
}));

app.get('/api/me', route(async (req, res) => {
  const participants = await store.list();
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
  const [phase, participants] = await Promise.all([store.getPhase(), store.list()]);
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
    await store.update(p);
  }
  res.json({ receiver: { firstName: receiver.firstName, lastName: receiver.lastName } });
}));

app.post('/api/admin/verify', requireAdmin, (_req, res) => res.json({ ok: true }));

app.post('/api/admin/close', requireAdmin, route(async (_req, res) => {
  const [phase, participants] = await Promise.all([store.getPhase(), store.list()]);
  if (phase !== 'inscription') return res.status(409).json({ error: 'Le tirage est déjà ouvert.' });
  if (participants.length < MIN_PARTICIPANTS) {
    return res.status(400).json({ error: `Il faut au moins ${MIN_PARTICIPANTS} participants.` });
  }
  await store.setPhase('fermeture');
  await store.replaceAll(assignReceivers(participants));
  await store.setPhase('tirage');
  res.json({ ok: true });
}));

app.post('/api/admin/reopen', requireAdmin, route(async (_req, res) => {
  const participants = await store.list();
  await store.replaceAll(participants.map((p) => ({ ...p, receiverId: null, drawnAt: null })));
  await store.setPhase('inscription');
  res.json({ ok: true });
}));

app.delete('/api/admin/participants/:id', requireAdmin, route(async (req, res) => {
  if ((await store.getPhase()) !== 'inscription') {
    return res.status(409).json({ error: 'Rouvre les inscriptions avant de retirer un participant.' });
  }
  const p = (await store.list()).find((x) => x.id === req.params.id);
  if (p) await store.remove(p);
  res.json({ ok: true });
}));

app.post('/api/admin/reset', requireAdmin, route(async (_req, res) => {
  await store.reset();
  res.json({ ok: true });
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur, réessaie dans un instant.' });
});

export default app;
