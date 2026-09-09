const fs = require('fs');
const vm = require('vm');
const path = require('path');

const htmlPath = process.argv[2] || path.join(__dirname, 'job-search-dashboard.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('no script block'); process.exit(1); }
let js = m[1];
js = js.replace(/\nload\(\);\s*\nrender\(\);\s*\nwireEvents\(\);\s*\n$/, '\n');

new vm.Script(js);
const sandbox = {};
vm.createContext(sandbox);
try { vm.runInContext('typeof atob', sandbox); } catch (e) {}
if (vm.runInContext('typeof atob', sandbox) === 'undefined') {
  sandbox.atob = s => globalThis.atob(String(s));
  sandbox.escape = s => globalThis.escape(s);
  sandbox.unescape = s => globalThis.unescape(s);
}
vm.runInContext(js, sandbox, { filename: 'jsd.js' });

const parseEML = sandbox.parseEML;
const infoFromMail = sandbox.infoFromMail;
const stageOfMail = sandbox.stageOfMail;
const extractDeadlines = sandbox.extractDeadlines;
const mergeMails = sandbox.mergeMails;
const mergeCsvApps = sandbox.mergeCsvApps;
const csvApps = sandbox.csvApps;
const reset = () => vm.runInContext('state.apps = []; undefined', sandbox);
const getApps = () => vm.runInContext('state.apps', sandbox);

console.log('=== syntax OK, functions loaded ===\n');

const cases = [
  {
    name: '1. ATS rejection (greenhouse subdomain)',
    from: 'no-reply@acme-productivity.us.greenhouse-mail.io',
    subject: 'Update on your application for Senior GTM Strategy Analyst at Acme Productivity',
    body: 'Thank you for your interest in Acme Productivity.\n\nAfter careful review, we have decided not to move forward with your application at this time.\n\nBest regards,\nTalent Acquisition at Acme Productivity'
  },
  {
    name: '2. Direct denial',
    from: 'careers@goldenrodretail.com',
    subject: 'Thank you for your application',
    body: 'Thank you for applying to the Commerciel Finance Analyst position. Unfortunately, we will not be moving forward.'
  },
  {
    name: '3. Workday ATS rejection (no subdomain)',
    from: 'no-reply@myworkdayjobs.com',
    subject: 'Harbor Systems - Application Update',
    body: 'Thank you for applying to Harbor Systems. We regret to inform you that the position has been filled.'
  },
  {
    name: '4. Offer email',
    from: 'priya@empyreancloud.io',
    subject: 'Employee Offer - Empyrean Cloud',
    body: 'Congratulations! We are pleased to extend you an offer for the Business Operations Lead role. Please respond by Friday, June 4.'
  },
  {
    name: '5. Interview scheduling with deadline',
    from: 'recruiting@packratindustries.com',
    subject: 'Interview invitation - Packrat Industries',
    body: 'We would like to schedule a 30 minute video call with the hiring manager on Wednesday, May 27 at 10:30am.'
  },
  {
    name: '6. Multipart MIME base64 export',
    raw: true,
    text: 'From: no-reply@greenhouse.io\r\nTo: jon@work.com\r\n' +
      'Subject: =?UTF-8?Q?Application_update_-_Petrel_Analytics?=\r\n' +
      'Date: Mon, 02 Jun 2025 14:22:00 -0400\r\nMIME-Version: 1.0\r\n' +
      'Content-Type: multipart/alternative; boundary="=_alt1"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n' +
      '--=_alt1\r\nContent-Type: text/plain; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n' +
      'SW1wcmVzc2VkLiBUaGFua3MsIGJ1dCB3ZSBjaG9zZSBhbm90aGVyIGNhbmRpZGF0ZSBmb3IgdGhlIFByaWNpbmcgJiBNYXJnaW4gQW5hbHlzdCByb2xlLg==\r\n\r\n' +
      '--=_alt1--\r\n'
  },
  {
    name: '7. Screening confirmation',
    from: 'hello@ashbyhq.com',
    subject: 'Application confirmed - Brightpath Energy',
    body: 'Your application to Brightpath Energy for the role of Revenue Operations Manager was received and is being reviewed by our team.'
  },
  {
    name: '8. iCIMS piped subject',
    from: 'jobs@woodland-associates.icims.com',
    subject: 'Woodland Associates | Sales Strategy Analyst | Application Status',
    body: 'Your application has been considered. Unfortunately we are not proceeding at this stage.'
  },
  {
    name: '9. Email w/ name display header',
    from: '"Acme Talent Team" <talent@acme-inc.com>',
    subject: 'Interview - Acme Inc',
    body: 'Thanks for chatting with our team about the Senior Pricing Analyst role at Acme Inc. We would love to move you to a final round on Monday.'
  },
  {
    name: '10. Rejection "other candidates"',
    from: 'no-reply@harborline.icims.com',
    subject: 'Update on your application - Deal Desk Analyst',
    body: 'Thank you for your interest in Harborline Software. After careful review, we will move forward with other candidates for the Deal Desk Analyst role.'
  },
  {
    name: '11. Greenhouse generic w/ no company in subject',
    from: 'no-reply@greenhouse.io',
    subject: 'Update on your application',
    body: 'Thank you for applying to the Senior GTM Analyst role at Northwind Trading. Your application has been received and is under review.'
  }
];

const results = [];
cases.forEach(c => {
  const raw = c.raw ? c.text : 'From: ' + c.from + '\r\nSubject: ' + c.subject + '\r\nDate: Mon, 02 Jun 2025 14:22:00 -0400\r\n\r\n' + c.body + '\r\n';
  const e = parseEML(raw);
  const info = infoFromMail(e);
  const stage = stageOfMail(e);
  const dl = extractDeadlines(e);
  reset();
  const added = mergeMails([e]);
  const app = getApps()[0];
  results.push({ name: c.name, info, stage, added, app: app ? {
    company: app.company, role: app.role, source: app.source, stage: app.stage, deadlines: app.deadlines
  } : null, dl });
});

results.forEach(r => {
  console.log('--- ' + r.name);
  console.log('  company  :', r.info.company, ' (domain:', r.info.domain + ')');
  console.log('  role     :', JSON.stringify(r.info.role));
  console.log('  stage    :', r.stage, ' -> app.stage:', r.app ? r.app.stage : '(no app!)');
  console.log('  deadlines:', JSON.stringify(r.dl));
  if (r.app) console.log('  source   :', r.app.source);
  console.log('');
});

console.log('=== CSV import ===');
const csv = 'Company,Job Title,Date Applied,Status\r\nAcme Corp,Senior Analyst,2025-05-01,Rejected\r\nAcme Corp,Senior Analyst,2025-05-10,Rejected\r\nBeta Ltd,Deal Desk Analyst,04/15/2025,Interview\r\n';
const cs = csvApps(csv);
reset();
mergeCsvApps(cs);
console.log('rows:', cs.length, 'apps:', getApps().length);
getApps().forEach(a => console.log(' ', a.company, '|', a.role, '|', a.applied, '|', a.stage));