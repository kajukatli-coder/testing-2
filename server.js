const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use(session({
  secret: 'blacksite-archive-legacy-session-key-2019',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

// ---------- DEMO USER ----------
const USER = {
  email: 'agent.rivera@blacksite.gov',
  password: 'Recover2019!',
  name: 'Agent Rivera',
  role: 'analyst',
  clearance: 'standard' // modern system requires clearance 'restricted' to view purged/top-secret records
};

// ---------- DATA: INCIDENTS ----------
// Visible in the modern archive list:
const VISIBLE_IDS = ['014', '015', '016', '018', '019'];

const incidents = {
  '014': { id: '014', title: 'Substation Grid Intrusion', date: '2018-11-02',
    summary: 'Unauthorized access detected on regional substation control network.',
    body: 'Investigators traced the intrusion to a misconfigured remote maintenance port. Access was revoked and credentials rotated. Case closed, no further action.' },
  '015': { id: '015', title: 'Internal Data Exposure', date: '2019-01-19',
    summary: 'Personnel database briefly exposed via misconfigured backup export.',
    body: 'A routine backup job wrote personnel records to a publicly reachable staging bucket for approximately six hours before discovery. Bucket policy corrected same day.' },
  '016': { id: '016', title: 'Comms Intercept — Node 7', date: '2019-03-08',
    summary: 'Unencrypted field communications intercepted near Node 7 relay.',
    body: 'Field team communications were briefly transmitted without encryption due to a firmware regression. Related Incident: INC-017 (classification restricted — record unavailable in current archive).',
    relatedId: '017' },
  '018': { id: '018', title: 'Facility Lockdown — East Wing', date: '2019-05-22',
    summary: 'East wing facility lockdown triggered by unverified perimeter alert.',
    body: 'A sensor fault triggered an unnecessary lockdown. Procedures were later revised. Previous Incident: INC-017 (see archive for continuity notes).',
    relatedId: '017' },
  '019': { id: '019', title: 'Credential Rotation Failure', date: '2019-09-14',
    summary: 'Scheduled credential rotation job failed silently for three weeks.',
    body: 'A monitoring gap allowed a failed cron job to go unnoticed. Rotation policy since automated with alerting.' },
  // Exists in the system, but not shown in the modern list. Modern detail route
  // treats this as purged/unavailable unless clearance === 'restricted' (nobody has this in the modern system).
  '017': { id: '017', title: 'Incident 017', date: '2019-04-11',
    summary: '[RECORD PURGED]',
    body: 'This record has been purged from the active archive.',
    classification: 'TOP SECRET',
    status: 'PURGED',
    recoveryStatus: 'PARTIAL',
    note: 'Three evidence fragments survived backup shard decay. Fragments must be combined, not read independently.',
    fragments: ['FRAG-7A', 'FRAG-7B', 'FRAG-7C']
  }
};

// ---------- DATA: EVIDENCE FRAGMENTS ----------
// Recovery phrase is never stored in plaintext anywhere reachable by the client.
// FRAG-7C ciphertext = XOR(plaintext, key) where key = "SHADOWNODE"
const RECOVERY_KEY = 'SHADOWNODE';
const RECOVERY_CIPHERTEXT_HEX = '1a06020d0b12001b7474640604120a050a0a0800070d05';
const RECOVERY_PLAINTEXT = 'INCIDENT017NEVERDELETED'; // used only server-side for validation

const fragments = {
  'FRAG-7A': { fragment: 'FRAG-7A', type: 'KEY', content: 'NODE KEY: SHADOWNODE' },
  'FRAG-7B': { fragment: 'FRAG-7B', type: 'METHOD',
    content: 'RECONSTRUCTION METHOD: Take the hex bytes in FRAG-7C. XOR each byte, in order, with the NODE KEY from FRAG-7A (repeat the key as needed). Read the result as ASCII, left to right. Do not reverse or reorder.' },
  'FRAG-7C': { fragment: 'FRAG-7C', type: 'CIPHERTEXT', content: RECOVERY_CIPHERTEXT_HEX }
};

function xorHexWithKey(hex, key) {
  const bytes = Buffer.from(hex, 'hex');
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i] ^ key.charCodeAt(i % key.length));
  }
  return out;
}

const FLAG = 'BREACH{017_nEVERR_dELetEs}';

