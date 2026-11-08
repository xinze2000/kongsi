/* Kongsi - shared-expense app with Firebase cloud sync & offline PWA support. Vanilla JS, no build step. */
(function () {
  'use strict';

  const STORE_KEY = 'kongsi.v1';
  let ME = 'me';
  const CUR = {
    MYR: { sym: 'RM', dec: 2, rate: 1 },
    JPY: { sym: '¥', dec: 0, rate: 0.03 },
    SGD: { sym: 'S$', dec: 2, rate: 3.3 },
    USD: { sym: 'US$', dec: 2, rate: 4.2 },
    EUR: { sym: '€', dec: 2, rate: 4.6 },
    THB: { sym: 'B', dec: 2, rate: 0.13 }
  };
  const COLORS = ['#4F46E5', '#E8590C', '#0E9F6E', '#D6336C', '#1C7ED6', '#F08C00', '#7048E8', '#0C8599'];
  const EMOJIS = ['✈️', '🏠', '🍎', '🍕', '🍻', '🚗', '🛒', '💼', '🍱', '🏖️', '🎳', '☕'];
  
  const viewEl = document.querySelector('#view');
  const tabbarEl = document.querySelector('#tabbar');
  const overlayEl = document.querySelector('#overlay');
  const toastEl = document.querySelector('#toast');

  const uid = (prefix = 'id') => `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36).slice(-4)}`;
  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromISO = (iso) => {
    const [y, m, d] = String(iso || '').split('-').map(Number);
    return new Date(y || 2000, (m || 1) - 1, d || 1);
  };
  const todayISO = () => toISO(new Date());
  const addDays = (iso, days) => {
    const d = fromISO(iso);
    d.setDate(d.getDate() + days);
    return toISO(d);
  };
  const addMonths = (iso, months) => {
    const d = fromISO(iso);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, maxDay));
    return toISO(d);
  };
  const addInterval = (iso, freq) => {
    if (freq === 'weekly') return addDays(iso, 7);
    if (freq === 'yearly') return addMonths(iso, 12);
    return addMonths(iso, 1);
  };
  const fmtDate = (iso) => fromISO(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const FREQ_LABEL = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
  const FREQ_UNIT = { weekly: 'week', monthly: 'month', yearly: 'year' };

  const parseNum = (value) => {
    const num = Number(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(num) ? num : 0;
  };
  const toMinor = (value, currency = 'MYR') => {
    const cur = CUR[currency] || CUR.MYR;
    return Math.round(parseNum(value) * (10 ** cur.dec) + 1e-9);
  };
  const toBaseMinor = (value, currency = 'MYR') => {
    const cur = CUR[currency] || CUR.MYR;
    const rate = cur.rate || 1;
    return Math.round(parseNum(value) * rate * 100);
  };
  const sourceMinorToBaseMinor = (minor, currency = 'MYR') => {
    const cur = CUR[currency] || CUR.MYR;
    return Math.round((Number(minor) || 0) / (10 ** cur.dec) * (cur.rate || 1) * 100);
  };
  const money = (minor, currency = 'MYR') => {
    const cur = CUR[currency] || CUR.MYR;
    const abs = Math.abs(minor) / (10 ** cur.dec);
    const s = abs.toLocaleString('en-MY', { minimumFractionDigits: cur.dec, maximumFractionDigits: cur.dec });
    const sign = minor < 0 ? '-' : '';
    return `${sign}${cur.sym}${s}`;
  };
  const rm = (minor) => money(minor, 'MYR');

  const defaultState = () => {
    const today = todayISO();
    const d = (days) => addDays(today, -days);
    const all = [
      { id: 'me', name: 'You', color: COLORS[0] },
      { id: 'alex', name: 'Alex', color: COLORS[1] },
      { id: 'sarah', name: 'Sarah', color: COLORS[2] },
      { id: 'mei', name: 'Mei', color: COLORS[3] }
    ];
    const groups = [
      { id: 'g-japan', name: 'Japan Trip', emoji: '✈️', members: ['me', 'alex', 'sarah'], createdAt: Date.now() - 1000 * 60 * 60 * 24 * 40 },
      { id: 'g-house', name: 'Housemates', emoji: '🏠', members: ['me', 'alex', 'mei'], createdAt: Date.now() - 1000 * 60 * 60 * 24 * 80 },
      { id: 'g-lunch', name: 'Office Lunch', emoji: '🍱', members: ['me', 'sarah', 'mei'], createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20 }
    ];
    const expenses = [
      { id: 'e-dinner', groupId: 'g-japan', desc: 'Dinner at Jalan Alor', amount: 12000, currency: 'MYR', method: 'percent', date: today, payer: 'me', participants: ['me', 'alex', 'sarah'], percent: { me: 50, alex: 25, sarah: 25 }, createdAt: Date.now() - 1000 * 60 * 60 * 3 },
      { id: 'e-condo', groupId: 'g-house', desc: 'Condo utilities', amount: 21050, currency: 'MYR', method: 'equal', date: d(3), payer: 'mei', participants: ['me', 'alex', 'mei'], createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2 },
      { id: 'e-groc', groupId: 'g-house', desc: 'Groceries', amount: 8640, currency: 'MYR', method: 'equal', date: d(4), payer: 'alex', participants: ['me', 'alex', 'mei'], createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3 },
      { id: 'e-lunch', groupId: 'g-lunch', desc: 'Nasi kandar lunch', amount: 4800, currency: 'MYR', method: 'exact', date: d(8), payer: 'sarah', participants: ['me', 'sarah', 'mei'], exact: { me: 1500, sarah: 1800, mei: 1500 }, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7 }
    ];
    const settlements = [
      { id: 's-1', from: 'alex', to: 'me', amount: 3500, date: d(1), alloc: [{ groupId: 'g-japan', amount: 3500 }], createdAt: Date.now() - 1000 * 60 * 60 * 24 * 1 }
    ];
    const activity = [
      { id: 'a-1', type: 'group_created', ts: Date.now() - 1000 * 60 * 60 * 24 * 60, actor: 'me', groupId: 'g-japan' },
      { id: 'a-2', type: 'expense_added', ts: Date.now() - 1000 * 60 * 60 * 24 * 8, actor: 'me', expenseId: 'e-dinner', desc: 'Dinner at Jalan Alor', amount: 12000, cur: 'MYR', payer: 'me', groupId: 'g-japan' },
      { id: 'a-3', type: 'payment', ts: Date.now() - 1000 * 60 * 60 * 24 * 1, actor: 'alex', from: 'alex', to: 'me', amount: 3500, groupId: 'g-japan' }
    ];
    return { people: all, groups, expenses, settlements, activity };
  };

  let state = loadState();
  const ui = {
    tab: 'home',
    stack: [],
    sheet: null,
    modal: null,
    ballab: 'people'
  };
  let draft = null;
  let toastTimer = null;

  // Firebase integration state
  let isFirebaseConfigured = false;
  let auth = null;
  let db = null;
  let currentFirebaseUser = null;
  let firestoreListeners = [];

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return parsed && parsed.people ? parsed : defaultState();
    } catch (error) {
      return defaultState();
    }
  }

  function saveState() {
    if (!currentFirebaseUser) {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
      } catch (error) {}
    }
  }

  function toast(message, error = false) {
    toastEl.textContent = message;
    toastEl.className = `toast show${error ? ' err' : ''}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  function person(id) {
    if (id === ME && currentFirebaseUser) {
      const found = state.people.find((p) => p.id === id);
      return found || { id: ME, name: currentFirebaseUser.displayName || currentFirebaseUser.email.split('@')[0], color: COLORS[0] };
    }
    return state.people.find((p) => p.id === id) || { id, name: id ? (id.length > 8 ? id.slice(0, 6) : id) : 'Unknown', color: '#999' };
  }

  function group(id) {
    return state.groups.find((g) => g.id === id) || null;
  }

  function expense(id) {
    return state.expenses.find((e) => e.id === id) || null;
  }

  function nm(id, lower = false) {
    if (id === ME) return lower ? 'you' : 'You';
    return person(id).name;
  }

  function initials(name) {
    return String(name || '').trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U';
  }

  function parseGroups() {
    return state.groups.map((g) => ({ ...g, net: groupNet(g.id) }));
  }

  function getMemberIds(groupId) {
    const g = group(groupId);
    return g ? g.members : [];
  }

  function expenseBaseMinor(expenseItem) {
    if (!expenseItem) return 0;
    return sourceMinorToBaseMinor(expenseItem.amount, expenseItem.currency || 'MYR');
  }

  function distribute(total, participants, weights) {
    const out = {};
    if (!participants.length) return out;
    const weightTotal = participants.reduce((sum, personId) => sum + (Number(weights?.[personId]) || 0), 0);
    if (!(weightTotal > 0)) return out;
    const rows = participants.map((personId, index) => {
      const raw = total * (Number(weights?.[personId]) || 0) / weightTotal;
      return { personId, index, value: Math.floor(raw), remainder: raw - Math.floor(raw) };
    });
    let remainder = total - rows.reduce((sum, row) => sum + row.value, 0);
    rows.sort((a, b) => b.remainder - a.remainder || a.index - b.index).forEach((row) => {
      if (remainder > 0) {
        row.value += 1;
        remainder -= 1;
      }
    });
    rows.forEach((row) => { out[row.personId] = row.value; });
    return out;
  }

  function sourceShares(expenseItem) {
    const participants = expenseItem.participants || [];
    const total = expenseItem.amount || 0;
    if (expenseItem.method === 'exact') {
      return Object.fromEntries(participants.map((personId) => [personId, Number(expenseItem.exact?.[personId]) || 0]));
    }
    if (expenseItem.method === 'percent') return distribute(total, participants, expenseItem.percent);
    return distribute(total, participants, Object.fromEntries(participants.map((personId) => [personId, 1])));
  }

  function shares(expenseItem) {
    return Object.fromEntries(Object.entries(sourceShares(expenseItem)).map(([personId, amount]) => [
      personId,
      sourceMinorToBaseMinor(amount, expenseItem.currency || 'MYR')
    ]));
  }

  function baseShares(expenseItem) {
    return shares(expenseItem);
  }

  function ledger(filterGroupId = null) {
    const balances = {};
    const add = (from, to, amount) => {
      if (!from || !to || !amount) return;
      if (!balances[from]) balances[from] = {};
      if (!balances[to]) balances[to] = {};
      balances[from][to] = (balances[from][to] || 0) + amount;
      balances[to][from] = (balances[to][from] || 0) - amount;
    };

    state.expenses.forEach((exp) => {
      if (filterGroupId && exp.groupId !== filterGroupId) return;
      const sh = baseShares(exp);
      for (const pid of (exp.participants || [])) {
        if (pid === exp.payer || !sh[pid]) continue;
        add(exp.payer, pid, sh[pid]);
      }
    });

    state.settlements.forEach((settle) => {
      const groupAmount = filterGroupId ? (settle.alloc || []).find((x) => x.groupId === filterGroupId)?.amount : settle.amount;
      if (filterGroupId && groupAmount == null && settle.groupId !== filterGroupId) return;
      const amount = filterGroupId ? (groupAmount || (settle.groupId === filterGroupId ? settle.amount : 0)) : settle.amount;
      if (amount) add(settle.from, settle.to, amount);
    });

    return balances;
  }

  function pairBal(a, b, filter = null) {
    const balances = ledger(filter);
    return (balances[a] && balances[a][b]) || 0;
  }

  function myTotals() {
    const row = ledger()[ME] || {};
    let owed = 0;
    let owe = 0;
    Object.keys(row).forEach((key) => {
      const value = row[key];
      if (value > 0) owed += value;
      if (value < 0) owe += -value;
    });
    return { owed, owe, net: owed - owe };
  }

  function groupNet(groupId, personId = ME) {
    const balances = ledger(groupId);
    const row = balances[personId] || {};
    return Object.keys(row).reduce((sum, key) => sum + row[key], 0);
  }

  function groupNets(groupId) {
    const balances = ledger(groupId);
    const out = {};
    const g = group(groupId);
    if (!g) return out;
    (g.members || []).forEach((member) => {
      const row = balances[member] || {};
      out[member] = Object.keys(row).reduce((sum, key) => sum + row[key], 0);
    });
    return out;
  }

  function simplify(groupItem) {
    const nets = groupNets(groupItem.id);
    const positive = [];
    const negative = [];
    for (const [member, value] of Object.entries(nets)) {
      if (value > 0) positive.push([member, value]);
      if (value < 0) negative.push([member, -value]);
    }
    const steps = [];
    while (positive.length && negative.length) {
      positive.sort((a, b) => b[1] - a[1]);
      negative.sort((a, b) => b[1] - a[1]);
      const pay = Math.min(positive[0][1], negative[0][1]);
      steps.push({ from: negative[0][0], to: positive[0][0], amount: pay, groupId: groupItem.id });
      positive[0][1] -= pay;
      negative[0][1] -= pay;
      if (positive[0][1] <= 0) positive.shift();
      if (negative[0][1] <= 0) negative.shift();
    }
    return steps;
  }

  function balClass(value) {
    if (value > 0) return 'pos';
    if (value < 0) return 'neg';
    return 'zero';
  }

  function balLabel(value) {
    if (value > 0) return `you are owed ${rm(value)}`;
    if (value < 0) return `you owe ${rm(-value)}`;
    return 'settled up';
  }

  function avatar(id, cls = '') {
    const p = person(id);
    return `<span class="avatar ${cls}" style="background:${p.color || '#4F46E5'}">${esc(initials(p.name))}</span>`;
  }

  function tileMarkup(groupItem, cls = '') {
    return `<span class="tile ${cls}" style="background:${groupItem.color || '#ECEBFE'}">${groupItem.emoji || '🏷️'}</span>`;
  }

  function emptyBlock(emoji, title, subtitle) {
    return `<div class="empty"><div class="class-big">${emoji}</div><b>${esc(title)}</b><p style="margin-top:4px">${esc(subtitle)}</p></div>`;
  }

  function backBar(title, right = '') {
    return `
      <div class="topbar">
        <button class="back" data-action="back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"></path></svg><span>Back</span></button>
        <b>${esc(title)}</b>
        <span style="min-width:72px;text-align:right">${right}</span>
      </div>
    `;
  }

  function renderTabbar() {
    const items = [
      { key: 'home', label: 'Home', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9.5L12 3l9 6.5"></path><path d="M5 10v9h14v-9"></path></svg>' },
      { key: 'groups', label: 'Groups', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path><path d="M15 12a2.5 2.5 0 1 0 0-5"></path><path d="M3 19a6 6 0 0 1 12 0"></path><path d="M18 19a5 5 0 0 1 4-4.9"></path></svg>' },
      { key: 'activity', label: 'Activity', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"></circle><path d="M12 7v5l4 2"></path></svg>' },
      { key: 'balances', label: 'Balances', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 18h16"></path><path d="M7 15V8"></path><path d="M12 15V5"></path><path d="M17 15v-9"></path></svg>' }
    ];

    const html = items.map((item) => `
      <button class="tab ${ui.tab === item.key ? 'on' : ''}" data-action="tab" data-tab="${item.key}">
        ${item.icon}
        <span>${item.label}</span>
      </button>
    `).join('');

    tabbarEl.innerHTML = `
      <button class="tab-add" data-action="add-expense" aria-label="Add expense">${I.plus}</button>
      ${html}
    `;
  }

  const I = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .63 1.7 1.7 0 0 0-.4 1.12V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1-.63 1.7 1.7 0 0 0-1.12.4l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.63-1 1.7 1.7 0 0 0-1.12-.4H2.76a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0 .63-1 1.7 1.7 0 0 0-.4-1.12l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.63 1.7 1.7 0 0 0 .4-1.12V2.76a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1 .63 1.7 1.7 0 0 0 1.12-.4l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.26.26.6.4 1 .4h.09a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z"></path></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 10h18"></path></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5 5L20 2"></path></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"></path></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M9 6V4h6v2"></path></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
  };

  function activityTitle(item) {
    switch (item.type) {
      case 'expense_added': return `${esc(item.desc || 'Expense')} added`;
      case 'expense_edited': return `${esc(item.desc || 'Expense')} updated`;
      case 'expense_deleted': return `${esc(item.desc || 'Expense')} deleted`;
      case 'payment': return `${nm(item.from)} paid ${nm(item.to)}`;
      case 'group_created': return 'Group created';
      case 'recurring_created': return 'Recurring expense created';
      default: return item.type;
    }
  }

  function activityRow(item) {
    let right = '';
    const time = dayLabel(item.ts);

    if (item.type === 'expense_added' || item.type === 'expense_edited' || item.type === 'expense_deleted') {
      const exp = expense(item.expenseId);
      const base = exp ? exp.amount : item.amount || 0;
      const cur = exp ? (exp.currency || 'MYR') : (item.cur || 'MYR');
      right = `<b>${money(base, cur)}</b>`;
    } else if (item.type === 'payment') {
      right = `<b>${rm(item.amount)}</b>`;
    }

    return `
      <div class="row">
        <span class="tile">${item.type === 'payment' ? '💸' : item.type === 'group_created' ? '👥' : '🧾'}</span>
        <div class="grow">
          <div class="t">${activityTitle(item)}</div>
          <div class="s">${esc(nm(item.actor))} · ${time}</div>
        </div>
        <div class="amt">${right}</div>
      </div>
    `;
  }

  function dayLabel(ts) {
    const d = new Date(ts);
    const iso = toISO(d);
    const today = todayISO();
    if (iso === today) return 'Today';
    if (iso === addDays(today, -1)) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderHome() {
    const totals = myTotals();
    const recent = [...state.activity].sort((a, b) => b.ts - a.ts).slice(0, 5);
    const groupsMarkup = state.groups.map((g) => {
      const net = groupNet(g.id);
      return `
        <button class="row tappable" data-action="open-group" data-id="${g.id}">
          <span class="tile">${g.emoji || '👥'}</span>
          <div class="grow">
            <div class="t">${esc(g.name)}</div>
            <div class="s">${(g.members || []).length} members · ${state.expenses.filter((e) => e.groupId === g.id).length} expenses</div>
          </div>
          <div class="amt">
            <b class="${balClass(net)}">${rm(Math.abs(net))}</b>
            <small>${net > 0 ? 'you are owed' : net < 0 ? 'you owe' : 'settled'}</small>
          </div>
        </button>
      `;
    }).join('') || emptyBlock('🏠', 'No groups yet', 'Create one for a trip, housemates, or friends.');

    const friendsMarkup = state.people.filter((p) => p.id !== ME).map((personItem) => {
      const value = pairBal(ME, personItem.id, null);
      return `
        <button class="row tappable" data-action="open-person" data-id="${personItem.id}">
          ${avatar(personItem.id)}
          <div class="grow">
            <div class="t">${esc(personItem.name)}</div>
            <div class="s">${value > 0 ? `${esc(personItem.name)} owes you` : value < 0 ? `You owe ${esc(personItem.name)}` : 'Settled up'}</div>
          </div>
          <div class="amt">
            <b class="${balClass(value)}">${rm(Math.abs(value))}</b>
          </div>
        </button>
      `;
    }).join('');

    const cloudPill = isFirebaseConfigured && currentFirebaseUser
      ? `<span class="cloud-pill" data-action="settings"><span class="cloud-dot online"></span>${esc(currentFirebaseUser.displayName || 'Online')}</span>`
      : `<span class="cloud-pill" data-action="settings"><span class="cloud-dot"></span>${isFirebaseConfigured ? 'Sign in' : 'Demo Mode'}</span>`;

    return `
      <div class="topbar">
        <div class="brand">
          <div class="brand-mark"><svg viewBox="0 0 34 34" width="34" height="34"><path d="M13 9a8 8 0 0 0 0 16h8a8 8 0 0 1 0-16h-8zm5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z" fill="#fff"></path></svg></div>
          <span class="brand-name">Kongsi</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          ${cloudPill}
          <button class="iconbtn" data-action="settings" aria-label="Settings">${I.gear}</button>
        </div>
      </div>

      <div class="hero">
        <div class="lbl">Your overall balance</div>
        <div class="big">${rm(Math.abs(totals.net))}</div>
        <div class="palp">
          <div class="bchip"><small><span class="dot" style="background:#6EE7B7"></span>You are owed</small><b>${rm(totals.owed)}</b></div>
          <div class="bchip"><small><span class="dot" style="background:#FDB474"></span>You owe</small><b>${rm(totals.owe)}</b></div>
        </div>
      </div>

      <div style="margin-top:14px"><button class="btn" data-action="add-expense">${I.plus}Add expense</button></div>

      <div class="section">
        <div class="section-h">
          <h2>Recent activity</h2>
          <button class="link" data-action="tab" data-tab="activity">See all</button>
        </div>
        <div class="card flush">${recent.length ? recent.map(activityRow).join('') : emptyBlock('📭', 'No activity yet', 'Add an expense to start tracking.')}</div>
      </div>

      <div class="section">
        <div class="section-h">
          <h2>Groups</h2>
          <button class="link" data-action="new-group">New group</button>
        </div>
        <div class="card flush">${groupsMarkup}</div>
      </div>

      <div class="section">
        <div class="section-h"><h2>Friends</h2></div>
        <div class="card flush">${friendsMarkup || emptyBlock('👥', 'No friends yet', 'Add an expense or invite friends to a group.')}</div>
      </div>
    `;
  }

  function renderGroups() {
    const cards = state.groups.map((g) => {
      const net = groupNet(g.id);
      return `
        <button class="card flush" data-action="open-group" data-id="${g.id}" style="display:block;width:100%;text-align:left;padding:16px;margin-top:10px;">
          <div style="display:flex;gap:12px;align-items:center;">
            <span class="tile lg">${g.emoji || '👥'}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:18px;">${esc(g.name)}</div>
              <div style="margin-top:6px;color:var(--ink-2);font-size:13px;">${(g.members || []).length} members</div>
            </div>
            <div style="text-align:right;">
              <div class="${balClass(net)}" style="font-weight:700;">${rm(Math.abs(net))}</div>
              <small>${net > 0 ? 'You are owed' : net < 0 ? 'You owe' : 'Settled up'}</small>
            </div>
          </div>
        </button>
      `;
    }).join('');

    return `${backBar('Groups', '<button class="btn sm" data-action="new-group">New group</button>')}<div style="margin-top:14px">${cards || emptyBlock('🏠', 'No groups yet', 'Tap to create your first group.')}</div>`;
  }

  function renderBalances() {
    const peopleList = state.people.filter((p) => p.id !== ME).map((p) => {
      const val = pairBal(ME, p.id);
      return `
        <div class="row">
          ${avatar(p.id)}
          <div class="grow">
            <div class="t">${esc(p.name)}</div>
            <div class="s">${balLabel(val)}</div>
          </div>
          <div class="amt">
            <b class="${balClass(val)}">${rm(Math.abs(val))}</b>
            ${val !== 0 ? `<button class="btn sm secondary" data-action="settle-person" data-id="${p.id}" style="margin-top:4px;">Settle</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      ${backBar('Balances')}
      <div class="section" style="margin-top:14px;">
        <div class="card flush">${peopleList || emptyBlock('⚖️', 'All settled up', 'No outstanding balances.')}</div>
      </div>
    `;
  }

  function renderActivity() {
    const list = [...state.activity].sort((a, b) => b.ts - a.ts);
    return `${backBar('Activity')}<div style="margin-top:14px" class="card flush">${list.length ? list.map(activityRow).join('') : emptyBlock('📭', 'No activity yet', 'Expenses and payments will appear here.')}</div>`;
  }

  function renderGroup(groupId) {
    const g = group(groupId);
    if (!g) return backBar('Group') + emptyBlock('💬', 'Group not found', 'It may have been removed.');

    const net = groupNet(groupId);
    const nets = groupNets(groupId);
    const simplified = simplify(g);
    const expensesInGroup = state.expenses.filter((exp) => exp.groupId === groupId).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const memberCards = (g.members || []).map((memberId) => `
      <div class="row">
        ${avatar(memberId)}
        <div class="grow">
          <div class="t">${esc(memberId === ME ? 'You' : person(memberId).name)}</div>
          <div class="s">${balLabel(nets[memberId] || 0)}</div>
        </div>
        <div class="amt"><b class="${balClass(nets[memberId] || 0)}">${rm(Math.abs(nets[memberId] || 0))}</b></div>
      </div>
    `).join('');

    const simpleCards = simplified.length ? simplified.map((step) => `
      <div class="row">
        ${avatar(step.from)}
        <div class="grow">
          <div class="t">${esc(nm(step.from, true))} pays ${esc(nm(step.to))}</div>
          <div class="s">${esc(g.name)}</div>
        </div>
        <div class="amt">
          <b>${rm(step.amount)}</b>
          ${step.from === ME ? `<button class="btn sm" data-action="settle-person" data-id="${step.to}" style="margin-top:4px;">Pay</button>` : ''}
        </div>
      </div>
    `).join('') : emptyBlock('✅', 'No pending transfers', 'Balances in this group are settled.');

    const expenseCards = expensesInGroup.length ? expensesInGroup.map((exp) => `
      <button class="row tappable" data-action="open-expense" data-id="${exp.id}">
        <span class="tile">${exp.desc.toLowerCase().includes('dinner') || exp.desc.toLowerCase().includes('lunch') ? '🍽️' : '🧾'}</span>
        <div class="grow">
          <div class="t">${esc(exp.desc)}</div>
          <div class="s">${esc(nm(exp.payer))} paid ${money(exp.amount, exp.currency || 'MYR')} · ${fmtDate(exp.date)}</div>
        </div>
        <div class="amt"><b>${money(exp.amount, exp.currency || 'MYR')}</b></div>
      </button>
    `).join('') : emptyBlock('🧾', 'No expenses yet', 'Tap Add below to split your first bill in this group.');

    return `
      ${backBar(g.name, `<button class="btn sm secondary" data-action="invite-group" data-id="${g.id}">+ Invite</button>`)}
      <div class="card" style="margin-top:14px;padding:20px;text-align:center;">
        <div style="display:flex;align-items:center;justify-content:center;gap:12px;">
          <span class="tile lg">${g.emoji || '👥'}</span>
        </div>
        <h2 style="margin-top:12px;font-size:24px;">${esc(g.name)}</h2>
        <div style="margin-top:8px;color:var(--ink-2);">${(g.members || []).length} members</div>
        <div class="section-h" style="margin-top:14px;justify-content:center;">
          <div class="${balClass(net)}" style="font-size:28px;font-weight:800;">${rm(Math.abs(net))}</div>
        </div>
        <div class="btn-row" style="margin-top:16px;display:flex;gap:10px;justify-content:center;">
          <button class="btn sm" data-action="add-expense">${I.plus}Add expense</button>
          <button class="btn sm secondary" data-action="invite-group" data-id="${g.id}">Share invite link</button>
        </div>
      </div>

      <div class="section">
        <div class="section-h"><h2>Balances</h2></div>
        <div class="card flush">${memberCards}</div>
      </div>

      <div class="section">
        <div class="section-h"><h2>Simplified payments</h2></div>
        <div class="card flush">${simpleCards}</div>
      </div>

      <div class="section">
        <div class="section-h"><h2>Expenses</h2></div>
        <div class="card flush">${expenseCards}</div>
      </div>
    `;
  }

  function renderPerson(personId) {
    const p = person(personId);
    const bal = pairBal(ME, personId);
    const relatedExpenses = state.expenses.filter((e) => (e.payer === personId && (e.participants || []).includes(ME)) || (e.payer === ME && (e.participants || []).includes(personId)));

    return `
      ${backBar(p.name)}
      <div class="card" style="margin-top:14px;padding:20px;text-align:center;">
        ${avatar(personId, 'lg')}
        <h2 style="margin-top:12px;font-size:24px;">${esc(p.name)}</h2>
        <div class="${balClass(bal)}" style="font-size:28px;font-weight:800;margin-top:12px;">${rm(Math.abs(bal))}</div>
        <div style="color:var(--ink-2);margin-top:4px;">${balLabel(bal)}</div>
        ${bal !== 0 ? `<div style="margin-top:16px;"><button class="btn" data-action="settle-person" data-id="${personId}">Settle Up</button></div>` : ''}
      </div>

      <div class="section">
        <div class="section-h"><h2>Shared Expenses</h2></div>
        <div class="card flush">
          ${relatedExpenses.map((exp) => `
            <button class="row tappable" data-action="open-expense" data-id="${exp.id}">
              <span class="tile">🧾</span>
              <div class="grow">
                <div class="t">${esc(exp.desc)}</div>
                <div class="s">${esc(nm(exp.payer))} paid · ${fmtDate(exp.date)}</div>
              </div>
              <div class="amt"><b>${money(exp.amount, exp.currency || 'MYR')}</b></div>
            </button>
          `).join('') || emptyBlock('🤝', 'No shared expenses', 'Expenses between you and this person will appear here.')}
        </div>
      </div>
    `;
  }

  function renderExpense(expenseId) {
    const exp = expense(expenseId);
    if (!exp) return backBar('Expense') + emptyBlock('🧾', 'Expense not found', 'It may have been removed.');

    const g = group(exp.groupId);
    const sh = shares(exp);
    const sourceSh = sourceShares(exp);

    return `
      ${backBar(exp.desc, `<button class="iconbtn" data-action="edit-expense" data-id="${exp.id}">${I.edit}</button><button class="iconbtn" data-action="delete-expense" data-id="${exp.id}">${I.trash}</button>`)}
      <div class="card" style="margin-top:14px;padding:20px;text-align:center;">
        <span class="tile lg">🧾</span>
        <h2 style="margin-top:12px;font-size:22px;">${esc(exp.desc)}</h2>
        <div style="font-size:32px;font-weight:800;color:var(--brand);margin-top:8px;">${money(exp.amount, exp.currency || 'MYR')}</div>
        <div style="color:var(--ink-2);margin-top:6px;">Paid by <b>${esc(nm(exp.payer))}</b> on ${fmtDate(exp.date)}</div>
        ${g ? `<div style="margin-top:6px;"><span class="chip on">${g.emoji || '👥'} ${esc(g.name)}</span></div>` : ''}
      </div>

      <div class="section">
        <div class="section-h"><h2>Split breakdown</h2></div>
        <div class="card flush">
          ${(exp.participants || []).map((pid) => `
            <div class="row">
              ${avatar(pid)}
              <div class="grow"><div class="t">${esc(pid === ME ? 'You' : person(pid).name)}</div></div>
              <div class="amt"><b>${money(sourceSh[pid] || 0, exp.currency || 'MYR')}</b></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderCurrentView() {
    if (ui.stack.length > 0) {
      const current = ui.stack[ui.stack.length - 1];
      if (current.type === 'group') {
        viewEl.innerHTML = renderGroup(current.id);
        return;
      }
      if (current.type === 'person') {
        viewEl.innerHTML = renderPerson(current.id);
        return;
      }
      if (current.type === 'expense') {
        viewEl.innerHTML = renderExpense(current.id);
        return;
      }
    }

    if (ui.tab === 'home') viewEl.innerHTML = renderHome();
    else if (ui.tab === 'groups') viewEl.innerHTML = renderGroups();
    else if (ui.tab === 'activity') viewEl.innerHTML = renderActivity();
    else if (ui.tab === 'balances') viewEl.innerHTML = renderBalances();
  }

  function render() {
    renderCurrentView();
    renderTabbar();
  }

  function pushView(type, id) {
    ui.stack.push({ type, id });
    render();
  }

  function popView() {
    ui.stack.pop();
    render();
  }

  function newDraft(groupId = null) {
    const defaultGroup = (groupId && group(groupId)) || state.groups[0] || { id: 'g-default', members: [ME] };
    const members = defaultGroup.members || [ME];
    return {
      id: null,
      desc: '',
      amount: '',
      currency: 'MYR',
      date: todayISO(),
      groupId: defaultGroup.id,
      payer: members.includes(ME) ? ME : members[0],
      participants: [...members],
      method: 'equal',
      percent: {},
      exact: {},
      autoExact: true,
      autoPercent: true,
      recurring: null,
      error: null
    };
  }

  function minorInputValue(minor, currency) {
    const decimals = (CUR[currency] || CUR.MYR).dec;
    return (minor / (10 ** decimals)).toFixed(decimals);
  }

  function prefillDraftSplit(method = draft?.method) {
    if (!draft || !draft.participants.length) return;
    const weights = Object.fromEntries(draft.participants.map((personId) => [personId, 1]));
    if (method === 'exact' && draft.autoExact) {
      const amounts = distribute(toMinor(draft.amount, draft.currency), draft.participants, weights);
      draft.exact = Object.fromEntries(draft.participants.map((personId) => [
        personId,
        minorInputValue(amounts[personId] || 0, draft.currency)
      ]));
    }
    if (method === 'percent' && draft.autoPercent) {
      const percentages = distribute(10000, draft.participants, weights);
      draft.percent = Object.fromEntries(draft.participants.map((personId) => [
        personId,
        String((percentages[personId] || 0) / 100)
      ]));
    }
  }

  function draftSplitShares() {
    const participants = draft?.participants || [];
    const total = toMinor(draft?.amount, draft?.currency);
    if (!participants.length) return {};
    if (draft.method === 'equal') {
      return distribute(total, participants, Object.fromEntries(participants.map((personId) => [personId, 1])));
    }
    if (draft.method === 'exact') {
      return Object.fromEntries(participants.map((personId) => [personId, toMinor(draft.exact[personId], draft.currency)]));
    }
    return Object.fromEntries(participants.map((personId) => [
      personId,
      Math.round(total * parseNum(draft.percent[personId]) / 100)
    ]));
  }

  function draftSplitPreviewHtml() {
    const shares = draftSplitShares();
    const participants = draft?.participants || [];
    const total = toMinor(draft?.amount, draft?.currency);
    const allocated = Object.values(shares).reduce((sum, value) => sum + value, 0);
    const percentage = participants.reduce((sum, personId) => sum + parseNum(draft?.percent[personId]), 0);
    const summary = draft?.method === 'exact'
      ? `${money(allocated, draft.currency)} of ${money(total, draft.currency)} assigned`
      : draft?.method === 'percent'
        ? `${percentage}% assigned · ${money(allocated, draft.currency)}`
        : `${money(total, draft.currency)} split equally`;

    return `
      ${participants.map((personId) => `
        <div class="row split-preview-row">
          ${avatar(personId, 'sm')}
          <div class="grow"><div class="t">${esc(personId === ME ? 'You' : person(personId).name)}</div></div>
          <div class="amt"><b>${money(shares[personId] || 0, draft.currency)}</b></div>
        </div>
      `).join('')}
      <div class="split-preview-total ${allocated === total ? 'ok' : 'warn'}">${esc(summary)}</div>
    `;
  }

  function updateDraftSplitPreview() {
    const preview = overlayEl.querySelector('[data-split-preview]');
    if (preview) preview.innerHTML = draftSplitPreviewHtml();
  }

  function makeExpenseFormHtml(animate = true) {
    if (!draft) return '';
    const g = group(draft.groupId) || state.groups[0] || { id: 'g-default', members: [ME] };
    const memberButtons = (g.members || []).map((memberId) => `
      <button class="chip ${draft.participants.includes(memberId) ? 'on' : ''}" data-action="toggle-participant" data-id="${memberId}">
        ${avatar(memberId, 'sm')} ${esc(memberId === ME ? 'You' : person(memberId).name)}
      </button>
    `).join('');

    return `
      <div class="sheet${animate ? '' : ' still'}">
        <div class="grab"></div>
        <div class="fm-head">
          <button class="txt" data-action="close-modal">Cancel</button>
          <h2>${draft.id ? 'Edit expense' : 'Add expense'}</h2>
          <span></span>
        </div>
        <div class="fm-body" style="padding:14px 0;">
          <div class="field">
            <label>Description</label>
            <input class="input" data-field="desc" value="${esc(draft.desc)}" placeholder="Dinner, groceries, trip, etc." />
          </div>

          <div class="field amount-wrap">
            <label>Amount</label>
            <div style="display:flex;align-items:center;gap:10px;">
              <input class="input amt" data-field="amount" value="${esc(draft.amount)}" inputmode="decimal" placeholder="0.00" />
              <select class="input" data-field="currency">
                ${Object.keys(CUR).map((key) => `<option value="${key}" ${key === draft.currency ? 'selected' : ''}>${key}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="field">
            <label>Group</label>
            <div class="chips">
              ${state.groups.map((item) => `
                <button class="chip ${item.id === draft.groupId ? 'on' : ''}" data-action="pick-group" data-id="${item.id}">${item.emoji || '👥'} ${esc(item.name)}</button>
              `).join('')}
            </div>
          </div>

          <div class="field">
            <label>Paid by</label>
            <div class="chips">
              ${(g.members || []).map((memberId) => `
                <button class="chip ${draft.payer === memberId ? 'on' : ''}" data-action="pick-payer" data-id="${memberId}">${avatar(memberId, 'sm')} ${esc(memberId === ME ? 'You' : person(memberId).name)}</button>
              `).join('')}
            </div>
          </div>

          <div class="field">
            <label>Participants</label>
            <div class="chips">${memberButtons}</div>
          </div>

          <div class="field">
            <label>Split method</label>
            <div class="seg">
              <button class="${draft.method === 'equal' ? 'on' : ''}" data-action="set-method" data-method="equal">Equal</button>
              <button class="${draft.method === 'exact' ? 'on' : ''}" data-action="set-method" data-method="exact">Exact</button>
              <button class="${draft.method === 'percent' ? 'on' : ''}" data-action="set-method" data-method="percent">Percent</button>
            </div>
          </div>

          <div class="field">
            <label>Split preview</label>
            <div class="card flush split-preview" data-split-preview>${draftSplitPreviewHtml()}</div>
          </div>

          <div class="field">
            <label>Date</label>
            <input class="input" type="date" data-field="date" value="${draft.date}" />
          </div>

          ${draft.method === 'exact' ? `
            <div class="field">
              <label>Exact amounts</label>
              <div class="card flush">
                ${draft.participants.map((memberId) => `
                  <div class="row">
                    ${avatar(memberId)}
                    <div class="grow"><div class="t">${esc(memberId === ME ? 'You' : person(memberId).name)}</div></div>
                    <input class="input" data-field="exact" data-member="${memberId}" value="${esc(draft.exact[memberId] ?? '')}" style="max-width:110px;" />
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${draft.method === 'percent' ? `
            <div class="field">
              <label>Percentages</label>
              <div class="card flush">
                ${draft.participants.map((memberId) => `
                  <div class="row">
                    ${avatar(memberId)}
                    <div class="grow"><div class="t">${esc(memberId === ME ? 'You' : person(memberId).name)}</div></div>
                    <input class="input" data-field="percent" data-member="${memberId}" value="${esc(draft.percent[memberId] ?? '')}" style="max-width:110px;" />
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="field" style="margin-top:20px;">
            <button class="btn" data-action="save-expense">${draft.id ? 'Save changes' : 'Save expense'}</button>
          </div>
        </div>
      </div>
    `;
  }

  function openModal(animate = true) {
    if (!ui.modal) {
      overlayEl.innerHTML = '';
      return;
    }
    overlayEl.innerHTML = `<div class="scrim${animate ? '' : ' still'}" data-action="close-modal"></div>${makeExpenseFormHtml(animate)}`;
  }

  function closeModal() {
    ui.modal = false;
    draft = null;
    overlayEl.innerHTML = '';
  }

  function setDraftFromExpense(item) {
    draft = {
      id: item.id,
      desc: item.desc,
      amount: String((item.amount || 0) / (10 ** (CUR[item.currency || 'MYR'] || CUR.MYR).dec)),
      currency: item.currency || 'MYR',
      date: item.date,
      groupId: item.groupId,
      payer: item.payer,
      participants: [...(item.participants || [])],
      method: item.method || 'equal',
      percent: { ...(item.percent || {}) },
      exact: Object.fromEntries(Object.entries(item.exact || {}).map(([personId, amount]) => [
        personId,
        String((Number(amount) || 0) / (10 ** (CUR[item.currency || 'MYR'] || CUR.MYR).dec))
      ])),
      autoExact: false,
      autoPercent: false,
      recurring: item.recurring || null,
      error: null
    };
  }

  async function saveExpense() {
    if (!draft) return;
    const groupId = draft.groupId || state.groups[0]?.id;
    const g = group(groupId);
    if (!g) {
      toast('Create a group before adding an expense', true);
      return;
    }

    const amount = toMinor(draft.amount, draft.currency);
    if (!draft.desc.trim() || !amount) {
      toast('Add a description and an amount greater than zero', true);
      return;
    }
    if (!draft.participants.length) {
      toast('Choose at least one participant', true);
      return;
    }

    const exact = Object.fromEntries(draft.participants.map((personId) => [personId, toMinor(draft.exact[personId] || 0, draft.currency)]));
    const percent = Object.fromEntries(draft.participants.map((personId) => [personId, parseNum(draft.percent[personId])]));
    if (draft.method === 'exact' && Object.values(exact).reduce((sum, value) => sum + value, 0) !== amount) {
      toast('Exact amounts must add up to the total', true);
      return;
    }
    if (draft.method === 'percent' && Math.abs(Object.values(percent).reduce((sum, value) => sum + value, 0) - 100) > 0.000001) {
      toast('Percentages must add up to 100%', true);
      return;
    }

    const expenseItem = {
      id: draft.id || uid('exp'),
      groupId,
      desc: draft.desc.trim(),
      amount,
      currency: draft.currency,
      method: draft.method,
      date: draft.date || todayISO(),
      payer: draft.payer,
      participants: draft.participants,
      percent: draft.method === 'percent' ? percent : {},
      exact: draft.method === 'exact' ? exact : {},
      createdAt: Date.now()
    };

    if (isFirebaseConfigured && currentFirebaseUser && db) {
      try {
        await db.collection('groups').doc(groupId).collection('expenses').doc(expenseItem.id).set(expenseItem);
        await db.collection('groups').doc(groupId).collection('activity').doc(uid('act')).set({
          id: uid('act'),
          type: draft.id ? 'expense_edited' : 'expense_added',
          ts: Date.now(),
          actor: ME,
          expenseId: expenseItem.id,
          desc: expenseItem.desc,
          amount: expenseItem.amount,
          cur: expenseItem.currency,
          payer: expenseItem.payer,
          groupId
        });
        toast(draft.id ? 'Expense updated' : 'Expense saved');
      } catch (err) {
        console.error('Firestore save expense error:', err);
        toast(`Error saving to cloud: ${err.message}`, true);
      }
    } else {
      const existingIndex = state.expenses.findIndex((e) => e.id === expenseItem.id);
      if (existingIndex >= 0) {
        state.expenses[existingIndex] = expenseItem;
        state.activity.push({ id: uid('act'), type: 'expense_edited', ts: Date.now(), actor: ME, expenseId: expenseItem.id, desc: expenseItem.desc, amount: expenseItem.amount, cur: expenseItem.currency, payer: expenseItem.payer, groupId: expenseItem.groupId });
        toast('Expense updated');
      } else {
        state.expenses.push(expenseItem);
        state.activity.push({ id: uid('act'), type: 'expense_added', ts: Date.now(), actor: ME, expenseId: expenseItem.id, desc: expenseItem.desc, amount: expenseItem.amount, cur: expenseItem.currency, payer: expenseItem.payer, groupId: expenseItem.groupId });
        toast('Expense saved');
      }
      saveState();
    }

    closeModal();
    render();
  }

  async function doDeleteExpense(id) {
    const item = expense(id);
    if (!item) return;

    if (isFirebaseConfigured && currentFirebaseUser && db) {
      try {
        await db.collection('groups').doc(item.groupId).collection('expenses').doc(id).delete();
        await db.collection('groups').doc(item.groupId).collection('activity').doc(uid('act')).set({
          id: uid('act'),
          type: 'expense_deleted',
          ts: Date.now(),
          actor: ME,
          expenseId: id,
          desc: item.desc,
          amount: item.amount,
          cur: item.currency,
          payer: item.payer,
          groupId: item.groupId
        });
        toast('Expense deleted');
      } catch (err) {
        toast(`Error: ${err.message}`, true);
      }
    } else {
      state.expenses = state.expenses.filter((e) => e.id !== id);
      state.activity.push({ id: uid('act'), type: 'expense_deleted', ts: Date.now(), actor: ME, expenseId: id, desc: item.desc, amount: item.amount, cur: item.currency, payer: item.payer, groupId: item.groupId });
      saveState();
      toast('Expense deleted');
    }
    popView();
    render();
  }

  async function newGroup() {
    const name = window.prompt('Group name (e.g. Vacation, Housemates, Trip)');
    if (!name || !name.trim()) return;
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const id = uid('g');
    const newG = { id, name: name.trim(), emoji, members: [ME], createdBy: ME, createdAt: Date.now() };

    if (isFirebaseConfigured && currentFirebaseUser && db) {
      try {
        await db.collection('groups').doc(id).set(newG);
        await db.collection('groups').doc(id).collection('activity').doc(uid('act')).set({
          id: uid('act'),
          type: 'group_created',
          ts: Date.now(),
          actor: ME,
          groupId: id
        });
        toast('Group created');
      } catch (err) {
        toast(`Error creating group: ${err.message}`, true);
      }
    } else {
      state.groups.push(newG);
      state.activity.push({ id: uid('act'), type: 'group_created', ts: Date.now(), actor: ME, groupId: id });
      saveState();
      toast('Group created');
      render();
    }
  }

  function openInviteSheet(groupId) {
    const g = group(groupId);
    if (!g) return;
    const inviteUrl = `${window.location.origin}${window.location.pathname}?join=${groupId}`;

    overlayEl.innerHTML = `
      <div class="scrim" data-action="close-modal"></div>
      <div class="sheet">
        <div class="grab"></div>
        <div class="fm-head">
          <button class="txt" data-action="close-modal">Done</button>
          <h2>Invite to ${esc(g.name)}</h2>
          <span></span>
        </div>
        <div style="padding:16px 0;">
          <div class="invite-card">
            <b>Share link with friends</b>
            <p style="margin-top:6px;font-size:13px;color:var(--ink-2);">Friends who open this link can join this group and split bills instantly:</p>
            <div class="invite-code-row">
              <input class="input" id="invite-link-val" value="${esc(inviteUrl)}" readonly />
              <button class="btn sm" data-action="copy-invite" data-url="${esc(inviteUrl)}">Copy</button>
            </div>
          </div>

          <div style="margin-top:20px;">
            <label style="font-size:13px;font-weight:700;color:var(--ink-2);text-transform:uppercase;">Or add member by email</label>
            <div style="display:flex;gap:8px;margin-top:8px;">
              <input class="input" id="invite-email-input" type="email" placeholder="friend@example.com" />
              <button class="btn sm" data-action="add-member-email" data-group="${g.id}">Add</button>
            </div>
          </div>

          <div style="margin-top:24px;">
            <label style="font-size:13px;font-weight:700;color:var(--ink-2);text-transform:uppercase;">Current Members (${(g.members || []).length})</label>
            <div class="card flush" style="margin-top:8px;">
              ${(g.members || []).map((mid) => `
                <div class="row">
                  ${avatar(mid)}
                  <div class="grow"><div class="t">${esc(mid === ME ? 'You' : person(mid).name)}</div></div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function openSettingsSheet() {
    const isCloud = isFirebaseConfigured && currentFirebaseUser;
    const email = currentFirebaseUser ? currentFirebaseUser.email : 'Local Guest';
    const name = currentFirebaseUser ? (currentFirebaseUser.displayName || 'You') : 'XinZe (Demo)';

    overlayEl.innerHTML = `
      <div class="scrim" data-action="close-modal"></div>
      <div class="sheet">
        <div class="grab"></div>
        <div class="fm-head">
          <button class="txt" data-action="close-modal">Done</button>
          <h2>Account & Settings</h2>
          <span></span>
        </div>
        <div style="padding:14px 0;">
          <div class="card flush" style="padding:16px;text-align:center;">
            <div style="margin:0 auto 10px;">${avatar(ME, 'lg')}</div>
            <div style="font-weight:700;font-size:18px;">${esc(name)}</div>
            <div style="color:var(--ink-2);font-size:13px;margin-top:4px;">${esc(email)}</div>
            <div style="margin-top:10px;">
              <span class="cloud-pill">
                <span class="cloud-dot ${isCloud ? 'online' : ''}"></span>
                ${isCloud ? 'Connected to Firebase Cloud' : 'Local Demo Mode'}
              </span>
            </div>
          </div>

          <div style="margin-top:20px;">
            ${isCloud ? `
              <button class="btn secondary" data-action="auth-signout" style="width:100%;margin-bottom:10px;">Sign Out</button>
            ` : `
              <button class="btn" data-action="auth-open" style="width:100%;margin-bottom:10px;">Sign In or Register</button>
            `}
            <button class="btn secondary" data-action="connect-firebase-modal" style="width:100%;margin-bottom:10px;">Firebase Cloud Settings</button>
            <button class="btn secondary" data-action="reset-demo" style="width:100%;color:var(--neg);">Reset Demo Data</button>
          </div>
        </div>
      </div>
    `;
  }

  function openAuthSheet(mode = 'login') {
    overlayEl.innerHTML = `
      <div class="scrim" data-action="close-modal"></div>
      <div class="sheet">
        <div class="grab"></div>
        <div class="fm-head">
          <button class="txt" data-action="close-modal">Cancel</button>
          <h2>${mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
          <span></span>
        </div>
        <div class="auth-wrap">
          <div class="auth-tabs">
            <button class="auth-tab ${mode === 'login' ? 'active' : ''}" data-action="switch-auth-tab" data-tab="login">Sign In</button>
            <button class="auth-tab ${mode === 'register' ? 'active' : ''}" data-action="switch-auth-tab" data-tab="register">Register</button>
          </div>

          <div id="auth-error-msg" class="auth-err"></div>

          ${mode === 'register' ? `
            <div class="field">
              <label>Your Name</label>
              <input class="input" id="auth-name" placeholder="Alex Tan" />
            </div>
          ` : ''}

          <div class="field">
            <label>Email Address</label>
            <input class="input" id="auth-email" type="email" placeholder="you@example.com" />
          </div>

          <div class="field">
            <label>Password</label>
            <input class="input" id="auth-password" type="password" placeholder="At least 6 characters" />
          </div>

          <div style="margin-top:20px;">
            <button class="btn" id="auth-submit-btn" data-action="${mode === 'login' ? 'do-login' : 'do-register'}">
              ${mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function openFirebaseConfigModal() {
    const currentCfg = JSON.stringify(window.FIREBASE_CONFIG || {}, null, 2);
    overlayEl.innerHTML = `
      <div class="scrim" data-action="close-modal"></div>
      <div class="sheet">
        <div class="grab"></div>
        <div class="fm-head">
          <button class="txt" data-action="close-modal">Close</button>
          <h2>Firebase Config</h2>
          <span></span>
        </div>
        <div style="padding:14px 0;">
          <p style="font-size:13px;color:var(--ink-2);margin-bottom:12px;">
            Paste your Firebase web configuration JSON below to connect your real-time cloud database:
          </p>
          <textarea id="firebase-cfg-input" class="input" style="height:140px;font-family:monospace;font-size:12px;padding:10px;">${esc(currentCfg)}</textarea>
          <div style="margin-top:14px;display:flex;gap:10px;">
            <button class="btn" data-action="save-firebase-cfg">Save & Connect</button>
            <button class="btn secondary" data-action="clear-firebase-cfg">Clear (Use Local)</button>
          </div>
        </div>
      </div>
    `;
  }

  async function openSettle(personId) {
    const debt = pairBal(personId, ME);
    const amountVal = (Math.max(0, debt) / 100).toFixed(2);
    const from = personId;
    const to = ME;

    const numeric = toMinor(amountVal);
    if (!numeric) {
      toast('No outstanding balance to settle', true);
      return;
    }

    let remaining = numeric;
    const alloc = state.groups
      .map((item) => ({ groupId: item.id, amount: Math.max(0, pairBal(to, from, item.id)) }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .map((item) => {
        const allocated = Math.min(item.amount, remaining);
        remaining -= allocated;
        return { groupId: item.groupId, amount: allocated };
      })
      .filter((item) => item.amount > 0);

    const targetGroupId = alloc[0]?.groupId || state.groups[0]?.id;

    if (isFirebaseConfigured && currentFirebaseUser && db && targetGroupId) {
      try {
        const settleId = uid('settle');
        await db.collection('groups').doc(targetGroupId).collection('settlements').doc(settleId).set({
          id: settleId,
          from,
          to,
          amount: numeric,
          date: todayISO(),
          groupId: targetGroupId,
          alloc,
          createdAt: Date.now()
        });
        await db.collection('groups').doc(targetGroupId).collection('activity').doc(uid('act')).set({
          id: uid('act'),
          type: 'payment',
          ts: Date.now(),
          actor: from,
          from,
          to,
          amount: numeric,
          groupId: targetGroupId
        });
        toast('Payment recorded');
      } catch (err) {
        toast(`Error recording payment: ${err.message}`, true);
      }
    } else {
      state.settlements.push({ id: uid('settle'), from, to, amount: numeric, date: todayISO(), alloc, createdAt: Date.now() });
      state.activity.push({ id: uid('act'), type: 'payment', ts: Date.now(), actor: from, from, to, amount: numeric, groupId: null });
      saveState();
      toast('Payment recorded');
      render();
    }
  }

  // Event Listeners
  document.addEventListener('click', async (event) => {
    const el = event.target.closest('[data-action]');
    if (!el) return;

    const action = el.dataset.action;

    if (action === 'tab') {
      ui.tab = el.dataset.tab || 'home';
      ui.stack = [];
      render();
      return;
    }

    if (action === 'new-group') {
      newGroup();
      return;
    }

    if (action === 'back') {
      popView();
      return;
    }

    if (action === 'settings') {
      openSettingsSheet();
      return;
    }

    if (action === 'invite-group') {
      openInviteSheet(el.dataset.id);
      return;
    }

    if (action === 'copy-invite') {
      const url = el.dataset.url;
      try {
        await navigator.clipboard.writeText(url);
        toast('Invite link copied!');
      } catch (e) {
        toast('Link: ' + url);
      }
      return;
    }

    if (action === 'add-member-email') {
      const groupId = el.dataset.group;
      const input = document.getElementById('invite-email-input');
      const email = input?.value?.trim().toLowerCase();
      if (!email) {
        toast('Enter an email address', true);
        return;
      }
      if (isFirebaseConfigured && db) {
        try {
          const userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
          if (userSnap.empty) {
            toast('No registered user found with that email', true);
            return;
          }
          const friendDoc = userSnap.docs[0];
          await db.collection('groups').doc(groupId).update({
            members: firebase.firestore.FieldValue.arrayUnion(friendDoc.id)
          });
          toast(`Added ${friendDoc.data().name || email} to group!`);
          openInviteSheet(groupId);
        } catch (err) {
          toast(`Error adding member: ${err.message}`, true);
        }
      } else {
        const dummyId = uid('friend');
        const g = group(groupId);
        if (g) {
          state.people.push({ id: dummyId, name: email.split('@')[0], color: COLORS[state.people.length % COLORS.length] });
          g.members.push(dummyId);
          saveState();
          toast(`Added ${email} to group!`);
          openInviteSheet(groupId);
        }
      }
      return;
    }

    if (action === 'auth-open') {
      openAuthSheet('login');
      return;
    }

    if (action === 'switch-auth-tab') {
      openAuthSheet(el.dataset.tab);
      return;
    }

    if (action === 'do-login') {
      const email = document.getElementById('auth-email')?.value?.trim();
      const password = document.getElementById('auth-password')?.value;
      const errBox = document.getElementById('auth-error-msg');
      if (!email || !password) {
        if (errBox) { errBox.textContent = 'Please enter email and password'; errBox.classList.add('show'); }
        return;
      }
      try {
        await auth.signInWithEmailAndPassword(email, password);
        closeModal();
        toast('Signed in successfully!');
      } catch (err) {
        if (errBox) { errBox.textContent = err.message; errBox.classList.add('show'); }
      }
      return;
    }

    if (action === 'do-register') {
      const name = document.getElementById('auth-name')?.value?.trim();
      const email = document.getElementById('auth-email')?.value?.trim();
      const password = document.getElementById('auth-password')?.value;
      const errBox = document.getElementById('auth-error-msg');
      if (!email || !password) {
        if (errBox) { errBox.textContent = 'Please enter email and password'; errBox.classList.add('show'); }
        return;
      }
      try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        if (name && cred.user) {
          await cred.user.updateProfile({ displayName: name });
        }
        if (cred.user && db) {
          await db.collection('users').doc(cred.user.uid).set({
            id: cred.user.uid,
            name: name || email.split('@')[0],
            email: email.toLowerCase(),
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            updatedAt: Date.now()
          });
        }
        closeModal();
        toast('Account created successfully!');
      } catch (err) {
        if (errBox) { errBox.textContent = err.message; errBox.classList.add('show'); }
      }
      return;
    }

    if (action === 'auth-signout') {
      if (auth) {
        await auth.signOut();
        toast('Signed out');
      }
      closeModal();
      return;
    }

    if (action === 'connect-firebase-modal') {
      openFirebaseConfigModal();
      return;
    }

    if (action === 'save-firebase-cfg') {
      const txt = document.getElementById('firebase-cfg-input')?.value;
      try {
        const parsed = JSON.parse(txt);
        localStorage.setItem('kongsi.firebase_config', JSON.stringify(parsed));
        window.FIREBASE_CONFIG = parsed;
        toast('Firebase configuration saved! Reloading...');
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        toast('Invalid JSON format: ' + err.message, true);
      }
      return;
    }

    if (action === 'clear-firebase-cfg') {
      localStorage.removeItem('kongsi.firebase_config');
      toast('Firebase config cleared. Reloading in local mode...');
      setTimeout(() => window.location.reload(), 800);
      return;
    }

    if (action === 'reset-demo') {
      if (window.confirm('Reset all demo data back to default?')) {
        localStorage.removeItem(STORE_KEY);
        state = defaultState();
        closeModal();
        render();
        toast('Demo data reset');
      }
      return;
    }

    if (action === 'open-group') {
      pushView('group', el.dataset.id);
      return;
    }

    if (action === 'open-person') {
      pushView('person', el.dataset.id);
      return;
    }

    if (action === 'open-expense') {
      pushView('expense', el.dataset.id);
      return;
    }

    if (action === 'add-expense') {
      const groupId = ui.stack[ui.stack.length - 1]?.type === 'group' ? ui.stack[ui.stack.length - 1].id : state.groups[0]?.id;
      draft = newDraft(groupId);
      ui.modal = true;
      openModal();
      return;
    }

    if (action === 'close-modal') {
      closeModal();
      return;
    }

    if (action === 'pick-group') {
      const id = el.dataset.id;
      draft.groupId = id;
      const g = group(id);
      draft.payer = g?.members?.includes(ME) ? ME : g?.members?.[0] || ME;
      draft.participants = [...(g?.members || [ME])];
      prefillDraftSplit();
      openModal(false);
      return;
    }

    if (action === 'pick-payer') {
      draft.payer = el.dataset.id;
      openModal(false);
      return;
    }

    if (action === 'toggle-participant') {
      const memberId = el.dataset.id;
      const index = draft.participants.indexOf(memberId);
      if (index >= 0) {
        draft.participants.splice(index, 1);
      } else {
        draft.participants.push(memberId);
      }
      prefillDraftSplit();
      openModal(false);
      return;
    }

    if (action === 'set-method') {
      draft.method = el.dataset.method || 'equal';
      prefillDraftSplit();
      openModal(false);
      return;
    }

    if (action === 'save-expense') {
      await saveExpense();
      return;
    }

    if (action === 'edit-expense') {
      const item = expense(el.dataset.id);
      if (!item) return;
      setDraftFromExpense(item);
      ui.modal = true;
      openModal();
      return;
    }

    if (action === 'delete-expense') {
      if (window.confirm('Delete this expense?')) {
        await doDeleteExpense(el.dataset.id);
      }
      return;
    }

    if (action === 'settle-person') {
      await openSettle(el.dataset.id);
      return;
    }
  });

  function updateDraftField(input) {
    const field = input.dataset.field;
    if (!draft || !field) return;

    if (field === 'desc') draft.desc = input.value;
    else if (field === 'amount') draft.amount = input.value;
    else if (field === 'currency') draft.currency = input.value;
    else if (field === 'date') draft.date = input.value;
    else if (field === 'exact') {
      draft.exact[input.dataset.member] = input.value;
      draft.autoExact = false;
    } else if (field === 'percent') {
      draft.percent[input.dataset.member] = input.value;
      draft.autoPercent = false;
    }
    if ((field === 'amount' || field === 'currency') && draft.method === 'exact') prefillDraftSplit('exact');
    if (field === 'amount' || field === 'currency' || field === 'exact' || field === 'percent') updateDraftSplitPreview();
  }

  document.addEventListener('input', (event) => updateDraftField(event.target));
  document.addEventListener('change', (event) => updateDraftField(event.target));

  // Handle URL Invite: ?join=GROUP_ID
  async function checkUrlInvite() {
    const urlParams = new URLSearchParams(window.location.search);
    const joinGroupId = urlParams.get('join');
    if (joinGroupId && isFirebaseConfigured && db && currentFirebaseUser) {
      try {
        const groupRef = db.collection('groups').doc(joinGroupId);
        const groupSnap = await groupRef.get();
        if (groupSnap.exists) {
          await groupRef.update({
            members: firebase.firestore.FieldValue.arrayUnion(currentFirebaseUser.uid)
          });
          toast(`Joined ${groupSnap.data().name}!`);
          // Clean URL without reloading
          window.history.replaceState({}, document.title, window.location.pathname);
          pushView('group', joinGroupId);
        }
      } catch (err) {
        console.warn('Error joining group from URL:', err);
      }
    }
  }

  // Firebase Setup & Real-time Listeners
  function setupFirestoreSync(user) {
    // Clear any previous listeners
    firestoreListeners.forEach((unsub) => unsub && unsub());
    firestoreListeners = [];

    // Listen to groups where user is a member
    const unsubGroups = db.collection('groups').where('members', 'array-contains', user.uid).onSnapshot((snapshot) => {
      const groups = [];
      const memberUids = new Set();
      snapshot.forEach((doc) => {
        const gData = { id: doc.id, ...doc.data() };
        groups.push(gData);
        (gData.members || []).forEach((m) => memberUids.add(m));
      });
      state.groups = groups;

      // Sync member profiles
      memberUids.forEach((mUid) => {
        if (!state.people.find((p) => p.id === mUid)) {
          db.collection('users').doc(mUid).get().then((uDoc) => {
            if (uDoc.exists) {
              const uData = uDoc.data();
              if (!state.people.find((p) => p.id === mUid)) {
                state.people.push({ id: mUid, name: uData.name || 'Friend', color: uData.color || COLORS[state.people.length % COLORS.length] });
                render();
              }
            }
          }).catch(() => {});
        }
      });

      // Listen to expenses and settlements for all user groups
      groups.forEach((g) => {
        const unsubExp = db.collection('groups').doc(g.id).collection('expenses').onSnapshot((expSnap) => {
          const groupExp = [];
          expSnap.forEach((eDoc) => groupExp.push({ id: eDoc.id, ...eDoc.data() }));
          // Replace expenses for this group
          state.expenses = state.expenses.filter((e) => e.groupId !== g.id).concat(groupExp);
          render();
        });
        firestoreListeners.push(unsubExp);

        const unsubSettle = db.collection('groups').doc(g.id).collection('settlements').onSnapshot((sSnap) => {
          const groupSettle = [];
          sSnap.forEach((sDoc) => groupSettle.push({ id: sDoc.id, ...sDoc.data() }));
          state.settlements = state.settlements.filter((s) => s.groupId !== g.id).concat(groupSettle);
          render();
        });
        firestoreListeners.push(unsubSettle);

        const unsubAct = db.collection('groups').doc(g.id).collection('activity').limit(20).onSnapshot((actSnap) => {
          const groupAct = [];
          actSnap.forEach((aDoc) => groupAct.push({ id: aDoc.id, ...aDoc.data() }));
          state.activity = state.activity.filter((a) => a.groupId !== g.id).concat(groupAct);
          render();
        });
        firestoreListeners.push(unsubAct);
      });

      render();
    }, (err) => {
      console.warn('Groups listener warning:', err);
    });
    firestoreListeners.push(unsubGroups);
  }

  function initFirebase() {
    const cfg = window.FIREBASE_CONFIG;
    if (window.firebase && cfg && cfg.apiKey && cfg.apiKey !== 'YOUR_API_KEY') {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(cfg);
        }
        auth = firebase.auth();
        db = firebase.firestore();
        isFirebaseConfigured = true;

        auth.onAuthStateChanged(async (user) => {
          currentFirebaseUser = user;
          if (user) {
            ME = user.uid;
            // Ensure user profile in people
            const myName = user.displayName || user.email.split('@')[0];
            const myProfile = { id: user.uid, name: myName, color: COLORS[0] };
            const existingIdx = state.people.findIndex((p) => p.id === user.uid);
            if (existingIdx >= 0) state.people[existingIdx] = myProfile;
            else state.people.unshift(myProfile);

            // Save user profile in Firestore
            try {
              await db.collection('users').doc(user.uid).set({
                id: user.uid,
                name: myName,
                email: user.email.toLowerCase(),
                updatedAt: Date.now()
              }, { merge: true });
            } catch (e) {}

            setupFirestoreSync(user);
            await checkUrlInvite();
          } else {
            ME = 'me';
            firestoreListeners.forEach((unsub) => unsub && unsub());
            firestoreListeners = [];
            state = loadState();
          }
          render();
        });
      } catch (err) {
        console.warn('Firebase init error:', err);
        isFirebaseConfigured = false;
      }
    }
  }

  // Register service worker for offline PWA capabilities
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.onupdatefound = () => {
        const installing = reg.installing;
        if (installing) {
          installing.onstatechange = () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              toast('Update available! Refresh to get the latest version.');
            }
          };
        }
      };
    }).catch((err) => {
      console.warn('SW register error:', err);
    });
  }

  window.__kongsi = {
    state,
    shares,
    baseShares,
    ledger,
    simplify,
    myTotals,
    groupNet,
    toMinor,
    rm,
    money
  };

  initFirebase();
  render();
})();
