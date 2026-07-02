const { DateTime } = require('luxon');
const crypto = require('crypto');

function stableId(input) {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// /bookings/lib/utils.js
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNhsNumber() {
  return String(Math.floor(40000000000 + Math.random() * 49999999999));
}

function randomDob(service = '') {
  const now = DateTime.now();
  let minAge = 0;
  let maxAge = 100;

  if (/5-11/.test(service)) { minAge = 5; maxAge = 11; }
  else if (/12-17/.test(service)) { minAge = 12; maxAge = 17; }
  else if (/18-64/.test(service)) { minAge = 18; maxAge = 64; }
  else if (/65\+/.test(service)) { minAge = 65; maxAge = 95; }
  else if (/Adult/.test(service)) { minAge = 18; maxAge = 90; }

  const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
  const dob = now.minus({ years: age, days: Math.floor(Math.random() * 365) });
  return dob.toFormat('yyyy-MM-dd');
}

function generateEmail(name) {
  const domains = [
    'hotmail.com', 'gmail.com', 'yahoo.co.uk', 'icloud.com', 
    'outlook.com', 'btinternet.com', 'aol.com'
  ];
  const base = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .replace(/\s+/g, '.');

  const num = Math.random() > 0.85 ? Math.floor(Math.random() * 99) + 1 : '';
  const domain = domains[Math.floor(Math.random() * domains.length)];

  return `${base}${num}@${domain}`;
}

function randomContact(name) {
  // Rough UK realism probabilities
  const hasMobile = Math.random() < 0.85;    // 85% have a mobile
  const hasEmail = Math.random() < 0.75;     // 75% have an email
  const hasLandline = Math.random() < 0.1;   // 10% have a landline

  const contact = {};

  if (hasMobile) {
    contact.phone = `07${Math.floor(100000000 + Math.random() * 899999999)}`;
  }
  if (hasEmail) {
    contact.email = generateEmail(name);
  }
  if (hasLandline) {
    contact.landline = `01${Math.floor(10000000 + Math.random() * 89999999)}`;
  }
  return contact;
}


module.exports = { clone, randomItem, randomNhsNumber, randomDob, randomContact, stableId, generateEmail };