// ---------- LAYOUT HELPERS ----------
function modernLayout(title, bodyHtml, userEmail) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>${title} — BLACK SITE Archive</title>
  <link rel="icon" type="image/jpeg" href="/favicon.jpg">
  <link rel="shortcut icon" type="image/jpeg" href="/favicon.jpg">
  <link rel="stylesheet" href="/css/modern.css"></head><body>
  <div class="system-status-bar">
    <span class="status-badge live">SYSTEM: DEGRADED</span>
    <span class="status-notice">NOTICE: FACILITY SECTOR 17 DECOMMISSIONED · ARCHIVE MIGRATION INCOMPLETE</span>
  </div>
  <header class="topbar">
    <div class="brand">
      <img src="/favicon.jpg" alt="Logo" class="topbar-logo">
      BLACK SITE <span>Incident Archive v2.3</span>
    </div>
    ${userEmail ? `
    <nav>
      <a href="/dashboard" class="nav-link">INCIDENTS</a>
      <a href="/search" class="nav-link">SEARCH</a>
      <a href="/audit-log" class="nav-link dead-link" title="Audit Log endpoint unreachable">AUDIT LOG [404]</a>
      <span class="user-pill">${userEmail} (Analyst)</span>
      <a href="/logout" class="logout-btn">Log out</a>
    </nav>` : ''}
  </header>
  <main class="content">${bodyHtml}</main>
  <footer class="footer">
    <p>BLACK SITE Incident Management System · Access restricted to authorized personnel · v2.3</p>
    <p class="sub-footer">Node 7 Relay: Offline · Sync Service: Interrupted (Last sync: 2019-09-14)</p>
  </footer>
  </body></html>`;
}

function legacyLayout(title, bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>${title} — BLACK SITE Legacy</title>
  <link rel="icon" type="image/jpeg" href="/favicon.jpg">
  <link rel="shortcut icon" type="image/jpeg" href="/favicon.jpg">
  <link rel="stylesheet" href="/css/legacy.css"></head><body>
  <table class="legacyHeader" width="100%"><tr>
    <td class="legacyTitle">
      <img src="/favicon.jpg" alt="Logo" class="legacy-logo">
      BLACK SITE ARCHIVE SERVICE — LEGACY INTERFACE
    </td>
    <td class="legacyMeta">last build: 2019.03.02 // do not modify</td>
  </tr></table>
  <table class="statusBar" width="100%"><tr>
    <td>Archive&nbsp;Service:&nbsp;<b class="ok">ONLINE</b></td>
    <td>Authentication:&nbsp;<b class="warn">LEGACY</b></td>
    <td>Evidence&nbsp;Service:&nbsp;<b class="unk">UNKNOWN</b></td>
  </tr></table>
  <div class="legacyBody">${bodyHtml}</div>
  <div class="legacyFooter">[this system is scheduled for decommission — migration incomplete]</div>
  </body></html>`;
}

// ---------- AUTH MIDDLEWARE ----------
function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/login');
}

// ---------- MODERN ROUTES ----------
app.get('/', (req, res) => res.redirect(req.session.user ? '/dashboard' : '/login'));

app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.send(modernLayout('Login', `
    <div class="loginBox">
      <div class="loginHeader">
        <h1>Incident Archive Login</h1>
        <p class="hint">Authorized Security Personnel Only</p>
      </div>
      <form method="POST" action="/login">
        <label>Email<input type="text" name="email" placeholder="agent.name@blacksite.gov" autocomplete="off" required></label>
        <label>Password<input type="password" name="password" required></label>
        <button type="submit">Authenticate</button>
      </form>
      ${req.query.error ? '<p class="error">Access Denied: Invalid credentials.</p>' : ''}
    </div>
  `));
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === USER.email && password === USER.password) {
    req.session.user = { email: USER.email, role: USER.role, clearance: USER.clearance };
    return res.redirect('/dashboard');
  }
  res.redirect('/login?error=1');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/dashboard', requireLogin, (req, res) => {
  const rows = VISIBLE_IDS.map(id => {
    const inc = incidents[id];
    return `<tr><td>INC-${inc.id}</td><td><a href="/incident/${inc.id}">${inc.title}</a></td><td>${inc.date}</td><td>${inc.summary}</td></tr>`;
  }).join('');
  res.send(modernLayout('Archive', `
    <div class="dashboard-header">
      <h1>Incident Archive Records</h1>
      <p class="archive-subtitle">Showing active & archived incident files in sequence. [Records Purged: 1]</p>
    </div>
    <table class="archiveTable">
      <thead>
        <tr><th>Case ID</th><th>Title</th><th>Date Recorded</th><th>Summary</th></tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <div class="archive-note">
      <span class="warning-icon">⚠️</span> Note: Incidents marked as Purged or Reclassified do not appear in the active directory index.
    </div>
  `, req.session.user.email));
});

