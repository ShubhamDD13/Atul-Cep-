const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'jeevan_ankur_secret_key_2026';

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const STATIC_DIR = path.join(__dirname, 'jeevan-ankur-website');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial Database Structure
const initialDb = {
  users: [],
  visits: [],
  contacts: []
};

// Database helper functions
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeDb(initialDb);
      return initialDb;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database:', err);
    return initialDb;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing database:', err);
  }
}

// Seed default users if empty
function seedUsers() {
  const db = readDb();
  let changed = false;

  const founderExists = db.users.find(u => u.email === 'founder@jeevanankur.org' || u.role === 'founder');
  if (!founderExists) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('admin123', salt);
    db.users.push({
      id: 'usr_founder_' + Date.now(),
      name: 'Founder / Administrator',
      email: 'founder@jeevanankur.org',
      phone: '8169615400',
      passwordHash: passwordHash,
      role: 'founder',
      createdAt: new Date().toISOString(),
      lastLogin: null
    });
    changed = true;
  }

  const demoUserExists = db.users.find(u => u.email === 'user@example.com');
  if (!demoUserExists) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('user123', salt);
    db.users.push({
      id: 'usr_user_' + Date.now(),
      name: 'Shubham Dolle',
      email: 'user@example.com',
      phone: '9876543210',
      passwordHash: passwordHash,
      role: 'user',
      createdAt: new Date().toISOString(),
      lastLogin: null
    });
    changed = true;
  }

  if (changed) {
    writeDb(db);
    console.log('Default accounts initialized:');
    console.log(' - Founder: founder@jeevanankur.org / admin123');
    console.log(' - User:    user@example.com / user123');
  }
}

seedUsers();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper: Parse user-agent
function parseUserAgent(ua) {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Desktop' };
  
  let browser = 'Other';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';
  else if (/msie|trident/i.test(ua)) browser = 'IE';

  let os = 'Other';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let device = 'Desktop';
  if (/mobile|android|iphone|ipod/i.test(ua)) device = 'Mobile';
  else if (/ipad|tablet/i.test(ua)) device = 'Tablet';

  return { browser, os, device };
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function requireFounder(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user && req.user.role === 'founder') {
      next();
    } else {
      res.status(403).json({ error: 'Founder / Admin access required' });
    }
  });
}

// ================= API ROUTES =================

// 1. Visitor Tracking Endpoint (Public)
app.post('/api/track', (req, res) => {
  try {
    const { page, referrer, screen, visitorId, userEmail, userId } = req.body;
    const ua = req.headers['user-agent'] || '';
    const { browser, os, device } = parseUserAgent(ua);

    // Get IP
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    if (ip.includes('::ffff:')) ip = ip.replace('::ffff:', '');
    if (ip === '::1') ip = '127.0.0.1';

    const db = readDb();
    const visitRecord = {
      id: 'vst_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      visitorId: visitorId || 'anonymous',
      ip: ip,
      page: page || '/',
      referrer: referrer || 'Direct',
      screen: screen || 'Unknown',
      browser: browser,
      os: os,
      device: device,
      userAgent: ua,
      userEmail: userEmail || null,
      userId: userId || null,
      timestamp: new Date().toISOString()
    };

    db.visits.push(visitRecord);

    // Keep database performant (keep last 5000 visits)
    if (db.visits.length > 5000) {
      db.visits = db.visits.slice(-5000);
    }

    writeDb(db);
    res.json({ success: true, visitId: visitRecord.id });
  } catch (err) {
    console.error('Error tracking visit:', err);
    res.status(500).json({ error: 'Failed to record visit' });
  }
});

// 2. Authentication: Register (Normal Users)
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();

    if (db.users.find(u => u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser = {
      id: 'usr_' + Date.now(),
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      passwordHash: passwordHash,
      role: 'user', // only normal users can self-register
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    db.users.push(newUser);
    writeDb(db);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 3. Authentication: Login (Both User and Founder)
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();

    const user = db.users.find(u => 
      u.email.toLowerCase() === cleanEmail || 
      (u.role === 'founder' && (cleanEmail === 'admin' || cleanEmail === 'founder'))
    );
    if (!user) {
      return res.status(401).json({ error: 'Invalid ID/email or password' });
    }

    const validPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update lastLogin
    user.lastLogin = new Date().toISOString();
    writeDb(db);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role
      }
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 4. Current User Session Check
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    }
  });
});

