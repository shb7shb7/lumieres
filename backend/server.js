const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ── In-memory store (remplacer par une DB en prod) ──────────────────────────
let products = [
  { id: 1, name: 'Vanille Douce', price: 14.90, desc: 'Chaleureuse & enveloppante', category: 'classique', stock: 12, badge: 'bestseller', image: 'https://images.unsplash.com/photo-1602607144451-9d2c38b09485?w=600&q=80' },
  { id: 2, name: 'Lavande Provence', price: 13.50, desc: 'Apaisante, idéale pour la détente', category: 'florale', stock: 8, badge: 'nouveau', image: 'https://images.unsplash.com/photo-1608181831718-c9e24b3b40b8?w=600&q=80' },
  { id: 3, name: 'Forêt Boréale', price: 15.90, desc: 'Bois de cèdre & pin sylvestre', category: 'boisée', stock: 5, badge: null, image: 'https://images.unsplash.com/photo-1636491599977-3e7c40d0a85e?w=600&q=80' },
  { id: 4, name: 'Rose Sauvage', price: 14.90, desc: 'Florale & légèrement sucrée', category: 'florale', stock: 10, badge: 'promo', image: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?w=600&q=80' },
  { id: 5, name: 'Caramel Beurre Salé', price: 16.50, desc: 'Gourmande & réconfortante', category: 'gourmande', stock: 7, badge: null, image: 'https://images.unsplash.com/photo-1603905890679-6a8e4e57a6e0?w=600&q=80' },
  { id: 6, name: 'Mer Bleue', price: 13.90, desc: 'Fraîche, marine & iodée', category: 'fraîche', stock: 9, badge: 'nouveau', image: 'https://images.unsplash.com/photo-1570654621852-9dd25b76ae8c?w=600&q=80' },
  { id: 7, name: 'Ambre & Musc', price: 17.90, desc: 'Sensuelle, profonde & boisée', category: 'classique', stock: 6, badge: null, image: 'https://images.unsplash.com/photo-1543173809-a8c1b3c24a4b?w=600&q=80' },
  { id: 8, name: 'Fleur d\'Oranger', price: 14.50, desc: 'Délicate, lumineuse & solaire', category: 'florale', stock: 11, badge: 'bestseller', image: 'https://images.unsplash.com/photo-1591085686350-798c0f9faa7f?w=600&q=80' },
];

let orders = [
  { id: 1, client: 'Sophie M.', email: 'sophie@ex.fr', phone: '06 12 34 56 78', productId: 1, productName: 'Vanille Douce', qty: 2, total: 29.80, message: '', status: 'nouvelle', createdAt: new Date('2025-05-01') },
  { id: 2, client: 'Jean-Pierre L.', email: 'jp@ex.fr', phone: '07 98 76 54 32', productId: 2, productName: 'Lavande Provence', qty: 1, total: 13.50, message: 'Emballage cadeau svp', status: 'en_preparation', createdAt: new Date('2025-05-03') },
  { id: 3, client: 'Camille R.', email: 'cam@ex.fr', phone: '06 11 22 33 44', productId: 4, productName: 'Rose Sauvage', qty: 3, total: 40.23, message: '', status: 'expediee', createdAt: new Date('2025-05-05') },
];

let nextOrderId = 4;
let nextProductId = 7;

// Admin credentials (mot de passe hashé en prod)
const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@lumieres.fr',
  passwordHash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin1234', 10),
};

// ── Middleware auth ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non autorisé' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (email !== ADMIN.email || !bcrypt.compareSync(password, ADMIN.passwordHash)) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// ── Produits (public GET, auth pour le reste) ────────────────────────────────
app.get('/api/products', (req, res) => res.json(products));

app.post('/api/products', requireAuth, (req, res) => {
  const p = { ...req.body, id: nextProductId++, stock: req.body.stock || 0 };
  products.push(p);
  res.status(201).json(p);
});

app.put('/api/products/:id', requireAuth, (req, res) => {
  const idx = products.findIndex(p => p.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Produit introuvable' });
  products[idx] = { ...products[idx], ...req.body };
  res.json(products[idx]);
});

app.delete('/api/products/:id', requireAuth, (req, res) => {
  products = products.filter(p => p.id !== +req.params.id);
  res.json({ ok: true });
});

// ── Commandes (POST public, GET/PUT admin) ───────────────────────────────────
app.post('/api/orders', (req, res) => {
  const { client, email, phone, productId, qty, message } = req.body;
  const product = products.find(p => p.id === +productId);
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });
  if (product.stock < qty) return res.status(400).json({ error: 'Stock insuffisant' });

  const order = {
    id: nextOrderId++,
    client, email, phone,
    productId: product.id,
    productName: product.name,
    qty: +qty,
    total: +(product.price * qty).toFixed(2),
    message: message || '',
    status: 'nouvelle',
    createdAt: new Date(),
  };
  orders.push(order);
  product.stock -= +qty;
  res.status(201).json(order);
});

app.get('/api/orders', requireAuth, (req, res) => {
  res.json([...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.put('/api/orders/:id/status', requireAuth, (req, res) => {
  const order = orders.find(o => o.id === +req.params.id);
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  order.status = req.body.status;
  res.json(order);
});

// ── Stats admin ──────────────────────────────────────────────────────────────
app.get('/api/stats', requireAuth, (req, res) => {
  const now = new Date();
  const thisMonth = orders.filter(o => {
    const d = new Date(o.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  res.json({
    totalOrders: orders.length,
    monthRevenue: thisMonth.reduce((s, o) => s + o.total, 0).toFixed(2),
    pendingOrders: orders.filter(o => o.status === 'nouvelle').length,
    totalProducts: products.length,
  });
});

app.get('/', (req, res) => res.json({ status: 'Lumières API en ligne ✓' }));

app.listen(PORT, () => console.log(`Lumières API démarrée sur le port ${PORT}`));
