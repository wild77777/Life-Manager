// ============================================================
// Life Manager — shared components (chrome, charts, drawers)
// ============================================================
const { useState, useMemo, useEffect, useRef } = React;

function classNames(...a) { return a.filter(Boolean).join(' '); }

// ---- Delta + Sparkline -------------------------------------
function Delta({ now, prev }) {
  if (!prev) return <span className="delta neutral">— sin dato previo</span>;
  const change = now - prev;
  const pct = (change / Math.max(1, Math.abs(prev))) * 100;
  const sign = change > 0 ? '+' : change < 0 ? '−' : '';
  const cls = change > 0 ? 'pos' : change < 0 ? 'neg' : 'neutral';
  const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '·';
  return (
    <span className={`delta ${cls}`}>
      <span className="delta-arrow">{arrow}</span>
      {sign}{Math.abs(pct).toFixed(1)}% <span className="delta-vs">vs anterior</span>
    </span>
  );
}

function Sparkline({ values, height = 28, stroke = 'var(--ink)', fill = false }) {
  if (!values || !values.length) return null;
  const allZero = values.every((v) => v === 0);
  const w = 96, h = height;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const step = w / (values.length - 1 || 1);
  const points = values.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y];
  });
  const d = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const dArea = `${d} L${w},${h} L0,${h} Z`;
  if (allZero) {
    return (
      <svg className="spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none">
        <line x1="0" y1={h - 2} x2={w} y2={h - 2} stroke="var(--hairline)" strokeDasharray="2 3" />
      </svg>
    );
  }
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none">
      {fill && <path d={dArea} fill="var(--ink-wash)" />}
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.25" />
    </svg>
  );
}

// ---- Header with nav ---------------------------------------
function Header({ view, setView, dataCount, onOpenAdd, onOpenExport }) {
  const links = [
    { id: 'resumen',   label: 'Resumen' },
    { id: 'movs',      label: 'Movimientos' },
    { id: 'inv',       label: 'Inventario' },
    { id: 'contactos', label: 'Contactos' },
    { id: 'deudas',    label: 'Deudas' },
    { id: 'reportes',  label: 'Reportes' },
    { id: 'crm',       label: 'CRM' },
  ];
  return (
    <header className="header">
      <div className="header-inner">
        <button className="brand-btn" onClick={() => setView('resumen')}>
          <span className="brand-mark" aria-hidden="true"></span>
          <span className="brand-word">Life Manager</span>
        </button>
        <nav className="nav">
          {links.map((l) => (
            <button
              key={l.id}
              className={classNames('nav-link', view === l.id && 'active')}
              onClick={() => setView(l.id)}
            >
              {l.label}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <span className="header-count">{dataCount.toLocaleString('es-ES')} movs</span>
          <button className="btn-ghost header-export" onClick={onOpenExport} title="Exportar a Excel o CSV">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5v8M3.5 6L7 9.5 10.5 6M2 12h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Exportar
          </button>
          <button className="btn-primary header-add" onClick={onOpenAdd}>
            <span aria-hidden="true">+</span> Nueva transacción
          </button>
        </div>
      </div>
    </header>
  );
}

// ---- Period bar --------------------------------------------
function PeriodBar({ period, setPeriod, anchor, setAnchor, label, eyebrow }) {
  const periods = [
    { id: 'dia', label: 'Día' },
    { id: 'semana', label: 'Semana' },
    { id: 'mes', label: 'Mes' },
    { id: 'anio', label: 'Año' },
  ];
  const isToday = +startOfPeriod(anchor, period) === +startOfPeriod(TODAY, period);

  return (
    <section className="action-bar">
      <div className="action-bar-left">
        <div className="page-eyebrow">{eyebrow}</div>
        <h1 className="page-title">{label}</h1>
      </div>
      <div className="action-bar-right">
        <div className="segmented" role="tablist" aria-label="Periodo">
          {periods.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={period === p.id}
              className={classNames('segmented-btn', period === p.id && 'is-active')}
              onClick={() => setPeriod(p.id)}
            >{p.label}</button>
          ))}
        </div>
        <div className="date-nav" aria-label="Navegar periodo">
          <button className="icon-btn" onClick={() => setAnchor(shiftPeriod(anchor, period, -1))} aria-label="Anterior">‹</button>
          <button
            className={classNames('icon-btn pill', isToday && 'is-disabled')}
            onClick={() => setAnchor(new Date(TODAY))}
            disabled={isToday}
            title="Ir al periodo actual"
          >Hoy</button>
          <button className="icon-btn" onClick={() => setAnchor(shiftPeriod(anchor, period, 1))} aria-label="Siguiente">›</button>
        </div>
      </div>
    </section>
  );
}

// ---- KPI ---------------------------------------------------
function KPICard({ label, value, prev, sparkValues, accent }) {
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <Sparkline values={sparkValues} fill={accent !== 'neg'} stroke={accent === 'neg' ? 'var(--neg)' : 'var(--ink)'} />
      </div>
      <div className="kpi-value">{money(value)}</div>
      <Delta now={value} prev={prev} />
    </div>
  );
}
function KPIRow({ stats, sparks }) {
  return (
    <div className="kpi-row">
      <KPICard label="Ingresos" value={stats.ingreso} prev={stats.prev.ingreso} sparkValues={sparks.ingreso} />
      <KPICard label="Gastos"   value={stats.gasto}   prev={stats.prev.gasto}   sparkValues={sparks.gasto} accent="neg" />
      <KPICard label="Ventas"   value={stats.venta}   prev={stats.prev.venta}   sparkValues={sparks.venta} />
      <KPICard label="Balance neto" value={stats.balance} prev={stats.prev.balance} sparkValues={sparks.balance} />
    </div>
  );
}

