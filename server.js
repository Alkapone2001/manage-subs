const express = require('express');
require('dotenv').config();
const path = require('path');
const dayjs = require('dayjs');
const nodemailer = require('nodemailer');
const session = require('express-session');
const { db, init, getSetting, setSetting, getAllSettings } = require('./db');

const app = express();
const port = process.env.PORT || 3000;

init();
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'admin-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 },
}));
app.use(express.static(path.join(__dirname, 'public')));

const adminUser = process.env.ADMIN_USER || 'admin';
const adminPass = process.env.ADMIN_PASS || 'admin123';

const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.status(401).json({ error: 'Nuk është i autorizuar' });
};

app.post('/api/login', (req, res) => {
  const username = (req.body.username || '').trim();
  const password = (req.body.password || '').trim();

  if (username === adminUser && password === adminPass) {
    req.session.authenticated = true;
    return res.json({ authenticated: true });
  }

  res.status(401).json({ error: 'Kredencialet nuk janë të sakta' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ authenticated: false });
  });
});

app.get('/api/auth-status', (req, res) => {
  res.json({ authenticated: !!req.session?.authenticated });
});

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getNotificationWindowDays = (callback) => {
  getSetting('notificationWindowDays', (err, value) => {
    if (err) return callback(err);
    callback(null, parsePositiveInt(value, 7));
  });
};

const getAdminEmail = (callback) => {
  getSetting('adminEmail', (err, value) => {
    if (err) return callback(err);
    callback(null, (value || process.env.ADMIN_EMAIL || '').trim());
  });
};

const getSmtpConfig = () => {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user, pass },
  };
};

const getExpiringQuery = (notificationWindowDays, callback) => {
  const threshold = dayjs().add(notificationWindowDays, 'day').endOf('day').toISOString();
  db.all(
    `SELECT * FROM clients WHERE expiresAt <= ? ORDER BY expiresAt ASC`,
    [threshold],
    callback
  );
};

const createClient = (client, callback) => {
  const registeredAt = dayjs().toISOString();
  const expiresAt = dayjs(registeredAt).add(client.planMonths, 'month').endOf('day').toISOString();

  db.run(
    `INSERT INTO clients (firstName, lastName, birthday, discordTag, phoneNumber, email, registeredAt, planMonths, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [client.firstName, client.lastName, client.birthday, client.discordTag, client.phoneNumber || null, client.email, registeredAt, client.planMonths, expiresAt],
    function (err) {
      if (err) return callback(err);
      callback(null, { id: this.lastID, ...client, registeredAt, expiresAt });
    }
  );
};

const getAllClients = (callback) => {
  db.all(`SELECT * FROM clients ORDER BY expiresAt ASC`, [], callback);
};

const buildNotificationMessage = (clients) => {
  if (clients.length === 0) return null;
  let body = 'The following subscriptions are ending soon:\n\n';
  clients.forEach((client) => {
    const daysLeft = dayjs(client.expiresAt).diff(dayjs(), 'day');
    body += `${client.firstName} ${client.lastName} | ${client.email} | Expires in ${daysLeft} day(s) on ${dayjs(client.expiresAt).format('YYYY-MM-DD')}\n`;
  });
  return body;
};

const sendAdminEmail = async (clients, adminEmail, windowDays) => {
  const smtpConfig = getSmtpConfig();
  if (!smtpConfig || !adminEmail) return;

  const transporter = nodemailer.createTransport(smtpConfig);
  const messageBody = buildNotificationMessage(clients);
  if (!messageBody) return;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || smtpConfig.auth.user,
    to: adminEmail,
    subject: `Subscriptions expiring in ${windowDays} day(s)`,
    text: messageBody,
  });
};

const sendRawEmail = async (to, subject, text) => {
  const smtpConfig = getSmtpConfig();
  if (!smtpConfig || !to) throw new Error('SMTP config or recipient missing');
  const transporter = nodemailer.createTransport(smtpConfig);
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || smtpConfig.auth.user,
    to,
    subject,
    text,
  });
};

// Protected endpoint to trigger a test email to admin
app.post('/api/test-email', requireAuth, async (req, res) => {
  try {
    getAdminEmail(async (err, adminEmail) => {
      if (err) return res.status(500).json({ error: 'Failed to load admin email' });
      if (!adminEmail) return res.status(400).json({ error: 'Admin email not set' });
      try {
        await sendRawEmail(adminEmail, 'Test email from Subscription Manager', 'This is a test email to verify SMTP settings.');
        res.json({ ok: true, to: adminEmail });
      } catch (sendErr) {
        console.error('Test email send failed', sendErr);
        res.status(500).json({ error: 'Failed to send test email', details: String(sendErr) });
      }
    });
  } catch (ex) {
    console.error('Test email endpoint error', ex);
    res.status(500).json({ error: 'Internal error' });
  }
});

const notifyExpiringSubscriptions = () => {
  getNotificationWindowDays((err, windowDays) => {
    if (err) {
      console.error('Notification settings read failed', err);
      return;
    }

    getAdminEmail((err2, adminEmail) => {
      if (err2) {
        console.error('Admin email lookup failed', err2);
        return;
      }

      getExpiringQuery(windowDays, (err3, rows) => {
        if (err3) {
          console.error('Failed to load expiring subscriptions', err3);
          return;
        }
        if (!rows.length) return;

        sendAdminEmail(rows, adminEmail, windowDays).catch((sendErr) => {
          console.error('Error sending notification email', sendErr);
        });

        rows.forEach((client) => {
          db.run(
            `UPDATE clients SET lastNotificationAt = ? WHERE id = ?`,
            [dayjs().toISOString(), client.id],
            (updateErr) => {
              if (updateErr) console.error('Failed to update notification timestamp', updateErr);
            }
          );
        });
      });
    });
  });
};

app.get('/api/clients', requireAuth, (req, res) => {
  getAllClients((err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch clients' });
    res.json(rows);
  });
});

app.post('/api/clients', requireAuth, (req, res) => {
  const client = req.body;
  const required = ['firstName', 'lastName', 'birthday', 'discordTag', 'phoneNumber', 'email', 'planMonths'];
  const missingFields = required.filter((field) => !client[field]);
  if (missingFields.length) {
    return res.status(400).json({ error: `Missing fields: ${missingFields.join(', ')}` });
  }
  if (typeof client.planMonths !== 'number' || client.planMonths <= 0) {
    return res.status(400).json({ error: 'planMonths must be a positive number' });
  }

  createClient(client, (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to create client' });
    res.status(201).json(result);
  });
});

app.delete('/api/clients/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  db.run(`DELETE FROM clients WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete client' });
    if (this.changes === 0) return res.status(404).json({ error: 'Client not found' });
    res.status(204).send();
  });
});

