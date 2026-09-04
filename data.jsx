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
    pedidos: [],
    repartidores: [],
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
      pedidos: Array.isArray(parsed.pedidos) ? parsed.pedidos : [],
      repartidores: Array.isArray(parsed.repartidores) ? parsed.repartidores : [],
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
// Reporte consolidado por cliente (todos los proyectos)
// ============================================================
function reportClientName(c) {
  return [c.nombre, c.apellido].filter(Boolean).join(' ') || 'Sin nombre';
}
function clientReportTotals(projects) {
  let total = 0, abonado = 0, pendiente = 0;
  for (const p of projects) { total += +p.precioTotal || 0; abonado += projectPaid(p); pendiente += projectPending(p); }
  return { total, abonado, pendiente, count: projects.length };
}
function projectPagoEstado(p) {
  const total = +p.precioTotal || 0, pend = projectPending(p), paid = projectPaid(p);
  if (total <= 0 || pend <= 0.009) return { label: 'Pagado', icon: '🟢', cls: 'pagado' };
  if (paid > 0) return { label: 'Abonado parcial', icon: '🟡', cls: 'parcial' };
  return { label: 'Pendiente', icon: '🔴', cls: 'pendiente' };
}

// Texto para WhatsApp: resumen de TODOS los proyectos del cliente
function buildClientReport(client, projects, bank) {
  const nombre = client.nombre || reportClientName(client) || 'cliente';
  const t = clientReportTotals(projects);
  const lines = [];
  lines.push(`Hola ${nombre} 👋`);
  lines.push('Este es el *reporte completo* de tus proyectos:');
  lines.push('');
  lines.push('═══════════════════');
  lines.push(`📊 *RESUMEN GENERAL*`);
  lines.push(`📁 Proyectos: ${t.count}`);
  lines.push(`💵 Valor total: ${money(t.total)}`);
  lines.push(`✅ Abonado: ${money(t.abonado)}`);
  lines.push(`🔻 Saldo total pendiente: ${money(t.pendiente)}`);
  lines.push('═══════════════════');

  projects.forEach((p, i) => {
    const est = projectPagoEstado(p);
    const trabajo = projectStateMeta(p.estado).label;
    const total = +p.precioTotal || 0;
    lines.push('');
    lines.push(`*${i + 1}. ${p.nombre}*`);
    lines.push(`   📌 Trabajo: ${trabajo}`);
    lines.push(`   ${est.icon} Pago: ${est.label}`);
    if (p.fechaInicio) lines.push(`   🗓️ Inicio: ${formatDateFull(p.fechaInicio)}`);
    if (!p.plazoIndefinido && p.fechaLimite) lines.push(`   ⏳ Entrega: ${formatDateFull(p.fechaLimite)}`);
    lines.push(`   💵 Total: ${money(total)}  ·  ✅ ${money(projectPaid(p))}  ·  🔻 ${money(projectPending(p))}`);
  });

  if (t.pendiente > 0.009 && bank && (bank.banco || bank.numeroCuenta)) {
    lines.push('');
    lines.push('═══════════════════');
    lines.push('💳 *Para abonar tu saldo:*');
    if (bank.banco)        lines.push(`🏦 Banco: ${bank.banco}`);
    if (bank.tipoCuenta)   lines.push(`📂 Tipo: Cuenta ${bank.tipoCuenta}`);
    if (bank.numeroCuenta) lines.push(`#️⃣ N° de cuenta: ${bank.numeroCuenta}`);
    if (bank.titular)      lines.push(`👤 Titular: ${bank.titular}`);
  }
  lines.push('');
  lines.push(t.pendiente <= 0.009 && t.total > 0 ? '¡Tu cuenta está al día! Gracias por tu confianza 🙌' : '¡Gracias por confiar en nuestro trabajo! 🙌');
  return lines.join('\n');
}