// ---- Flow chart --------------------------------------------
function FlowChart({ buckets, hasData }) {
  const [mode, setMode] = useState('diario');
  const totalIn = buckets.reduce((s, b) => s + b.ingreso + b.venta, 0);
  const totalOut = buckets.reduce((s, b) => s + b.gasto, 0);

  const w = 760, h = 240, padL = 44, padR = 16, padT = 16, padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const n = buckets.length;
  const gap = n > 30 ? 1 : n > 12 ? 2 : 4;
  const groupW = innerW / n;
  const barW = Math.max(2, (groupW - gap) / 2);

  let maxVal;
  if (mode === 'diario') {
    maxVal = Math.max(1, ...buckets.map(b => Math.max(b.ingreso + b.venta, b.gasto)));
  } else {
    let inAcc = 0, outAcc = 0, peak = 1;
    for (const b of buckets) { inAcc += b.ingreso + b.venta; outAcc += b.gasto; peak = Math.max(peak, inAcc, outAcc); }
    maxVal = peak;
  }
  const niceMax = hasData
    ? Math.pow(10, Math.floor(Math.log10(maxVal))) * Math.ceil(maxVal / Math.pow(10, Math.floor(Math.log10(maxVal))))
    : 100;
  const yMax = niceMax;
  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];
  const tickEvery = n <= 12 ? 1 : n <= 24 ? 4 : n <= 31 ? 5 : 1;

  return (
    <div className="card chart-card">
      <div className="card-head">
        <div>
          <div className="card-eyebrow">Flujo del periodo</div>
          <div className="card-title">Ingresos &amp; gastos</div>
        </div>
        <div className="chart-meta">
          <div className="legend">
            <span className="swatch in" /> <span>Entradas</span>
            <span className="dot">·</span>
            <span className="swatch out" /> <span>Gastos</span>
          </div>
          <div className="mini-tabs">
            <button className={classNames('mini-tab', mode === 'diario' && 'is-active')} onClick={() => setMode('diario')}>Por unidad</button>
            <button className={classNames('mini-tab', mode === 'acumulado' && 'is-active')} onClick={() => setMode('acumulado')}>Acumulado</button>
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" role="img" aria-label="Gráfico de ingresos y gastos">
        {yTicks.map((t, i) => {
          const y = padT + innerH - (t / yMax) * innerH;
          return (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="var(--hairline)" strokeDasharray={i === 0 ? '' : '2 3'} />
              <text x={padL - 8} y={y + 3} textAnchor="end" className="axis-label">{moneyCompact(t)}</text>
            </g>
          );
        })}
        {hasData && mode === 'diario' && buckets.map((b, i) => {
          const x = padL + i * groupW;
          const ent = b.ingreso + b.venta;
          const out = b.gasto;
          const hIn = (ent / yMax) * innerH;
          const hOut = (out / yMax) * innerH;
          const baseY = padT + innerH;
          return (
            <g key={i}>
              <rect x={x + gap / 2} y={baseY - hIn} width={barW} height={hIn} fill="var(--ink)" />
              <rect x={x + gap / 2 + barW} y={baseY - hOut} width={barW} height={hOut} fill="var(--ink-soft)" />
            </g>
          );
        })}
        {hasData && mode === 'acumulado' && (() => {
          let inAcc = 0, outAcc = 0;
          const inPts = []; const outPts = [];
          buckets.forEach((b, i) => {
            inAcc += b.ingreso + b.venta; outAcc += b.gasto;
            const x = padL + i * groupW + groupW / 2;
            inPts.push([x, padT + innerH - (inAcc / yMax) * innerH]);
            outPts.push([x, padT + innerH - (outAcc / yMax) * innerH]);
          });
          const toPath = (pts) => pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
          return (
            <g>
              <path d={toPath(inPts)} fill="none" stroke="var(--ink)" strokeWidth="1.5" />
              <path d={toPath(outPts)} fill="none" stroke="var(--ink-soft)" strokeWidth="1.5" strokeDasharray="3 3" />
              {inPts.map((p, i) => <circle key={'i'+i} cx={p[0]} cy={p[1]} r="2" fill="var(--ink)" />)}
            </g>
          );
        })()}
        {buckets.map((b, i) => {
          if (i % tickEvery !== 0 && i !== buckets.length - 1) return null;
          const x = padL + i * groupW + groupW / 2;
          return <text key={i} x={x} y={h - 8} textAnchor="middle" className="axis-label">{b.label}</text>;
        })}
        {!hasData && (
          <text x={w/2} y={h/2} textAnchor="middle" className="chart-empty-text">Sin movimientos en este periodo</text>
        )}
      </svg>
      <div className="chart-foot">
        <div className="foot-item"><span className="foot-label">Total entradas</span><span className="foot-value">{money(totalIn)}</span></div>
        <div className="foot-item"><span className="foot-label">Total gastos</span><span className="foot-value">{money(totalOut)}</span></div>
        <div className="foot-item"><span className="foot-label">Resultado</span><span className={classNames('foot-value', totalIn - totalOut < 0 && 'is-neg')}>{money(totalIn - totalOut)}</span></div>
      </div>
    </div>
  );
}