app.patch('/api/clients/:id/extend', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const months = Number(req.body.months);
  if (!Number.isInteger(months) || months <= 0) {
    return res.status(400).json({ error: 'Extend months must be a positive integer' });
  }

  db.get(`SELECT * FROM clients WHERE id = ?`, [id], (err, client) => {
    if (err) return res.status(500).json({ error: 'Failed to load client' });
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const currentExpiry = dayjs(client.expiresAt);
    const startFrom = currentExpiry.isAfter(dayjs()) ? currentExpiry : dayjs();
    const expiresAt = startFrom.add(months, 'month').endOf('day').toISOString();
    const updatedPlanMonths = client.planMonths + months;

    db.run(
      `UPDATE clients SET planMonths = ?, expiresAt = ? WHERE id = ?`,
      [updatedPlanMonths, expiresAt, id],
      function (updateErr) {
        if (updateErr) return res.status(500).json({ error: 'Failed to extend subscription' });
        res.json({ id, planMonths: updatedPlanMonths, expiresAt });
      }
    );
  });
});

app.get('/api/settings', requireAuth, (req, res) => {
  getAllSettings((err, settings) => {
    if (err) return res.status(500).json({ error: 'Failed to load settings' });
    res.json({
      adminEmail: settings.adminEmail || process.env.ADMIN_EMAIL || '',
      notificationWindowDays: parsePositiveInt(settings.notificationWindowDays, 7),
    });
  });
});

app.post('/api/settings', requireAuth, (req, res) => {
  const email = (req.body.adminEmail || '').trim();
  const windowDays = req.body.notificationWindowDays !== undefined ? parsePositiveInt(req.body.notificationWindowDays, null) : null;
  if (!email && windowDays === null) {
    return res.status(400).json({ error: 'Nuk ka asnjë vendosje për të ruajtur' });
  }

  const updateSettings = [];
  const afterUpdate = () => {
    getAllSettings((err, settings) => {
      if (err) return res.status(500).json({ error: 'Failed to load settings' });
      res.json({
        adminEmail: settings.adminEmail || process.env.ADMIN_EMAIL || '',
        notificationWindowDays: parsePositiveInt(settings.notificationWindowDays, 7),
      });
    });
  };

  const saveWindow = () => {
    if (windowDays === null) return afterUpdate();
    setSetting('notificationWindowDays', String(windowDays), (settingsErr) => {
      if (settingsErr) return res.status(500).json({ error: 'Failed to save notification window' });
      afterUpdate();
    });
  };

  if (email) {
    setSetting('adminEmail', email, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to save admin email' });
      saveWindow();
    });
  } else {
    saveWindow();
  }
});

app.get('/api/notifications', requireAuth, (req, res) => {
  getNotificationWindowDays((err, windowDays) => {
    if (err) return res.status(500).json({ error: 'Failed to load notification settings' });
    getExpiringQuery(windowDays, (queryErr, rows) => {
      if (queryErr) return res.status(500).json({ error: 'Failed to load notifications' });
      res.json({ windowDays, items: rows });
    });
  });
});

app.listen(port, () => {
  console.log(`Subscription manager running on http://localhost:${port}`);
  notifyExpiringSubscriptions();
  setInterval(notifyExpiringSubscriptions, 1000 * 60 * 60 * 24);
});