// HTML imprimible (para guardar como PDF) — reporte por cliente
function buildClientReportHTML(client, projects, bank) {
  const t = clientReportTotals(projects);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hoy = formatDateFull(todayISO());
  const rows = projects.map((p, i) => {
    const est = projectPagoEstado(p);
    const trabajo = projectStateMeta(p.estado).label;
    const entrega = p.plazoIndefinido ? 'Indefinido' : (p.fechaLimite ? formatDateFull(p.fechaLimite) : '—');
    return `<tr>
      <td class="c-num">${i + 1}</td>
      <td><div class="p-name">${esc(p.nombre)}</div>${p.descripcion ? `<div class="p-desc">${esc(p.descripcion)}</div>` : ''}</td>
      <td>${esc(trabajo)}</td>
      <td><span class="pill pill-${est.cls}">${esc(est.label)}</span></td>
      <td class="c-date">${esc(entrega)}</td>
      <td class="c-num money">${money(+p.precioTotal || 0)}</td>
      <td class="c-num money pos">${money(projectPaid(p))}</td>
      <td class="c-num money neg">${money(projectPending(p))}</td>
    </tr>`;
  }).join('');

  const bankBlock = (t.pendiente > 0.009 && bank && (bank.banco || bank.numeroCuenta)) ? `
    <div class="bank">
      <div class="bank-title">Datos para el pago del saldo</div>
      <div class="bank-grid">
        ${bank.banco ? `<div><span>Banco</span><strong>${esc(bank.banco)}</strong></div>` : ''}
        ${bank.tipoCuenta ? `<div><span>Tipo</span><strong>Cuenta ${esc(bank.tipoCuenta)}</strong></div>` : ''}
        ${bank.numeroCuenta ? `<div><span>N° de cuenta</span><strong>${esc(bank.numeroCuenta)}</strong></div>` : ''}
        ${bank.titular ? `<div><span>Titular</span><strong>${esc(bank.titular)}</strong></div>` : ''}
      </div>
    </div>` : '';

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Reporte ${esc(reportClientName(client))}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #14140F; margin: 0; font-size: 13px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1C6B43; padding-bottom: 16px; margin-bottom: 22px; }
  .brand { display: flex; align-items: center; gap: 8px; }
  .brand .sq { width: 12px; height: 12px; background: #1C6B43; border-radius: 2px; }
  .brand b { font-size: 18px; letter-spacing: -.02em; }
  .head .meta { text-align: right; font-size: 11px; color: #6B6862; line-height: 1.5; }
  h1 { font-size: 22px; margin: 0 0 2px; }
  .sub { color: #6B6862; font-size: 12px; }
  .contact { font-size: 11px; color: #6B6862; margin-top: 4px; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 0 0 22px; }
  .sc { border: 1px solid #E2DED4; border-radius: 8px; padding: 12px 14px; }
  .sc span { display: block; font-size: 9px; letter-spacing: .09em; text-transform: uppercase; color: #8E8B84; margin-bottom: 5px; }
  .sc strong { font-size: 19px; font-variant-numeric: tabular-nums; }
  .sc.pos strong { color: #1C6B43; } .sc.neg strong { color: #A8392A; }
  table { width: 100%; border-collapse: collapse; }
  thead th { text-align: left; font-size: 9px; letter-spacing: .07em; text-transform: uppercase; color: #8E8B84; border-bottom: 1.5px solid #14140F; padding: 0 8px 7px; }
  tbody td { padding: 11px 8px; border-bottom: 1px solid #ECE8DE; vertical-align: top; }
  th.c-num, td.c-num { text-align: right; }
  .money { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .money.pos { color: #1C6B43; } .money.neg { color: #A8392A; }
  .p-name { font-weight: 600; } .p-desc { color: #8E8B84; font-size: 11px; margin-top: 2px; }
  .c-date { color: #555; white-space: nowrap; }
  .pill { display: inline-block; font-size: 9.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; border: 1px solid; white-space: nowrap; }
  .pill-pagado { color: #1C6B43; border-color: #1C6B43; background: #EAF4EE; }
  .pill-parcial { color: #8A6D1F; border-color: #D8AA3A; background: #FBF3DE; }
  .pill-pendiente { color: #A8392A; border-color: #A8392A; background: #F8ECE9; }
  tfoot td { padding: 12px 8px; font-weight: 700; border-top: 2px solid #14140F; font-variant-numeric: tabular-nums; }
  .bank { margin-top: 24px; border: 1px solid #E2DED4; border-left: 4px solid #1C6B43; border-radius: 8px; padding: 14px 16px; background: #FAFAF7; }
  .bank-title { font-weight: 700; margin-bottom: 10px; font-size: 12px; }
  .bank-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; }
  .bank-grid span { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .07em; color: #8E8B84; }
  .bank-grid strong { font-size: 13px; }
  .foot { margin-top: 28px; text-align: center; color: #8E8B84; font-size: 11px; }
</style></head>
<body>
  <div class="head">
    <div>
      <div class="brand"><span class="sq"></span><b>Life Manager</b></div>
      <h1 style="margin-top:14px">${esc(reportClientName(client))}</h1>
      <div class="sub">Reporte de proyectos y estado de pagos</div>
      <div class="contact">${[client.whatsapp ? '📱 ' + esc(client.whatsapp) : '', client.email ? '✉ ' + esc(client.email) : '', client.cedula ? '🪪 ' + esc(client.cedula) : ''].filter(Boolean).join('  ·  ')}</div>
    </div>
    <div class="meta">Emitido<br><strong>${esc(hoy)}</strong></div>
  </div>

  <div class="summary">
    <div class="sc"><span>Proyectos</span><strong>${t.count}</strong></div>
    <div class="sc"><span>Valor total</span><strong>${money(t.total)}</strong></div>
    <div class="sc pos"><span>Abonado</span><strong>${money(t.abonado)}</strong></div>
    <div class="sc neg"><span>Saldo pendiente</span><strong>${money(t.pendiente)}</strong></div>
  </div>

  <table>
    <thead><tr>
      <th class="c-num">#</th><th>Proyecto</th><th>Trabajo</th><th>Pago</th><th>Entrega</th>
      <th class="c-num">Total</th><th class="c-num">Abonado</th><th class="c-num">Saldo</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="5">Totales</td>
      <td class="c-num">${money(t.total)}</td>
      <td class="c-num" style="color:#1C6B43">${money(t.abonado)}</td>
      <td class="c-num" style="color:#A8392A">${money(t.pendiente)}</td>
    </tr></tfoot>
  </table>

  ${bankBlock}

  <div class="foot">Gracias por confiar en nuestro trabajo · Generado con Life Manager</div>
</body></html>`;
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

// ============================================================
// Pedidos — delivery Guayaquil + ventas en local
// ============================================================

// Zonas de Guayaquil con flete sugerido (editable en cada pedido)
const ZONAS_GYE = [
  { id: 'centro',      label: 'Centro',                 flete: 2.50 },
  { id: 'urdesa',      label: 'Urdesa · Ceibos',        flete: 3.00 },
  { id: 'alborada',    label: 'Alborada · Garzota',     flete: 3.00 },
  { id: 'sauces',      label: 'Sauces · Guayacanes',    flete: 3.00 },
  { id: 'samanes',     label: 'Samanes · Kennedy',      flete: 3.00 },
  { id: 'via_daule',   label: 'Vía a Daule · Mucho Lote', flete: 4.00 },
  { id: 'via_costa',   label: 'Vía a la Costa',         flete: 4.50 },
  { id: 'sur',         label: 'Sur · Centenario',       flete: 3.50 },
  { id: 'guasmo',      label: 'Guasmo · Floresta',      flete: 4.00 },
  { id: 'suburbio',    label: 'Suburbio · Trinitaria',  flete: 4.00 },
  { id: 'samborondon', label: 'Samborondón · La Puntilla', flete: 5.00 },
  { id: 'aurora',      label: 'La Aurora · Daule',      flete: 5.00 },
  { id: 'duran',       label: 'Durán',                  flete: 5.00 },
  { id: 'otro',        label: 'Otra zona',              flete: 0 },
];
function zonaMeta(id) { return ZONAS_GYE.find((z) => z.id === id) || ZONAS_GYE[ZONAS_GYE.length - 1]; }
function zonaLabel(id) { return id ? zonaMeta(id).label : '—'; }

// Estados operativos del pedido
const PEDIDO_ESTADOS = [
  { id: 'nuevo',      label: 'Por confirmar', short: 'Por confirmar', cls: 'nuevo',      dot: 'gris' },
  { id: 'confirmado', label: 'Confirmado',    short: 'Confirmado',    cls: 'confirmado', dot: 'azul' },
  { id: 'ruta',       label: 'En ruta',       short: 'En ruta',       cls: 'ruta',       dot: 'amarillo' },
  { id: 'entregado',  label: 'Entregado',     short: 'Entregado',     cls: 'entregado',  dot: 'verde' },
  { id: 'reagendado', label: 'Reagendado',    short: 'Reagendado',    cls: 'reagendado', dot: 'amarillo' },
  { id: 'devuelto',   label: 'Devuelto',      short: 'Devuelto',      cls: 'devuelto',   dot: 'rojo' },
  { id: 'cancelado',  label: 'Cancelado',     short: 'Cancelado',     cls: 'cancelado',  dot: 'gris' },
];
function pedidoEstadoMeta(id) { return PEDIDO_ESTADOS.find((e) => e.id === id) || PEDIDO_ESTADOS[0]; }

// Estados que ya cerraron el ciclo (no cuentan como pendientes)
const ESTADOS_CERRADOS = ['entregado', 'devuelto', 'cancelado'];
function pedidoAbierto(p) { return !ESTADOS_CERRADOS.includes(p.estado); }

// ---- Totales ------------------------------------------------
function pedidoSubtotal(p) {
  return (p.items || []).reduce((s, it) => s + (+it.precio || 0) * (+it.cantidad || 0), 0);
}
function pedidoUnidades(p) {
  return (p.items || []).reduce((s, it) => s + (+it.cantidad || 0), 0);
}
function pedidoTotal(p) {
  return Math.max(0, pedidoSubtotal(p) - (+p.descuento || 0) + (+p.flete || 0));
}
// Lo que el negocio se queda: total menos el flete que se lleva el repartidor
function pedidoNeto(p) {
  return pedidoTotal(p) - (p.fleteParaRepartidor ? (+p.flete || 0) : 0);
}
function pedidoItemsResumen(p) {
  const items = p.items || [];
  if (!items.length) return '—';
  const first = `${items[0].cantidad}× ${items[0].nombre}`;
  return items.length === 1 ? first : `${first} +${items.length - 1}`;
}
function nextPedidoNumero(pedidos) {
  let max = 0;
  for (const p of pedidos) { const n = parseInt(p.numero, 10); if (n > max) max = n; }
  return max + 1;
}
function pedidoRef(p) { return '#' + String(p.numero || 0).padStart(4, '0'); }

// ---- Cuadre de repartidores ---------------------------------
// Efectivo que el repartidor cobró y todavía no ha liquidado,
// menos los fletes que le corresponden.
function cuadreRepartidor(pedidos, repartidorId) {
  const suyos = pedidos.filter((p) => p.repartidorId === repartidorId);
  const entregados = suyos.filter((p) => p.estado === 'entregado');
  const porLiquidar = entregados.filter((p) => !p.liquidado);

  let efectivo = 0, otros = 0, fletes = 0;
  for (const p of porLiquidar) {
    if (p.metodoPago === 'efectivo') efectivo += pedidoTotal(p);
    else otros += pedidoTotal(p);
    if (p.fleteParaRepartidor) fletes += (+p.flete || 0);
  }
  return {
    enRuta: suyos.filter((p) => p.estado === 'ruta').length,
    entregados: entregados.length,
    porLiquidar,
    efectivo,          // plata en mano del repartidor
    otros,             // cobrado por transferencia / payphone
    fletes,            // lo que hay que pagarle
    aRecibir: efectivo - fletes,
    devueltos: suyos.filter((p) => p.estado === 'devuelto').length,
  };
}

function repartidorNombre(reps, id) {
  const r = (reps || []).find((x) => x.id === id);
  return r ? r.nombre : '';
}

// ---- Enlaces y mensajes -------------------------------------
function mapsLink(direccion, referencia) {
  const q = [direccion, referencia, 'Guayaquil, Ecuador'].filter(Boolean).join(', ');
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
}

// Confirmación que recibe el cliente por WhatsApp
function buildPedidoWhatsapp(p, negocio) {
  const L = [];
  L.push(`Hola ${p.clienteNombre || ''} 👋`.trim());
  L.push(`Confirmamos tu pedido *${pedidoRef(p)}*:`);
  L.push('');
  (p.items || []).forEach((it) => {
    L.push(`• ${it.cantidad}× ${it.nombre} — ${money((+it.precio || 0) * (+it.cantidad || 0))}`);
  });
  L.push('');
  L.push(`Subtotal: ${money(pedidoSubtotal(p))}`);
  if (+p.descuento > 0) L.push(`Descuento: −${money(p.descuento)}`);
  L.push(`Envío (${zonaLabel(p.zona)}): ${money(p.flete)}`);
  L.push(`*Total a pagar: ${money(pedidoTotal(p))}*`);
  L.push('');
  L.push(`📍 Dirección: ${p.direccion || '—'}`);
  if (p.referencia) L.push(`🧭 Referencia: ${p.referencia}`);
  if (p.fechaEntrega) L.push(`🚚 Entrega: ${formatDateFull(p.fechaEntrega)}${p.horario ? ` · ${p.horario}` : ''}`);
  L.push(`💵 Pago: ${paymentMethodLabel(p.metodoPago)}${p.metodoPago === 'efectivo' ? ' (contra entrega)' : ''}`);
  L.push('');
  L.push('Nuestro repartidor te escribe antes de llegar. ¡Gracias por tu compra! 🙌');
  if (negocio) L.push(`— ${negocio}`);
  return L.join('\n');
}

// Hoja de ruta que recibe el repartidor por WhatsApp
function buildRutaWhatsapp(repartidor, pedidos, fecha) {
  const L = [];
  let cobrar = 0, fletes = 0;
  L.push(`🛵 *RUTA ${fecha ? formatDateFull(fecha).toUpperCase() : 'DE HOY'}*`);
  L.push(`Repartidor: ${repartidor ? repartidor.nombre : '—'}`);
  L.push(`Paradas: ${pedidos.length}`);
  L.push('━━━━━━━━━━━━━━━');
  pedidos.forEach((p, i) => {
    const t = pedidoTotal(p);
    if (p.metodoPago === 'efectivo') cobrar += t;
    if (p.fleteParaRepartidor) fletes += (+p.flete || 0);
    L.push('');
    L.push(`*${i + 1}. ${pedidoRef(p)} · ${p.clienteNombre || 'Sin nombre'}*`);
    L.push(`📍 ${p.direccion || '—'}`);
    if (p.referencia) L.push(`🧭 ${p.referencia}`);
    L.push(`🗺️ ${zonaLabel(p.zona)}`);
    if (p.clienteTelefono) L.push(`📱 ${p.clienteTelefono}`);
    L.push(`📦 ${(p.items || []).map((it) => `${it.cantidad}× ${it.nombre}`).join(', ') || '—'}`);
    L.push(p.metodoPago === 'efectivo'
      ? `💵 COBRAR ${money(t)} en efectivo`
      : `✅ YA PAGADO (${paymentMethodLabel(p.metodoPago)}) — no cobrar`);
    if (p.nota) L.push(`📝 ${p.nota}`);
  });
  L.push('');
  L.push('━━━━━━━━━━━━━━━');
  L.push(`💵 Total a cobrar: *${money(cobrar)}*`);
  if (fletes > 0) L.push(`🛵 Tus fletes: ${money(fletes)}`);
  L.push('Avísame cuando termines para cuadrar. 🙌');
  return L.join('\n');
}

// ---- Cierre de caja (ventas en local) -----------------------
function cierreCaja(pedidos, fechaISO) {
  const dia = pedidos.filter((p) => p.canal === 'local' && p.fecha === fechaISO && p.estado !== 'cancelado');
  const porMetodo = {};
  let total = 0;
  for (const p of dia) {
    const t = pedidoTotal(p);
    total += t;
    porMetodo[p.metodoPago || 'efectivo'] = (porMetodo[p.metodoPago || 'efectivo'] || 0) + t;
  }
  return {
    fecha: fechaISO,
    tickets: dia.length,
    total,
    promedio: dia.length ? total / dia.length : 0,
    efectivo: porMetodo.efectivo || 0,
    porMetodo,
    unidades: dia.reduce((s, p) => s + pedidoUnidades(p), 0),
    lista: dia,
  };
}

function buildCierreCajaTexto(c) {
  const L = [];
  L.push(`🧾 *CIERRE DE CAJA · ${formatDateFull(c.fecha)}*`);
  L.push('━━━━━━━━━━━━━━━');
  L.push(`Tickets: ${c.tickets}`);
  L.push(`Unidades vendidas: ${c.unidades}`);
  L.push(`Ticket promedio: ${money(c.promedio)}`);
  L.push('');
  PAYMENT_METHODS.forEach((m) => {
    if (c.porMetodo[m.id]) L.push(`${m.label}: ${money(c.porMetodo[m.id])}`);
  });
  L.push('');
  L.push(`*TOTAL DEL DÍA: ${money(c.total)}*`);
  L.push(`💵 Efectivo en caja: ${money(c.efectivo)}`);
  return L.join('\n');
}

// ---- Exportar pedidos ---------------------------------------
function exportPedidos({ format, pedidos, repartidores, filenameBase }) {
  const header = [
    'N°', 'Fecha', 'Canal', 'Cliente', 'Teléfono', 'Zona', 'Dirección', 'Referencia',
    'Productos', 'Unidades', 'Subtotal', 'Descuento', 'Envío', 'Total',
    'Pago', 'Repartidor', 'Estado', 'Liquidado', 'Nota',
  ];
  const rows = [header, ...pedidos.map((p) => [
    pedidoRef(p), p.fecha, p.canal === 'local' ? 'Local' : 'Delivery',
    p.clienteNombre || '', p.clienteTelefono || '',
    p.canal === 'local' ? 'Local' : zonaLabel(p.zona),
    p.direccion || '', p.referencia || '',
    (p.items || []).map((it) => `${it.cantidad}x ${it.nombre}`).join(' | '),
    pedidoUnidades(p),
    pedidoSubtotal(p).toFixed(2), (+p.descuento || 0).toFixed(2), (+p.flete || 0).toFixed(2),
    pedidoTotal(p).toFixed(2),
    paymentMethodLabel(p.metodoPago),
    repartidorNombre(repartidores, p.repartidorId),
    pedidoEstadoMeta(p.estado).label,
    p.liquidado ? 'Sí' : 'No',
    p.nota || '',
  ])];
  const base = filenameBase || `life-manager_pedidos_${todayISO()}`;
  if (format === 'csv') downloadCSV(`${base}.csv`, rows);
  else downloadXLS(`${base}.xls`, 'Pedidos', rows);
}

// Convierte un pedido entregado/vendido en un movimiento de venta
function pedidoToTransaction(p) {
  return {
    id: 'tx_ped_' + p.id,
    tipo: 'venta',
    categoria: 'producto',
    concepto: p.canal === 'local'
      ? `Venta en local ${pedidoRef(p)}${p.clienteNombre ? ` · ${p.clienteNombre}` : ''}`
      : `Pedido delivery ${pedidoRef(p)} · ${p.clienteNombre || 'sin nombre'}`,
    monto: +pedidoTotal(p).toFixed(2),
    fecha: p.canal === 'local' ? p.fecha : (p.fechaEntregaReal || p.fechaEntrega || p.fecha),
    cantidad: pedidoUnidades(p),
    clienteId: p.clienteId || '',
    productoId: (p.items && p.items.length === 1 && p.items[0].productoId) ? p.items[0].productoId : '',
    nota: [(p.canal === 'local' ? 'Local' : zonaLabel(p.zona)), paymentMethodLabel(p.metodoPago), p.nota].filter(Boolean).join(' · '),
    origen: 'pedido',
    pedidoId: p.id,
  };
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
  // Reporte por cliente
  buildClientReport, buildClientReportHTML, clientReportTotals, projectPagoEstado,
  // Pedidos
  ZONAS_GYE, zonaMeta, zonaLabel, PEDIDO_ESTADOS, pedidoEstadoMeta, pedidoAbierto,
  pedidoSubtotal, pedidoUnidades, pedidoTotal, pedidoNeto, pedidoItemsResumen,
  nextPedidoNumero, pedidoRef, cuadreRepartidor, repartidorNombre, mapsLink,
  buildPedidoWhatsapp, buildRutaWhatsapp, cierreCaja, buildCierreCajaTexto,
  exportPedidos, pedidoToTransaction,
});