// ---- Categories panel --------------------------------------
function CategoriesPanel({ byCat, total }) {
  const rows = Object.entries(byCat)
    .map(([id, value]) => ({ id, label: categoryLabel('gasto', id), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const maxV = rows[0]?.value || 1;
  return (
    <div className="card cat-card">
      <div className="card-head">
        <div>
          <div className="card-eyebrow">Categorías</div>
          <div className="card-title">Gasto por categoría</div>
        </div>
        <div className="card-meta">{rows.length}</div>
      </div>
      {rows.length === 0 && <div className="empty">Sin gastos en este periodo.</div>}
      <ul className="cat-list">
        {rows.map((r) => (
          <li key={r.id} className="cat-row">
            <div className="cat-row-top">
              <span className="cat-name">{r.label}</span>
              <span className="cat-amount">{money(r.value)}</span>
            </div>
            <div className="cat-bar"><div className="cat-bar-fill" style={{ width: `${(r.value / maxV) * 100}%` }} /></div>
            <span className="cat-pct">{((r.value / Math.max(1, total)) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---- Toast -------------------------------------------------
function Toast({ text }) {
  if (!text) return null;
  return <div className="toast" role="status">{text}</div>;
}

// ---- Confirm dialog ----------------------------------------
function ConfirmDialog({ open, title, body, confirmLabel = 'Eliminar', danger = true, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <>
      <div className="drawer-scrim is-open" onClick={onCancel} />
      <div className="dialog" role="alertdialog">
        <div className="dialog-title">{title}</div>
        <div className="dialog-body">{body}</div>
        <div className="dialog-foot">
          <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className={classNames('btn-primary', danger && 'is-danger')} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </>
  );
}

// ---- Transaction drawer (create + edit) --------------------
function TransactionDrawer({ open, onClose, onSave, editing, products, clients }) {
  const isEdit = !!editing;
  const [tipo, setTipo] = useState('gasto');
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState('comida');
  const [fecha, setFecha] = useState(todayISO());
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [clienteId, setClienteId] = useState('');
  const [nota, setNota] = useState('');
  const [touched, setTouched] = useState(false);
  const [autoCalc, setAutoCalc] = useState(true);

  // Initialise when opened / editing changes
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTipo(editing.tipo);
      setMonto(String(editing.monto));
      setConcepto(editing.concepto);
      setCategoria(editing.categoria);
      setFecha(editing.fecha);
      setProductoId(editing.productoId || '');
      setCantidad(editing.cantidad || 1);
      setClienteId(editing.clienteId || '');
      setNota(editing.nota || '');
      setAutoCalc(false);
    } else {
      setTipo('gasto'); setMonto(''); setConcepto('');
      setCategoria('comida'); setFecha(todayISO());
      setProductoId(products[0]?.id || ''); setCantidad(1);
      setClienteId(clients[0]?.id || ''); setNota('');
      setAutoCalc(true);
    }
    setTouched(false);
  }, [open, editing]);

  const cats = CATEGORIES[tipo] || [];
  useEffect(() => { if (!cats.find((c) => c.id === categoria)) setCategoria(cats[0]?.id || ''); }, [tipo]);

  // Auto-fill amount + concept when product changes (sale type)
  useEffect(() => {
    if (tipo !== 'venta' || !autoCalc) return;
    const p = products.find((x) => x.id === productoId);
    if (p) {
      setMonto((p.precio * cantidad).toFixed(2));
      setConcepto(`Venta · ${p.nombre}`);
    }
  }, [tipo, productoId, cantidad, autoCalc, products]);

  const valid = monto && +monto > 0 && concepto.trim().length > 0 && fecha;

  function handleSave() {
    setTouched(true);
    if (!valid) return;
    const tx = {
      id: editing ? editing.id : newId('tx'),
      tipo, categoria,
      concepto: concepto.trim(),
      monto: +(+monto).toFixed(2),
      fecha,
      nota: nota.trim(),
    };
    if (tipo === 'venta') {
      if (productoId) tx.productoId = productoId;
      if (cantidad) tx.cantidad = +cantidad;
      if (clienteId) tx.clienteId = clienteId;
    }
    onSave(tx, isEdit);
    onClose();
  }

  return (
    <>
      <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
      <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="drawer-eyebrow">{isEdit ? 'Editar' : 'Nueva transacción'}</div>
            <div className="drawer-title">{isEdit ? 'Modificar movimiento' : 'Registrar movimiento'}</div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div className="drawer-body">
          <div className="type-tabs">
            {[
              { id: 'ingreso', label: 'Ingreso' },
              { id: 'gasto', label: 'Gasto' },
              { id: 'venta', label: 'Venta' },
            ].map((t) => (
              <button
                key={t.id}
                className={classNames('type-tab', tipo === t.id && 'is-active', `tab-${t.id}`)}
                onClick={() => { setTipo(t.id); setAutoCalc(t.id === 'venta'); }}
              >{t.label}</button>
            ))}
          </div>

          <div className="field amount-field">
            <label>Monto</label>
            <div className="amount-input">
              <span className="amount-symbol">$</span>
              <input
                type="number" inputMode="decimal" step="0.01" min="0"
                value={monto} onChange={(e) => { setMonto(e.target.value); setAutoCalc(false); }}
                placeholder="0.00"
              />
              <span className="amount-iso">USD</span>
            </div>
            {touched && (!monto || +monto <= 0) && <div className="field-error">Indica un monto mayor a 0.</div>}
          </div>

          {tipo === 'venta' && (
            <>
              {products.length === 0 ? (
                <div className="callout">
                  <strong>Sin productos.</strong> Crea un producto en <em>Inventario</em> antes de registrar ventas con producto, o deja este campo vacío y registra una venta libre.
                </div>
              ) : (
                <>
                  <div className="field">
                    <label>Producto</label>
                    <select value={productoId} onChange={(e) => { setProductoId(e.target.value); setAutoCalc(true); }}>
                      <option value="">— Sin producto específico —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.stock === 0 && !isEdit}>
                          {p.nombre} · {money(p.precio)} {p.stock === 0 ? '· sin stock' : `· ${p.stock} en stock`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Cantidad</label>
                      <input type="number" min="1" step="1" value={cantidad}
                        onChange={(e) => { setCantidad(Math.max(1, +e.target.value || 1)); setAutoCalc(true); }} />
                    </div>
                    <div className="field">
                      <label>Cliente</label>
                      <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                        <option value="">— Sin cliente —</option>
                        {clients.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className="field">
            <label>Concepto</label>
            <input value={concepto} onChange={(e) => { setConcepto(e.target.value); setAutoCalc(false); }} placeholder="ej. Supermercado del lunes" />
            {touched && !concepto.trim() && <div className="field-error">Agrega un concepto breve.</div>}
          </div>

          <div className="field">
            <label>Categoría</label>
            <div className="chip-row">
              {cats.map((c) => (
                <button key={c.id} className={classNames('chip', categoria === c.id && 'is-active')} onClick={() => setCategoria(c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>

          <div className="field">
            <label>Notas <span className="muted small">opcional</span></label>
            <textarea rows="2" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Detalles adicionales…" />
          </div>
        </div>

        <footer className="drawer-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave}>
            {isEdit ? 'Guardar cambios' : 'Guardar transacción'}
          </button>
        </footer>
      </aside>
    </>
  );
}

// ---- Product drawer ----------------------------------------
function ProductDrawer({ open, onClose, onSave, editing }) {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [costo, setCosto] = useState('');
  const [stock, setStock] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setNombre(editing.nombre); setPrecio(String(editing.precio));
      setCosto(String(editing.costo)); setStock(String(editing.stock));
    } else {
      setNombre(''); setPrecio(''); setCosto(''); setStock('0');
    }
    setTouched(false);
  }, [open, editing]);

  const valid = nombre.trim() && +precio >= 0 && +stock >= 0;
  function handleSave() {
    setTouched(true);
    if (!valid) return;
    onSave({
      id: editing ? editing.id : newId('prod'),
      nombre: nombre.trim(),
      precio: +(+precio || 0).toFixed(2),
      costo: +(+costo || 0).toFixed(2),
      stock: Math.max(0, parseInt(stock || '0', 10)),
    }, !!editing);
    onClose();
  }

  return (
    <>
      <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
      <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="drawer-eyebrow">{editing ? 'Editar producto' : 'Nuevo producto'}</div>
            <div className="drawer-title">{editing ? editing.nombre : 'Agregar al inventario'}</div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="drawer-body">
          <div className="field">
            <label>Nombre del producto</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="ej. Café tostado 250 g" />
            {touched && !nombre.trim() && <div className="field-error">Indica el nombre.</div>}
          </div>
          <div className="field-row">
            <div className="field">
              <label>Precio de venta (USD)</label>
              <input type="number" step="0.01" min="0" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="0.00" />
            </div>
            <div className="field">
              <label>Costo (USD)</label>
              <input type="number" step="0.01" min="0" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="field">
            <label>Stock inicial</label>
            <input type="number" step="1" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
          </div>
          {+precio > 0 && +costo > 0 && (
            <div className="callout">
              Margen: <strong>{money(+precio - +costo)}</strong> · {(((+precio - +costo) / +precio) * 100).toFixed(0)}% por unidad
            </div>
          )}
        </div>
        <footer className="drawer-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave}>{editing ? 'Guardar cambios' : 'Crear producto'}</button>
        </footer>
      </aside>
    </>
  );
}

// ---- Client drawer -----------------------------------------
function ClientDrawer({ open, onClose, onSave, editing }) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('Particular');
  const [ciudad, setCiudad] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setNombre(editing.nombre || ''); setTipo(editing.tipo || 'Particular');
      setCiudad(editing.ciudad || ''); setEmail(editing.email || ''); setTelefono(editing.telefono || '');
    } else {
      setNombre(''); setTipo('Particular'); setCiudad(''); setEmail(''); setTelefono('');
    }
    setTouched(false);
  }, [open, editing]);

  function handleSave() {
    setTouched(true);
    if (!nombre.trim()) return;
    onSave({
      id: editing ? editing.id : newId('cli'),
      nombre: nombre.trim(), tipo, ciudad: ciudad.trim(),
      email: email.trim(), telefono: telefono.trim(),
    }, !!editing);
    onClose();
  }

  return (
    <>
      <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
      <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="drawer-eyebrow">{editing ? 'Editar cliente' : 'Nuevo cliente'}</div>
            <div className="drawer-title">{editing ? editing.nombre : 'Agregar cliente'}</div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="drawer-body">
          <div className="field">
            <label>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="ej. María González" />
            {touched && !nombre.trim() && <div className="field-error">Indica el nombre.</div>}
          </div>
          <div className="field">
            <label>Tipo</label>
            <div className="chip-row">
              {['Particular', 'Empresa'].map((t) => (
                <button key={t} className={classNames('chip', tipo === t && 'is-active')} onClick={() => setTipo(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Ciudad <span className="muted small">opcional</span></label>
            <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="ej. Ciudad de México" />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Email <span className="muted small">opcional</span></label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@correo.com" />
            </div>
            <div className="field">
              <label>Teléfono <span className="muted small">opcional</span></label>
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+1 555 0000" />
            </div>
          </div>
        </div>
        <footer className="drawer-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave}>{editing ? 'Guardar cambios' : 'Crear cliente'}</button>
        </footer>
      </aside>
    </>
  );
}

// ---- Supplier drawer ---------------------------------------
function SupplierDrawer({ open, onClose, onSave, editing }) {
  const [nombre, setNombre] = useState('');
  const [concepto, setConcepto] = useState('');
  const [contacto, setContacto] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setNombre(editing.nombre || ''); setConcepto(editing.concepto || ''); setContacto(editing.contacto || '');
    } else {
      setNombre(''); setConcepto(''); setContacto('');
    }
    setTouched(false);
  }, [open, editing]);

  function handleSave() {
    setTouched(true);
    if (!nombre.trim()) return;
    onSave({
      id: editing ? editing.id : newId('sup'),
      nombre: nombre.trim(), concepto: concepto.trim(), contacto: contacto.trim(),
    }, !!editing);
    onClose();
  }

  return (
    <>
      <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
      <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="drawer-eyebrow">{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</div>
            <div className="drawer-title">{editing ? editing.nombre : 'Agregar proveedor'}</div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="drawer-body">
          <div className="field">
            <label>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="ej. Tostadores del Valle" />
            {touched && !nombre.trim() && <div className="field-error">Indica el nombre.</div>}
          </div>
          <div className="field">
            <label>Concepto / qué suministra</label>
            <input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="ej. Café en grano, empaques…" />
          </div>
          <div className="field">
            <label>Contacto <span className="muted small">opcional</span></label>
            <input value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Teléfono, email, persona de contacto…" />
          </div>
        </div>
        <footer className="drawer-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave}>{editing ? 'Guardar cambios' : 'Crear proveedor'}</button>
        </footer>
      </aside>
    </>
  );
}

// ---- Export drawer -----------------------------------------
function ExportDrawer({ open, onClose, transactions, products, clients, onToast }) {
  const [format, setFormat] = useState('xls');
  const [preset, setPreset] = useState('mes');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tipo, setTipo] = useState('todos');

  // Compute date range from preset
  useEffect(() => {
    if (preset === 'personalizado') return;
    const today = new Date(TODAY);
    let s, e;
    if (preset === 'hoy') { s = today; e = today; }
    else if (preset === 'semana') {
      s = startOfPeriod(today, 'semana');
      e = new Date(endOfPeriod(today, 'semana').getTime() - 86400000);
    }
    else if (preset === 'mes') {
      s = startOfPeriod(today, 'mes');
      e = new Date(endOfPeriod(today, 'mes').getTime() - 86400000);
    }
    else if (preset === 'mes_pasado') {
      const prev = shiftPeriod(today, 'mes', -1);
      s = startOfPeriod(prev, 'mes');
      e = new Date(endOfPeriod(prev, 'mes').getTime() - 86400000);
    }
    else if (preset === 'anio') {
      s = startOfPeriod(today, 'anio');
      e = new Date(endOfPeriod(today, 'anio').getTime() - 86400000);
    }
    else if (preset === 'todo') { s = null; e = null; }
    setFrom(s ? s.toISOString().slice(0,10) : '');
    setTo(e ? e.toISOString().slice(0,10) : '');
  }, [preset, open]);

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (tipo !== 'todos' && t.tipo !== tipo) return false;
      if (from && t.fecha < from) return false;
      if (to && t.fecha > to) return false;
      return true;
    });
  }, [transactions, tipo, from, to]);

  // Summary
  const summary = useMemo(() => {
    let i = 0, g = 0, v = 0;
    for (const t of filtered) {
      if (t.tipo === 'ingreso') i += t.monto;
      else if (t.tipo === 'gasto') g += t.monto;
      else if (t.tipo === 'venta') v += t.monto;
    }
    return { i, g, v, count: filtered.length };
  }, [filtered]);

  function buildFilename() {
    const parts = ['life-manager', tipo === 'todos' ? 'movimientos' : tipo];
    if (from && to) parts.push(`${from}_a_${to}`);
    else if (from) parts.push(`desde_${from}`);
    else if (to) parts.push(`hasta_${to}`);
    else parts.push('todo');
    return parts.join('_');
  }

  function handleExport() {
    if (filtered.length === 0) {
      onToast && onToast('No hay movimientos en ese rango.');
      return;
    }
    exportMovements({
      format, txs: filtered, products, clients,
      sheetName: 'Movimientos',
      filenameBase: buildFilename(),
    });
    onToast && onToast(`${filtered.length} movimientos exportados a ${format === 'xls' ? 'Excel' : 'CSV'}.`);
    onClose();
  }

  const presets = [
    { id: 'hoy', label: 'Hoy' },
    { id: 'semana', label: 'Esta semana' },
    { id: 'mes', label: 'Este mes' },
    { id: 'mes_pasado', label: 'Mes pasado' },
    { id: 'anio', label: 'Este año' },
    { id: 'todo', label: 'Todo' },
    { id: 'personalizado', label: 'Personalizado' },
  ];

  return (
    <>
      <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
      <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="drawer-eyebrow">Exportar</div>
            <div className="drawer-title">Descargar movimientos</div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="drawer-body">
          <div className="field">
            <label>Formato</label>
            <div className="format-toggle">
              <button
                className={classNames('format-btn', format === 'xls' && 'is-active')}
                onClick={() => setFormat('xls')}
              >
                <span className="format-ext">XLS</span>
                <span className="format-name">Excel</span>
                <span className="format-desc">Abre en Microsoft Excel, Numbers o Google Sheets</span>
              </button>
              <button
                className={classNames('format-btn', format === 'csv' && 'is-active')}
                onClick={() => setFormat('csv')}
              >
                <span className="format-ext">CSV</span>
                <span className="format-name">Valores separados</span>
                <span className="format-desc">Universal · funciona en cualquier hoja de cálculo</span>
              </button>
            </div>
          </div>

          <div className="field">
            <label>Periodo</label>
            <div className="preset-grid">
              {presets.map((p) => (
                <button
                  key={p.id}
                  className={classNames('preset-btn', preset === p.id && 'is-active')}
                  onClick={() => setPreset(p.id)}
                >{p.label}</button>
              ))}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Desde</label>
              <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreset('personalizado'); }} />
            </div>
            <div className="field">
              <label>Hasta</label>
              <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreset('personalizado'); }} />
            </div>
          </div>

          <div className="field">
            <label>Tipo de movimiento</label>
            <div className="chip-row">
              {[['todos','Todos'],['ingreso','Ingresos'],['gasto','Gastos'],['venta','Ventas']].map(([id, label]) => (
                <button key={id} className={classNames('chip', tipo === id && 'is-active')} onClick={() => setTipo(id)}>{label}</button>
              ))}
            </div>
          </div>

          <div className="export-summary">
            <div className="export-summary-head">
              <span className="card-eyebrow">Selección</span>
              <span className="summary-count">{summary.count} {summary.count === 1 ? 'movimiento' : 'movimientos'}</span>
            </div>
            <div className="export-summary-grid">
              <div><span className="ts-label">Ingresos</span><span className="ts-value">{money(summary.i)}</span></div>
              <div><span className="ts-label">Gastos</span><span className="ts-value">{money(summary.g)}</span></div>
              <div><span className="ts-label">Ventas</span><span className="ts-value">{money(summary.v)}</span></div>
              <div><span className="ts-label">Balance</span><span className={classNames('ts-value', (summary.i + summary.v - summary.g) < 0 && 'is-neg')}>{money(summary.i + summary.v - summary.g)}</span></div>
            </div>
          </div>
        </div>
        <footer className="drawer-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleExport} disabled={summary.count === 0}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{marginRight: 2}}><path d="M7 1.5v8M3.5 6L7 9.5 10.5 6M2 12h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Descargar {format === 'xls' ? 'Excel' : 'CSV'}
          </button>
        </footer>
      </aside>
    </>
  );
}

Object.assign(window, {
  classNames, Delta, Sparkline,
  Header, PeriodBar, KPIRow, KPICard, FlowChart, CategoriesPanel,
  Toast, ConfirmDialog,
  TransactionDrawer, ProductDrawer, ClientDrawer, SupplierDrawer,
  ExportDrawer,
});
