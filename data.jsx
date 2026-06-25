// ============================================================
// Life Manager — data layer, helpers, persistence
// ============================================================

const STORAGE_KEY = 'lifemanager.v1';
const TODAY = new Date(); TODAY.setHours(0,0,0,0);
const DAY = 86400000;

const CATEGORIES = {
  ingreso: [
    { id: 'salario', label: 'Salario' },
    { id: 'freelance', label: 'Freelance' },
    { id: 'inversiones', label: 'Inversiones' },
    { id: 'reembolso', label: 'Reembolsos' },
    { id: 'regalo', label: 'Regalo' },
    { id: 'otros_in', label: 'Otros' },
  ],
  gasto: [
    { id: 'comida', label: 'Comida' },
    { id: 'transporte', label: 'Transporte' },
    { id: 'vivienda', label: 'Vivienda' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'ocio', label: 'Ocio' },
    { id: 'salud', label: 'Salud' },
    { id: 'educacion', label: 'Educación' },
    { id: 'suministros', label: 'Suministros' },
    { id: 'otros_g', label: 'Otros' },
  ],
  venta: [
    { id: 'producto', label: 'Producto' },
    { id: 'servicio', label: 'Servicio' },
  ],
};

function categoryLabel(tipo, id) {
  const list = CATEGORIES[tipo] || [];
  const c = list.find((x) => x.id === id);
  return c ? c.label : id || '—';
}

function emptyState() {
  return {
    transactions: [],
    products: [],
    clients: [],
    suppliers: [],
    crmClients: [],
    crmProjects: [],
    debts: [],
    bankAccount: { banco: '', tipoCuenta: 'Corriente', numeroCuenta: '', titular: '' },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    const base = emptyState();
    return {
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      products: Array.isArray(parsed.products) ? parsed.products : [],
      clients: Array.isArray(parsed.clients) ? parsed.clients : [],
      suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
      crmClients: Array.isArray(parsed.crmClients) ? parsed.crmClients : [],
      crmProjects: Array.isArray(parsed.crmProjects) ? parsed.crmProjects : [],
      debts: Array.isArray(parsed.debts) ? parsed.debts : [],
      bankAccount: parsed.bankAccount && typeof parsed.bankAccount === 'object'
        ? { ...base.bankAccount, ...parsed.bankAccount }
        : base.bankAccount,
    };
  } catch (err) {
    console.warn('No se pudo leer almacenamiento:', err);
    return emptyState();
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('No se pudo guardar:', err);
  }
}

function newId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ---- Period helpers ---------------------------------------
function startOfPeriod(date, period) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (period === 'dia') return d;
  if (period === 'semana') {
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    return d;
  }
  if (period === 'mes') { d.setDate(1); return d; }
  if (period === 'anio') { d.setMonth(0, 1); return d; }
  return d;
}
function endOfPeriod(date, period) {
  const s = startOfPeriod(date, period);
  const e = new Date(s);
  if (period === 'dia') e.setDate(e.getDate() + 1);
  if (period === 'semana') e.setDate(e.getDate() + 7);
  if (period === 'mes') e.setMonth(e.getMonth() + 1);
  if (period === 'anio') e.setFullYear(e.getFullYear() + 1);
  return e;
}
function shiftPeriod(date, period, delta) {
  const d = new Date(date);
  if (period === 'dia') d.setDate(d.getDate() + delta);
  if (period === 'semana') d.setDate(d.getDate() + delta * 7);
  if (period === 'mes') d.setMonth(d.getMonth() + delta);
  if (period === 'anio') d.setFullYear(d.getFullYear() + delta);
  return d;
}

const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const WEEKDAYS_SHORT = ['lun','mar','mié','jue','vie','sáb','dom'];