// 5. Change Password / Update Profile
app.post('/api/auth/update-profile', authenticateToken, (req, res) => {
  try {
    const { name, phone, oldPassword, newPassword } = req.body;
    const db = readDb();
    const user = db.users.find(u => u.id === req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();

    if (newPassword) {
      if (!oldPassword) {
        return res.status(400).json({ error: 'Current password is required to set new password' });
      }
      const validOld = bcrypt.compareSync(oldPassword, user.passwordHash);
      if (!validOld) {
        return res.status(400).json({ error: 'Incorrect current password' });
      }
      const salt = bcrypt.genSaltSync(10);
      user.passwordHash = bcrypt.hashSync(newPassword, salt);
    }

    writeDb(db);
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role
      }
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// 6. Contact message recording
app.post('/api/contact', (req, res) => {
  try {
    const { name, contact, message } = req.body;
    if (!name || !contact || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const db = readDb();
    const contactRecord = {
      id: 'cnt_' + Date.now(),
      name: name.trim(),
      contact: contact.trim(),
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    db.contacts.push(contactRecord);
    writeDb(db);

    res.json({ success: true, message: 'Message received and stored' });
  } catch (err) {
    console.error('Error saving contact:', err);
    res.status(500).json({ error: 'Failed to save contact message' });
  }
});

// 7. Administrative Stats (Founder Only)
app.get('/api/admin/stats', requireFounder, (req, res) => {
  try {
    const db = readDb();
    const visits = db.visits || [];
    const users = db.users || [];
    const contacts = db.contacts || [];

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const totalPageViews = visits.length;
    
    // Unique visitors by visitorId or IP
    const uniqueVisitorIds = new Set(visits.map(v => v.visitorId || v.ip));
    const totalUniqueVisitors = uniqueVisitorIds.size;

    // Today's visits
    const todayVisits = visits.filter(v => (v.timestamp || '').startsWith(todayStr)).length;

    // Devices breakdown
    const devices = { Desktop: 0, Mobile: 0, Tablet: 0, Other: 0 };
    visits.forEach(v => {
      const d = v.device || 'Desktop';
      devices[d] = (devices[d] || 0) + 1;
    });

    // Browsers breakdown
    const browsers = {};
    visits.forEach(v => {
      const b = v.browser || 'Other';
      browsers[b] = (browsers[b] || 0) + 1;
    });

    // Pages breakdown
    const pages = {};
    visits.forEach(v => {
      let p = v.page || '/';
      // Normalize
      p = p.replace(/^\//, '').replace(/\.html$/, '');
      if (!p) p = 'Home';
      else p = p.charAt(0).toUpperCase() + p.slice(1);
      pages[p] = (pages[p] || 0) + 1;
    });

    // Visits over past 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = visits.filter(v => (v.timestamp || '').startsWith(dateStr)).length;
      last7Days.push({
        date: dateStr,
        day: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        count: count
      });
    }

    res.json({
      totalPageViews,
      totalUniqueVisitors,
      todayVisits,
      totalUsers: users.length,
      totalContacts: contacts.length,
      devices,
      browsers,
      pages,
      last7Days
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// 8. Administrative Detailed Visitor Log (Founder Only)
app.get('/api/admin/visitors', requireFounder, (req, res) => {
  try {
    const db = readDb();
    let visits = [...(db.visits || [])].reverse(); // newest first

    const { page, device, search, limit = 100 } = req.query;

    if (page) {
      visits = visits.filter(v => (v.page || '').toLowerCase().includes(page.toLowerCase()));
    }
    if (device) {
      visits = visits.filter(v => (v.device || '').toLowerCase() === device.toLowerCase());
    }
    if (search) {
      const s = search.toLowerCase();
      visits = visits.filter(v => 
        (v.ip || '').toLowerCase().includes(s) ||
        (v.browser || '').toLowerCase().includes(s) ||
        (v.os || '').toLowerCase().includes(s) ||
        (v.page || '').toLowerCase().includes(s) ||
        (v.referrer || '').toLowerCase().includes(s) ||
        (v.userEmail || '').toLowerCase().includes(s)
      );
    }

    const total = visits.length;
    const paginated = visits.slice(0, parseInt(limit, 10));

    res.json({
      total,
      visitors: paginated
    });
  } catch (err) {
    console.error('Error fetching visitor logs:', err);
    res.status(500).json({ error: 'Failed to fetch visitor logs' });
  }
});

// 9. Administrative Registered Users List (Founder Only)
app.get('/api/admin/users', requireFounder, (req, res) => {
  try {
    const db = readDb();
    const users = (db.users || []).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin
    }));
    res.json({ users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 10. Administrative Contacts List (Founder Only)
app.get('/api/admin/contacts', requireFounder, (req, res) => {
  try {
    const db = readDb();
    res.json({ contacts: [...(db.contacts || [])].reverse() });
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// 11. Clear Visitor Logs (Founder Only)
app.delete('/api/admin/visitors', requireFounder, (req, res) => {
  try {
    const db = readDb();
    db.visits = [];
    writeDb(db);
    res.json({ message: 'Visitor logs cleared successfully' });
  } catch (err) {
    console.error('Error clearing visitors:', err);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// Serve frontend static files
app.use(express.static(STATIC_DIR));

// Fallback routing for HTML pages without extension
app.get('/:page', (req, res, next) => {
  const filePath = path.join(STATIC_DIR, req.params.page + '.html');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  next();
});

// Fallback to index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Jeevan Ankur Seva Foundation Server running!`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Administrative Portal: http://localhost:${PORT}/admin.html`);
  console.log(` Login Page:            http://localhost:${PORT}/login.html`);
  console.log(`====================================================`);
});