app.get('/search', requireLogin, (req, res) => {
  const q = (req.query.q || '').trim();
  let results = '';
  if (q) {
    const matches = Object.values(incidents).filter(inc =>
      inc.id.includes(q.replace(/\D/g, '')) || inc.title.toLowerCase().includes(q.toLowerCase())
    );
    results = matches.length
      ? matches.map(inc => `<li><a href="/incident/${inc.id}">INC-${inc.id} — ${VISIBLE_IDS.includes(inc.id) ? inc.title : '[preview unavailable]'}</a></li>`).join('')
      : '<li>No matching incident records found.</li>';
  }
  res.send(modernLayout('Search', `
    <h1>Search Incident Archive</h1>
    <div class="search-box-container">
      <form method="GET" action="/search">
        <input type="text" name="q" value="${q}" placeholder="Case number (e.g. 016, 017) or keyword">
        <button type="submit">Execute Query</button>
      </form>
    </div>
    ${q ? `<div class="results-header">Search Results for "${q}":</div><ul class="searchResults">${results}</ul>` : ''}
  `, req.session.user.email));
});

app.get('/incident/:id', requireLogin, (req, res) => {
  const id = req.params.id.replace(/^0+/, '').padStart(3, '0');
  const inc = incidents[id];
  const clearance = req.session.user.clearance;
  const isRestricted = !VISIBLE_IDS.includes(id);
  if (!inc || (isRestricted && clearance !== 'restricted')) {
    return res.status(404).send(modernLayout('Not Found', `
      <div class="error-container">
        <h1>404 — Record Not Found</h1>
        <p class="error-detail">INC-${id} could not be located in the active archive. The record may have been purged or reclassified to restricted clearance.</p>
        <div class="corrupted-media-placeholder">[ATTACHED FILE CORRUPTED / UNREADABLE]</div>
        <p><a href="/dashboard" class="btn-link">&larr; Return to Incident Directory</a></p>
      </div>
    `, req.session.user.email));
  }
  const related = inc.relatedId ? `<p class="related">Related Incident: <a href="/incident/${inc.relatedId}">INC-${inc.relatedId}</a></p>` : '';
  res.send(modernLayout(`INC-${inc.id}`, `
    <div class="incident-detail">
      <div class="incident-meta">
        <h1>INC-${inc.id} — ${inc.title}</h1>
        <span class="date-badge">Date: ${inc.date}</span>
      </div>
      <div class="incident-body">
        <p>${inc.body}</p>
      </div>
      ${related}
      <div class="media-attachment-box">
        <span class="attachment-label">Attached Evidence Media:</span>
        <div class="broken-attachment">⚠️ [ATTACHMENT FILE DECAYED / SECTOR READ ERROR]</div>
      </div>
      <p style="margin-top: 24px;"><a href="/dashboard" class="btn-link">&larr; Return to Incident Directory</a></p>
    </div>
  `, req.session.user.email));
});

app.get('/audit-log', requireLogin, (req, res) => {
  res.status(404).send(modernLayout('Audit Log — Unavailable', `
    <div class="error-container">
      <h1>503 — Service Discontinued</h1>
      <p>Audit Logging Service was retired during the 2019 system decommissioning.</p>
      <p><a href="/dashboard" class="btn-link">&larr; Return to Archive</a></p>
    </div>
  `, req.session.user.email));
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
`User-agent: *
Disallow: /legacy
Disallow: /legacy/api
Disallow: /old-archive
`);
});

