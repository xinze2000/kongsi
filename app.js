/* Kongsi - shared-expense prototype. Vanilla JS, no build step. */
(function () {
  'use strict';

  const STORE_KEY = 'kongsi.v1';
  const ME = 'me';
  const CUR = {
    MYR: { sym: 'RM', dec: 2, rate: 1 },
    JPY: { sym: '¥', dec: 0, rate: 0.03 },
    SGD: { sym: 'S$', dec: 2, rate: 3.3 },
    USD: { sym: 'US$', dec: 2, rate: 4.2 },
    EUR: { sym: '€', dec: 2, rate: 4.6 },
    THB: { sym: 'B', dec: 2, rate: 0.13 }
  };
  const COLORS = ['#4F46E5', '#E8590C', '#0E9F6E', '#D6336C', '#1C7ED6', '#F08C00', '#7048E8', '#0C8599'];
  const EMOJIS = ['✈️', '🏠', '🍎', '🍕', '🍻', '🚗', '🛒', '💼'];
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
      { id: 'me', name: 'XinZe', color: COLORS[0] },
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
  let sdraft = null;
  let toastTimer = null;

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
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (error) {
      // ignore storage failures
    }
  }

  function toast(message, error = false) {
    toastEl.textContent = message;
    toastEl.className = `toast show${error ? ' err' : ''}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  function person(id) {
    return state.people.find((p) => p.id === id) || { id, name: 'Unknown', color: '#999' };
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
    return String(name || '').trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
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
    const sh = shares(expenseItem);
    return sh;
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
      for (const pid of exp.participants) {
        if (pid === exp.payer || !sh[pid]) continue;
        add(exp.payer, pid, sh[pid]);
      }
    });

    state.settlements.forEach((settle) => {
      const groupAmount = filterGroupId ? (settle.alloc || []).find((x) => x.groupId === filterGroupId)?.amount : settle.amount;
      if (filterGroupId && groupAmount == null) return;
      const amount = filterGroupId ? groupAmount : settle.amount;
      add(settle.from, settle.to, amount);
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
    g.members.forEach((member) => {
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
    return `<span class="avatar ${cls}" style="background:${p.color}">${esc(initials(p.name))}</span>`;
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
    repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 2l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 22l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>',
    receipt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h12l2 4v16l-3-2-3 2-3-2-3 2-3-2-3 2V6l2-4z"></path><path d="M8 9h8M8 13h8"></path></svg>'
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
    let content = '<div class="row"><div class="grow">';
    let right = '';
    const time = dayLabel(item.ts);

    if (item.type === 'expense_added' || item.type === 'expense_edited' || item.type === 'expense_deleted') {
      const exp = expense(item.expenseId);
      const base = exp ? exp.amount : item.amount || 0;
      const cur = exp ? (exp.currency || 'MYR') : (item.cur || 'MYR');
      const delta = ' ' + money(base, cur);
      content += `<div class="t">${activityTitle(item)}</div><div class="s">${esc(item.desc || '')}${delta}${exp ? ` · ${esc(group(exp.groupId)?.name || '')}` : ''}</div>`;
      right = `<div class="amt"><b>${money(base, cur)}</b><small>${time}</small></div>`;
    } else if (item.type === 'payment') {
      content += `<div class="t">${activityTitle(item)}</div><div class="s">${esc(nm(item.from))} to ${esc(nm(item.to))}</div>`;
      right = `<div class="amt"><b>${rm(item.amount || 0)}</b><small>${time}</small></div>`;
    } else if (item.type === 'group_created') {
      const g = group(item.groupId);
      content += `<div class="t">${activityTitle(item)}</div><div class="s">${g ? esc(g.name) : 'New group'}</div>`;
      right = `<div class="amt"><small>${time}</small></div>`;
    } else {
      content += `<div class="t">${activityTitle(item)}</div><div class="s">${time}</div>`;
    }

    content += '</div>' + right + '</div>';
    return content;
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
    const recent = [...state.activity].sort((a, b) => b.ts - a.ts).slice(0, 4);
    const groupsMarkup = state.groups.map((g) => {
      const net = groupNet(g.id);
      return `
        <button class="row tappable" data-action="open-group" data-id="${g.id}">
          <span class="tile">${g.emoji}</span>
          <div class="grow">
            <div class="t">${esc(g.name)}</div>
            <div class="s">${g.members.length} members · ${state.expenses.filter((e) => e.groupId === g.id).length} expenses</div>
          </div>
          <div class="amt">
            <b class="${balClass(net)}">${rm(Math.abs(net))}</b>
            <small>${net > 0 ? 'you are owed' : net < 0 ? 'you owe' : 'settled'}</small>
          </div>
        </button>
      `;
    }).join('') || emptyBlock('🏠', 'No groups yet', 'Create one for a trip, home or team.');

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

    return `
      <div class="topbar">
        <div class="brand">
          <div class="brand-mark"><svg viewBox="0 0 34 34" width="34" height="34"><path d="M13 9a8 8 0 0 0 0 16h8a8 8 0 0 1 0-16h-8zm5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z" fill="#fff"></path></svg></div>
          <span class="brand-name">Kongsi</span>
        </div>
        <button class="iconbtn" data-action="settings" aria-label="Settings">${I.gear}</button>
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
        <div class="card flush">${recent.map(activityRow).join('')}</div>
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
        <div class="card flush">${friendsMarkup}</div>
      </div>
    `;
  }

  function renderGroups() {
    const cards = state.groups.map((g) => {
      const net = groupNet(g.id);
      return `
        <button class="card flush" data-action="open-group" data-id="${g.id}" style="display:block;width:100%;text-align:left;padding:16px;margin-top:10px;">
          <div style="display:flex;gap:12px;align-items:center;">
            <span class="tile lg">${g.emoji}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:18px;">${esc(g.name)}</div>
              <div style="margin-top:6px;color:var(--ink-2);font-size:13px;">${g.members.length} members</div>
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
    const totals = myTotals();
    const friends = state.people.filter((p) => p.id !== ME).map((p) => ({ p, value: pairBal(ME, p.id, null) }));
    const owed = friends.filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
    const owe = friends.filter((x) => x.value < 0).sort((a, b) => a.value - b.value);
    const settled = friends.filter((x) => x.value === 0);

    const list = (title, values) => `
      <div class="section">
        <div class="section-h"><h2>${title}</h2></div>
        <div class="card flush">
          ${values.length ? values.map(({ p, value }) => `
            <button class="row tappable" data-action="open-person" data-id="${p.id}">
              ${avatar(p.id)}
              <div class="grow">
                <div class="t">${esc(p.name)}</div>
                <div class="s">${value > 0 ? `${esc(p.name)} owes you` : value < 0 ? `You owe ${esc(p.name)}` : 'Settled up'}</div>
              </div>
              <div class="amt"><b class="${balClass(value)}">${rm(Math.abs(value))}</b></div>
            </button>
          `).join('') : emptyBlock('📭', 'Nothing here', '')}
        </div>
      </div>
    `;

    return `
      <div class="topbar"><span class="title">Balances</span></div>
      <div class="card" style="margin-top:10px;padding:16px;">
        <div class="seg">
          <button class="${ui.ballab === 'people' ? 'on' : ''}" data-action="ballab" data-id="people">People</button>
          <button class="${ui.ballab === 'groups' ? 'on' : ''}" data-action="ballab" data-id="groups">Groups</button>
        </div>
      </div>
      ${ui.ballab === 'people' ? list('Owes you', owed) + list('You owe', owe) + list('Settled', settled) : state.groups.map((g) => {
        const net = groupNet(g.id);
        return `
          <div class="section">
            <div class="section-h"><h2>${esc(g.name)}</h2></div>
            <div class="card flush">
              <button class="row tappable" data-action="open-group" data-id="${g.id}">
                <span class="tile">${g.emoji}</span>
                <div class="grow">
                  <div class="t">${esc(g.name)}</div>
                  <div class="s">${balLabel(net)}</div>
                </div>
                <div class="amt"><b class="${balClass(net)}">${rm(Math.abs(net))}</b></div>
              </button>
            </div>
          </div>
        `;
      }).join('')}
    `;
  }

  function renderActivity() {
    const items = [...state.activity].sort((a, b) => b.ts - a.ts);
    const grouped = {};
    items.forEach((item) => {
      const key = dayLabel(item.ts);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    const html = Object.entries(grouped).map(([day, rows]) => `
      <div class="section">
        <div class="section-h"><h2>${day}</h2></div>
        <div class="card flush">${rows.map(activityRow).join('')}</div>
      </div>
    `).join('');

    return `${backBar('Activity')}<div style="margin-top:14px">${html || emptyBlock('📭', 'No activity yet', 'Expenses and payments will appear here.')}</div>`;
  }

  function renderGroup(groupId) {
    const g = group(groupId);
    if (!g) return backBar('Group') + emptyBlock('💬', 'Group not found', 'It may have been removed.');

    const net = groupNet(groupId);
    const nets = groupNets(groupId);
    const simplified = simplify(g);
    const expensesInGroup = state.expenses.filter((exp) => exp.groupId === groupId).sort((a, b) => b.date.localeCompare(a.date));

    const memberCards = g.members.map((memberId) => `
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
        <div class="amt"><b>${rm(step.amount)}</b></div>
      </div>
    `).join('') : emptyBlock('✅', 'No pending transfers', 'Balances are already settled.');

    const expenseCards = expensesInGroup.length ? expensesInGroup.map((exp) => `
      <button class="row tappable" data-action="open-expense" data-id="${exp.id}">
        <span class="tile">${exp.desc.trim().startsWith('Dinner') ? '🍽️' : '📄'}</span>
        <div class="grow">
          <div class="t">${esc(exp.desc)}</div>
          <div class="s">${esc(nm(exp.payer))} paid ${money(exp.amount, exp.currency || 'MYR')} · ${fmtDate(exp.date)}</div>
        </div>
        <div class="amt"><b>${money(exp.amount, exp.currency || 'MYR')}</b></div>
      </button>
    `).join('') : emptyBlock('🧾', 'No expenses yet', 'Add the first one to get started.');

    return `
      ${backBar(g.name)}
      <div class="card" style="margin-top:14px;padding:20px;text-align:center;">
        <div style="display:flex;align-items:center;justify-content:center;gap:12px;">
          <span class="tile lg">${g.emoji}</span>
        </div>
        <h2 style="margin-top:12px;font-size:24px;">${esc(g.name)}</h2>
        <div style="margin-top:8px;color:var(--ink-2);">${g.members.length} members</div>
        <div class="section-h" style="margin-top:14px;justify-content:center;">
          <div class="${balClass(net)}" style="font-size:28px;font-weight:800;">${rm(Math.abs(net))}</div>
        </div>
        <div class="btn-row" style="margin-top:16px;">
          <button class="btn secondary" data-action="add-expense">${I.plus}Add</button>
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
    const value = pairBal(ME, personId, null);
    const shared = state.expenses.filter((exp) => (exp.payer === personId || exp.payer === ME) && exp.participants.includes(personId) && exp.participants.includes(ME));

    return `
      ${backBar(p.name)}
      <div class="card" style="margin-top:18px;padding:18px;text-align:center;">
        ${avatar(personId, 'lg')}
        <h1 style="margin-top:12px;font-size:28px;">${esc(p.name)}</h1>
        <div class="${balClass(value)}" style="margin-top:8px;font-size:26px;font-weight:800;">${rm(Math.abs(value))}</div>
        <div style="margin-top:6px;color:var(--ink-2);">${value > 0 ? `${esc(p.name)} owes you` : value < 0 ? `You owe ${esc(p.name)}` : 'All settled'}</div>
        <div class="btn-row" style="margin-top:16px;">
          <button class="btn" data-action="settle-person" data-id="${personId}">Settle up</button>
        </div>
      </div>

      <div class="section">
        <div class="section-h"><h2>Shared expenses</h2></div>
        <div class="card flush">${shared.length ? shared.map((exp) => `
          <button class="row tappable" data-action="open-expense" data-id="${exp.id}">
            <span class="tile">${exp.desc.startsWith('Dinner') ? '🍽️' : '📄'}</span>
            <div class="grow">
              <div class="t">${esc(exp.desc)}</div>
              <div class="s">${esc(nm(exp.payer))} · ${fmtDate(exp.date)}</div>
            </div>
            <div class="amt"><b>${money(exp.amount, exp.currency || 'MYR')}</b></div>
          </button>
        `).join('') : emptyBlock('📭', 'Nothing shared yet', '')}</div>
      </div>
    `;
  }

  function renderExpense(expenseId) {
    const item = expense(expenseId);
    if (!item) return backBar('Expense') + emptyBlock('📭', 'Expense not found', 'It may have been deleted.');
    const g = group(item.groupId);
    const sh = sourceShares(item);
    const total = Object.values(sh).reduce((sum, val) => sum + val, 0);

    return `
      ${backBar('Expense')}
      <div class="card" style="margin-top:16px;padding:18px;text-align:center;">
        <span class="tile lg">${g ? g.emoji : '📄'}</span>
        <h1 style="margin-top:12px;font-size:28px;">${esc(item.desc)}</h1>
        <div style="margin-top:8px;font-size:24px;font-weight:800;">${money(item.amount, item.currency || 'MYR')}</div>
        <div style="margin-top:8px;color:var(--ink-2);">${esc(nm(item.payer))} paid</div>
      </div>

      <div class="section">
        <div class="section-h"><h2>Split summary</h2></div>
        <div class="card flush">
          ${item.participants.map((pid) => `
            <div class="row">
              ${avatar(pid)}
              <div class="grow">
                <div class="t">${esc(pid === ME ? 'You' : person(pid).name)}</div>
                <div class="s">${item.method === 'equal' ? 'Split equally' : item.method === 'exact' ? 'Exact amount' : 'Percentage split'}</div>
              </div>
              <div class="amt"><b>${money(sh[pid] || 0, item.currency || 'MYR')}</b></div>
            </div>
          `).join('')}
          <div class="row">
            <div class="grow"><div class="t">Total</div></div>
            <div class="amt"><b>${money(total, item.currency || 'MYR')}</b></div>
          </div>
        </div>
      </div>

      <div class="btn-row" style="margin-top:20px;">
        <button class="btn secondary" data-action="edit-expense" data-id="${item.id}">${I.edit}Edit</button>
        <button class="btn danger" data-action="delete-expense" data-id="${item.id}">${I.trash}Delete</button>
      </div>
    `;
  }

  function renderCurrentView() {
    const current = ui.stack[ui.stack.length - 1];
    if (current && current.type === 'group') {
      viewEl.innerHTML = renderGroup(current.id);
      return;
    }
    if (current && current.type === 'person') {
      viewEl.innerHTML = renderPerson(current.id);
      return;
    }
    if (current && current.type === 'expense') {
      viewEl.innerHTML = renderExpense(current.id);
      return;
    }

    if (ui.tab === 'home') viewEl.innerHTML = renderHome();
    else if (ui.tab === 'groups') viewEl.innerHTML = renderGroups();
    else if (ui.tab === 'activity') viewEl.innerHTML = renderActivity();
    else if (ui.tab === 'balances') viewEl.innerHTML = renderBalances();
  }

  function render() {
    renderCurrentView();
    renderTabbar();
    const hidden = !!ui.stack.length;
    tabbarEl.classList.toggle('hidden', hidden);
  }

  function pushView(type, id) {
    ui.stack.push({ type, id });
    render();
  }

  function popView() {
    if (!ui.stack.length) return;
    ui.stack.pop();
    render();
  }

  function newDraft(groupId = null) {
    const defaultGroup = group(groupId) || state.groups[0] || { id: '', members: [ME] };
    return {
      id: null,
      desc: '',
      amount: '',
      currency: 'MYR',
      date: todayISO(),
      groupId: defaultGroup.id,
      payer: defaultGroup.members.includes(ME) ? ME : defaultGroup.members[0],
      participants: [...defaultGroup.members],
      method: 'equal',
      percent: {},
      exact: {},
      autoExact: true,
      autoPercent: true,
      recurring: null,
      next: '',
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
    const g = group(draft.groupId) || state.groups[0];
    const memberButtons = g.members.map((memberId) => `
      <button class="chip ${draft.participants.includes(memberId) ? 'on' : ''}" data-action="toggle-participant" data-id="${memberId}">
        ${avatar(memberId, 'sm')} ${esc(memberId === ME ? 'You' : person(memberId).name)}
      </button>
    `).join('');

    return `
      <div class="sheet${animate ? '' : ' still'}">
        <div class="fm-head">
          <button class="txt" data-action="close-modal">Cancel</button>
          <h2>${draft.id ? 'Edit expense' : 'Add expense'}</h2>
          <span></span>
        </div>
        <div class="fm-body">
          <div class="field">
            <label>Description</label>
            <input class="input" data-field="desc" value="${esc(draft.desc)}" placeholder="Groceries, trip, etc." />
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
                <button class="chip ${item.id === draft.groupId ? 'on' : ''}" data-action="pick-group" data-id="${item.id}">${item.emoji} ${esc(item.name)}</button>
              `).join('')}
            </div>
          </div>

          <div class="field">
            <label>Paid by</label>
            <div class="chips">
              ${g.members.map((memberId) => `
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

          <div class="field">
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

  function saveExpense() {
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
      createdAt: Date.now(),
      recurring: draft.recurring || null
    };

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
    closeModal();
    render();
  }

  function doDeleteExpense(id) {
    const item = expense(id);
    if (!item) return;
    state.expenses = state.expenses.filter((e) => e.id !== id);
    state.activity.push({ id: uid('act'), type: 'expense_deleted', ts: Date.now(), actor: ME, expenseId: id, desc: item.desc, amount: item.amount, cur: item.currency, payer: item.payer, groupId: item.groupId });
    saveState();
    render();
    toast('Expense deleted');
  }

  function addPersonToGroup(name) {
    if (!name.trim()) return;
    const personItem = { id: uid('person'), name: name.trim(), color: COLORS[state.people.length % COLORS.length] };
    state.people.push(personItem);
    saveState();
    render();
    toast(`${personItem.name} added`);
  }

  function newGroup() {
    const newGroupName = window.prompt('Group name', 'New group');
    if (!newGroupName || !newGroupName.trim()) return;
    const id = uid('group');
    const groupItem = { id, name: newGroupName.trim(), emoji: EMOJIS[0], members: [ME, ...state.people.filter((p) => p.id !== ME).slice(0, 1).map((p) => p.id)], createdAt: Date.now() };
    state.groups.push(groupItem);
    state.activity.push({ id: uid('act'), type: 'group_created', ts: Date.now(), actor: ME, groupId: groupItem.id });
    saveState();
    render();
    toast(`${groupItem.name} created`);
  }

  function openSettle(personId) {
    const amount = pairBal(ME, personId, null);
    const from = amount > 0 ? personId : ME;
    const to = amount > 0 ? ME : personId;
    const value = Math.abs(amount);
    const settle = window.prompt(`Record settlement with ${person(personId).name} (${rm(value)})`, '0.00');
    if (settle == null) return;
    const numeric = toMinor(settle || 0, 'MYR');
    if (!(numeric > 0)) {
      toast('Enter a valid amount', true);
      return;
    }
    if (numeric > value) {
      toast(`Enter an amount up to ${rm(value)}`, true);
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

    state.settlements.push({ id: uid('settle'), from, to, amount: numeric, date: todayISO(), alloc, createdAt: Date.now() });
    state.activity.push({ id: uid('act'), type: 'payment', ts: Date.now(), actor: from, from, to, amount: numeric, groupId: null });
    saveState();
    render();
    toast('Payment recorded');
  }

  document.addEventListener('click', (event) => {
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
      const all = state.people.map((p) => p.name).join(', ');
      toast(`Kongsi demo: ${all}`);
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
      draft.payer = g?.members.includes(ME) ? ME : g?.members[0] || ME;
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
      saveExpense();
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
      doDeleteExpense(el.dataset.id);
      return;
    }

    if (action === 'settle-person') {
      openSettle(el.dataset.id);
      return;
    }

    if (action === 'ballab') {
      ui.ballab = el.dataset.id || 'people';
      render();
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

  render();
})();