function formatPeriodLabel(date, period) {
  const d = new Date(date);
  if (period === 'dia') {
    return `${WEEKDAYS_SHORT[(d.getDay()+6)%7]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  if (period === 'semana') {
    const s = startOfPeriod(d, 'semana');
    const e = new Date(endOfPeriod(d, 'semana').getTime() - DAY);
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()}–${e.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()}`;
    }
    return `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} – ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]} ${s.getFullYear()}`;
  }
  if (period === 'mes') return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if (period === 'anio') return `${d.getFullYear()}`;
  return '';
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}
function formatDateFull(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
function todayISO() { return TODAY.toISOString().slice(0, 10); }

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
function money(n) { return USD.format(n || 0); }
function moneyCompact(n) {
  const a = Math.abs(n);
  if (a >= 1000) return '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return '$' + Math.round(n);
}

// ---- Aggregations ------------------------------------------
function inRange(iso, start, end) {
  const t = new Date(iso + 'T00:00:00').getTime();
  return t >= start.getTime() && t < end.getTime();
}

function aggregate(txs, anchor, period) {
  const start = startOfPeriod(anchor, period);
  const end = endOfPeriod(anchor, period);
  const prevAnchor = shiftPeriod(anchor, period, -1);
  const prevStart = startOfPeriod(prevAnchor, period);
  const prevEnd = startOfPeriod(anchor, period);

  let ingreso = 0, gasto = 0, venta = 0;
  let pIngreso = 0, pGasto = 0, pVenta = 0;
  const byCat = {};
  let count = 0;

  for (const t of txs) {
    if (inRange(t.fecha, start, end)) {
      count++;
      if (t.tipo === 'ingreso') ingreso += t.monto;
      else if (t.tipo === 'gasto') { gasto += t.monto; byCat[t.categoria] = (byCat[t.categoria] || 0) + t.monto; }
      else if (t.tipo === 'venta') venta += t.monto;
    } else if (inRange(t.fecha, prevStart, prevEnd)) {
      if (t.tipo === 'ingreso') pIngreso += t.monto;
      else if (t.tipo === 'gasto') pGasto += t.monto;
      else if (t.tipo === 'venta') pVenta += t.monto;
    }
  }
  return {
    start, end, count,
    ingreso, gasto, venta,
    balance: ingreso + venta - gasto,
    prev: { ingreso: pIngreso, gasto: pGasto, venta: pVenta, balance: pIngreso + pVenta - pGasto },
    byCat,
  };
}

function chartBuckets(txs, anchor, period) {
  const start = startOfPeriod(anchor, period);
  const end = endOfPeriod(anchor, period);
  let buckets = [];
  if (period === 'dia') {
    for (let h = 0; h < 24; h++) buckets.push({ label: String(h).padStart(2, '0'), ingreso: 0, gasto: 0, venta: 0 });
    for (const t of txs) {
      if (!inRange(t.fecha, start, end)) continue;
      const h = (parseInt(String(t.id).replace(/[^0-9a-z]/gi,'').slice(-4), 36) || 0) % 24;
      buckets[h][t.tipo] += t.monto;
    }
  } else if (period === 'semana') {
    for (let i = 0; i < 7; i++) buckets.push({ label: WEEKDAYS_SHORT[i], ingreso: 0, gasto: 0, venta: 0 });
    for (const t of txs) {
      if (!inRange(t.fecha, start, end)) continue;
      const d = new Date(t.fecha + 'T00:00:00');
      const dow = (d.getDay() + 6) % 7;
      buckets[dow][t.tipo] += t.monto;
    }
  } else if (period === 'mes') {
    const days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= days; i++) buckets.push({ label: String(i), ingreso: 0, gasto: 0, venta: 0 });
    for (const t of txs) {
      if (!inRange(t.fecha, start, end)) continue;
      const d = new Date(t.fecha + 'T00:00:00');
      buckets[d.getDate() - 1][t.tipo] += t.monto;
    }
  } else if (period === 'anio') {
    for (let i = 0; i < 12; i++) buckets.push({ label: MONTHS_SHORT[i], ingreso: 0, gasto: 0, venta: 0 });
    for (const t of txs) {
      if (!inRange(t.fecha, start, end)) continue;
      const d = new Date(t.fecha + 'T00:00:00');
      buckets[d.getMonth()][t.tipo] += t.monto;
    }
  }
  return buckets;
}

function sparkSeries(txs, period, tipo) {
  const series = [];
  let anchor = new Date(TODAY);
  for (let i = 11; i >= 0; i--) {
    const a = shiftPeriod(anchor, period, -i);
    const start = startOfPeriod(a, period);
    const end = endOfPeriod(a, period);
    let sum = 0;
    for (const t of txs) {
      if (!inRange(t.fecha, start, end)) continue;
      if (tipo === 'balance') {
        if (t.tipo === 'ingreso') sum += t.monto;
        else if (t.tipo === 'venta') sum += t.monto;
        else if (t.tipo === 'gasto') sum -= t.monto;
      } else if (t.tipo === tipo) sum += t.monto;
    }
    series.push(sum);
  }
  return series;
}