// ---------- LEGACY SYSTEM ----------
// Vulnerability: these endpoints only check that a session exists (requireLogin),
// they never check req.session.user.clearance the way /incident/:id does.
app.get('/legacy', requireLogin, (req, res) => {
  res.send(legacyLayout('Legacy Archive Terminal', `
    <h2>Archive Lookup</h2>
    <form id="lookupForm">
      <input type="text" id="lookupId" placeholder="case id, e.g. 014">
      <button type="submit">QUERY</button>
    </form>
    <pre id="lookupResult">&gt; awaiting query...</pre>

    <h2>Recovery Vault</h2>
    <p><a href="/legacy/vault">-&gt; open recovery vault interface</a></p>

    <script>
    document.getElementById('lookupForm').addEventListener('submit', async function(e){
      e.preventDefault();
      const id = document.getElementById('lookupId').value.trim();
      const res = await fetch('/legacy/api/records?id=' + encodeURIComponent(id));
      const data = await res.json();
      document.getElementById('lookupResult').textContent = JSON.stringify(data, null, 2);
    });
    </script>
  `));
});

app.get('/legacy/api/records', requireLogin, (req, res) => {
  const raw = (req.query.id || '').replace(/\D/g, '');
  const id = raw.padStart(3, '0');
  const inc = incidents[id];
  if (!inc) return res.status(404).json({ error: 'no record for id ' + req.query.id });
  // NOTE: no clearance check here (unlike /incident/:id) — this is the flaw.
  if (inc.classification) {
    return res.json({
      id: inc.id, title: inc.title, classification: inc.classification,
      status: inc.status, recoveryStatus: inc.recoveryStatus, note: inc.note,
      fragments: inc.fragments
    });
  }
  return res.json({ id: inc.id, title: inc.title, date: inc.date, summary: inc.summary, body: inc.body });
});

app.get('/legacy/api/evidence', requireLogin, (req, res) => {
  const fragId = (req.query.fragment || '').toUpperCase().trim();
  const frag = fragments[fragId];
  if (!frag) return res.status(404).json({ error: 'unknown fragment id' });
  res.json(frag);
});

app.get('/legacy/vault', requireLogin, (req, res) => {
  res.send(legacyLayout('Recovery Vault', `
    <h2>Archive Recovery Vault</h2>
    <p>Enter reconstructed recovery code to verify evidence integrity.</p>
    <form id="vaultForm">
      <input type="text" id="codeInput" placeholder="RECOVERY CODE">
      <button type="submit">SUBMIT</button>
    </form>
    <pre id="vaultResult">&gt; awaiting submission...</pre>
    <div id="finalArea"></div>
    <script>
    document.getElementById('vaultForm').addEventListener('submit', async function(e){
      e.preventDefault();
      const code = document.getElementById('codeInput').value.trim();
      const r = await fetch('/legacy/api/recovery', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ code })
      });
      const data = await r.json();
      document.getElementById('vaultResult').textContent = JSON.stringify(data, null, 2);
      if (data.success) {
        document.getElementById('finalArea').innerHTML =
          '<button id="finalBtn">ACCESS FINAL EVIDENCE</button><pre id="finalResult"></pre>';
        document.getElementById('finalBtn').addEventListener('click', async function(){
          const fr = await fetch('/legacy/api/final-evidence');
          const fd = await fr.json();
          document.getElementById('finalResult').textContent = JSON.stringify(fd, null, 2);
        });
      }
    });
    </script>
  `));
});

app.post('/legacy/api/recovery', requireLogin, (req, res) => {
  const submitted = String((req.body && req.body.code) || '').toUpperCase().replace(/[\s-]/g, '');
  const expected = RECOVERY_PLAINTEXT; // computed at boot, compared server-side only
  if (submitted === expected) {
    req.session.recovered = true;
    return res.json({ success: true, message: 'ARCHIVE RECOVERY: SUCCESS. INCIDENT 017 VERIFIED. RECONSTRUCTION COMPLETE.' });
  }
  return res.status(400).json({ success: false, message: 'RECOVERY CODE REJECTED.' });
});

app.get('/legacy/api/final-evidence', requireLogin, (req, res) => {
  if (!req.session.recovered) {
    return res.status(403).json({ error: 'Recovery not verified. Reconstruct the evidence fragments first.' });
  }
  res.json({
    caseFile: 'RECOVERED',
    incident: '017',
    status: 'NEVER DELETED',
    flag: FLAG
  });
});

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).send(modernLayout('Not Found', `
    <div class="error-container">
      <h1>404 — Page Not Found</h1>
      <p>The requested route does not exist or has been removed from the archive server.</p>
      <p><a href="/dashboard" class="btn-link">&larr; Return to Archive</a></p>
    </div>
  `, req.session && req.session.user ? req.session.user.email : null));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('BLACKSITE archive running on port ' + PORT));