// ---- CSV export --------------------------------------------
function downloadCSV(filename, rows) {
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const csv = rows.map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function exportTransactions(txs, products, clients) {
  const pMap = Object.fromEntries(products.map((p) => [p.id, p.nombre]));
  const cMap = Object.fromEntries(clients.map((c) => [c.id, c.nombre]));
  const header = ['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Monto USD', 'Producto', 'Cantidad', 'Cliente', 'Notas'];
  const rows = [header, ...txs.map((t) => [
    t.fecha, t.tipo, categoryLabel(t.tipo, t.categoria), t.concepto, t.monto.toFixed(2),
    t.productoId ? pMap[t.productoId] || '' : '', t.cantidad || '',
    t.clienteId ? cMap[t.clienteId] || '' : '', t.nota || '',
  ])];
  downloadCSV(`life-manager_movimientos_${todayISO()}.csv`, rows);
}

// ---- Excel (.xls) export -----------------------------------
// Uses HTML/SpreadsheetML — opens cleanly in Excel, Numbers, Google Sheets.
function downloadXLS(filename, sheetName, rows) {
  const escape = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const headerRow = rows[0] || [];
  const bodyRows = rows.slice(1);
  const thead = '<tr>' + headerRow.map((h) => `<th>${escape(h)}</th>`).join('') + '</tr>';
  const tbody = bodyRows.map((r) => '<tr>' + r.map((cell) => {
    const isNumber = typeof cell === 'number' || (typeof cell === 'string' && /^-?\d+(?:\.\d+)?$/.test(cell) && cell !== '');
    return isNumber
      ? `<td x:num="${escape(cell)}" style="mso-number-format:'0.00'">${escape(cell)}</td>`
      : `<td>${escape(cell)}</td>`;
  }).join('') + '</tr>').join('');

  const html = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"/>
<!--[if gte mso 9]><xml>
  <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
    <x:Name>${escape(sheetName)}</x:Name>
    <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
  </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
</xml><![endif]-->
<style>
  table { border-collapse: collapse; }
  th { background:#F2F0EA; text-align:left; padding:4px 8px; border:1px solid #C8C4BB; font-weight:600; }
  td { padding:4px 8px; border:1px solid #E2DED4; }
</style>
</head><body>
<table>${thead}${tbody}</table>
</body></html>`;

  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// Build rows + dispatch to the right exporter
function exportMovements({ format, txs, products, clients, sheetName, filenameBase }) {
  const pMap = Object.fromEntries(products.map((p) => [p.id, p.nombre]));
  const cMap = Object.fromEntries(clients.map((c) => [c.id, c.nombre]));
  const header = ['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Monto USD', 'Producto', 'Cantidad', 'Cliente', 'Notas'];
  const rows = [header, ...txs.map((t) => [
    t.fecha, t.tipo, categoryLabel(t.tipo, t.categoria), t.concepto, t.monto.toFixed(2),
    t.productoId ? pMap[t.productoId] || '' : '', t.cantidad || '',
    t.clienteId ? cMap[t.clienteId] || '' : '', t.nota || '',
  ])];
  const base = filenameBase || `life-manager_movimientos_${todayISO()}`;
  if (format === 'xls') downloadXLS(`${base}.xls`, sheetName || 'Movimientos', rows);
  else downloadCSV(`${base}.csv`, rows);
}

// ============================================================
// CRM — clients, projects, payments, WhatsApp
// ============================================================

const PROJECT_STATES = [
  { id: 'pendiente',  label: 'Pendiente',  cls: 'pendiente' },
  { id: 'proceso',    label: 'En proceso', cls: 'proceso' },
  { id: 'finalizado', label: 'Finalizado', cls: 'finalizado' },
  { id: 'entregado',  label: 'Entregado',  cls: 'entregado' },
];
function projectStateMeta(id) {
  return PROJECT_STATES.find((s) => s.id === id) || PROJECT_STATES[0];
}

const PAYMENT_METHODS = [
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'efectivo',      label: 'Efectivo' },
  { id: 'deposito',      label: 'Depósito' },
  { id: 'payphone',      label: 'PayPhone' },
  { id: 'otros',         label: 'Otros' },
];
function paymentMethodLabel(id) {
  const m = PAYMENT_METHODS.find((x) => x.id === id);
  return m ? m.label : (id || '—');
}

const OBSERVATION_PRESETS = [
  'Falta logo',
  'Falta información del negocio',
  'Falta imágenes',
  'Cliente debe aprobar diseño',
  'Solicitud de valores adicionales',
];

function projectPaid(project) {
  if (!project || !Array.isArray(project.pagos)) return 0;
  return project.pagos.reduce((s, p) => s + (+p.monto || 0), 0);
}
function projectPending(project) {
  return Math.max(0, (+project.precioTotal || 0) - projectPaid(project));
}

// Days until a date (negative = overdue). Returns null if no date.
function daysUntil(iso) {
  if (!iso) return null;
  const target = new Date(iso + 'T00:00:00');
  const diff = target.getTime() - TODAY.getTime();
  return Math.round(diff / 86400000);
}

// Build the WhatsApp message a client receives — full detail
function buildWhatsappMessage(project, client, bank) {
  const total = +project.precioTotal || 0;
  const paid = projectPaid(project);
  const pending = projectPending(project);
  const estado = projectStateMeta(project.estado).label;
  const nombre = [client.nombre, client.apellido].filter(Boolean).join(' ') || 'cliente';
  const pagos = [...(project.pagos || [])].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

  // Estado de pago: pagado / abonado parcial / sin abono
  let pagoEstado, pagoIcon;
  if (total <= 0 || pending <= 0.009) { pagoEstado = 'PAGADO ✔️'; pagoIcon = '🟢'; }
  else if (paid > 0) { pagoEstado = 'ABONADO PARCIAL'; pagoIcon = '🟡'; }
  else { pagoEstado = 'PENDIENTE DE PAGO'; pagoIcon = '🔴'; }
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  const lines = [];
  lines.push(`Hola ${client.nombre || nombre} 👋`);
  lines.push('Te compartimos el detalle de tu cuenta:');
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━');
  lines.push(`📋 *${project.nombre}*`);
  if (project.descripcion) lines.push(`_${project.descripcion}_`);
  lines.push(`📌 Estado del trabajo: *${estado}*`);
  lines.push('━━━━━━━━━━━━━━━');
  lines.push('');

  // Fechas
  if (project.fechaInicio) lines.push(`🗓️ Inicio: ${formatDateFull(project.fechaInicio)}`);
  if (!project.plazoIndefinido && project.fechaLimite) lines.push(`⏳ Entrega: ${formatDateFull(project.fechaLimite)}`);
  if (project.fechaInicio || (!project.plazoIndefinido && project.fechaLimite)) lines.push('');

  // Resumen de pago
  lines.push(`${pagoIcon} *Estado de pago: ${pagoEstado}*`);
  lines.push('');
  lines.push(`💵 Valor total: ${money(total)}`);
  lines.push(`✅ Abonado: ${money(paid)}  (${pct}%)`);
  lines.push(`🔻 Saldo pendiente: ${money(pending)}`);

  // Historial de abonos
  if (pagos.length > 0) {
    lines.push('');
    lines.push('🧾 *Detalle de abonos:*');
    pagos.forEach((p, i) => {
      const met = paymentMethodLabel(p.metodo);
      lines.push(`  ${i + 1}. ${formatDateFull(p.fecha)} — ${money(p.monto)} (${met})`);
    });
  }

  // Datos de pago si hay saldo
  if (pending > 0.009 && bank && (bank.banco || bank.numeroCuenta)) {
    lines.push('');
    lines.push('💳 *Para abonar el saldo:*');
    if (bank.banco)        lines.push(`🏦 Banco: ${bank.banco}`);
    if (bank.tipoCuenta)   lines.push(`📂 Tipo: Cuenta ${bank.tipoCuenta}`);
    if (bank.numeroCuenta) lines.push(`#️⃣ N° de cuenta: ${bank.numeroCuenta}`);
    if (bank.titular)      lines.push(`👤 Titular: ${bank.titular}`);
  }

  lines.push('');
  if (pending <= 0.009 && total > 0) {
    lines.push('¡Tu cuenta está al día! Gracias por tu confianza 🙌');
  } else {
    lines.push('¡Gracias por confiar en nuestro trabajo! 🙌');
  }
  return lines.join('\n');
}

// Normalise a phone to digits and build a wa.me link
function whatsappLink(phone, message) {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

// ============================================================
// Deudas — cuentas por cobrar (me deben) y por pagar (yo debo)
// ============================================================

// 'cobrar' = un cliente me debe (fiado) · 'pagar' = yo le debo a alguien
const DEBT_DIRECTIONS = [
  { id: 'cobrar', label: 'Por cobrar', persona: 'Cliente', who: 'Me debe' },
  { id: 'pagar',  label: 'Por pagar',  persona: 'Acreedor', who: 'Le debo' },
];

function debtPaid(d) {
  if (!d || !Array.isArray(d.pagos)) return 0;
  return d.pagos.reduce((s, p) => s + (+p.monto || 0), 0);
}
function debtBalance(d) {
  return Math.max(0, (+d.total || 0) - debtPaid(d));
}

// Semáforo de cobro: 'pagado' | 'aldia' | 'porvencer' | 'vencido'
function debtStatus(d) {
  if (debtBalance(d) <= 0.009) return 'pagado';
  const dleft = daysUntil(d.fechaVencimiento);
  if (dleft == null) return 'aldia';
  if (dleft < 0) return 'vencido';
  if (dleft <= 3) return 'porvencer';
  return 'aldia';
}
const DEBT_STATUS_META = {
  pagado:    { label: 'Pagado',           cls: 'pagado',    dot: 'pagado' },
  aldia:     { label: 'Al día',           cls: 'aldia',     dot: 'verde' },
  porvencer: { label: 'Próximo a vencer', cls: 'porvencer', dot: 'amarillo' },
  vencido:   { label: 'Vencido',          cls: 'vencido',   dot: 'rojo' },
};
function debtStatusMeta(d) { return DEBT_STATUS_META[debtStatus(d)] || DEBT_STATUS_META.aldia; }

// Mensaje de recordatorio de cobro (WhatsApp)
function buildDebtReminder(d, bank) {
  const saldo = debtBalance(d);
  const lines = [];
  lines.push(`Hola ${d.contraparte || ''} 👋`.trim());
  lines.push('');
  lines.push(`Te recuerdo amablemente el saldo pendiente${d.concepto ? ` de *${d.concepto}*` : ''}:`);
  lines.push('');
  lines.push(`💵 Valor total: ${money(d.total)}`);
  lines.push(`✅ Abonado: ${money(debtPaid(d))}`);
  lines.push(`🔻 Saldo pendiente: ${money(saldo)}`);
  if (d.fechaVencimiento) lines.push(`📅 Vence: ${formatDateFull(d.fechaVencimiento)}`);
  if (bank && (bank.banco || bank.numeroCuenta)) {
    lines.push('');
    lines.push('Puedes abonar a la siguiente cuenta:');
    if (bank.banco)        lines.push(`🏦 Banco: ${bank.banco}`);
    if (bank.tipoCuenta)   lines.push(`📂 Tipo: Cuenta ${bank.tipoCuenta}`);
    if (bank.numeroCuenta) lines.push(`#️⃣ N° de cuenta: ${bank.numeroCuenta}`);
    if (bank.titular)      lines.push(`👤 Titular: ${bank.titular}`);
  }
  lines.push('');
  lines.push('¡Gracias! 🙌');
  return lines.join('\n');
}

Object.assign(window, {
  emptyState, loadState, saveState, newId,
  startOfPeriod, endOfPeriod, shiftPeriod,
  formatPeriodLabel, formatDate, formatDateFull, todayISO,
  money, moneyCompact, aggregate, chartBuckets, sparkSeries,
  MONTHS, MONTHS_SHORT, WEEKDAYS_SHORT,
  downloadCSV, exportTransactions, downloadXLS, exportMovements,
  // CRM
  PROJECT_STATES, projectStateMeta, PAYMENT_METHODS, paymentMethodLabel, OBSERVATION_PRESETS,
  projectPaid, projectPending, daysUntil, buildWhatsappMessage, whatsappLink,
  // Deudas
  DEBT_DIRECTIONS, debtPaid, debtBalance, debtStatus, DEBT_STATUS_META, debtStatusMeta, buildDebtReminder,
});
