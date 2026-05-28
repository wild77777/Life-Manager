// ============================================================
// Life Manager — page views
// ============================================================
const { useState: useStateV, useMemo: useMemoV } = React;

// ---- Empty state -------------------------------------------
function EmptyState({ title, body, action }) {
  return (
    <div className="empty-state">
      <div className="empty-mark" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="4" y="6" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4 11h20" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 16h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
      <div className="empty-title">{title}</div>
      <div className="empty-body">{body}</div>
      {action}
    </div>
  );
}

// ============================================================
// 1. Resumen
// ============================================================
function ResumenView(props) {
  const { transactions, products, clients, period, setPeriod, anchor, setAnchor, onOpenAdd, onEdit, onDelete, onExport } = props;
  const stats = useMemoV(() => aggregate(transactions, anchor, period), [transactions, anchor, period]);
  const buckets = useMemoV(() => chartBuckets(transactions, anchor, period), [transactions, anchor, period]);
  const sparks = useMemoV(() => ({
    ingreso: sparkSeries(transactions, period, 'ingreso'),
    gasto:   sparkSeries(transactions, period, 'gasto'),
    venta:   sparkSeries(transactions, period, 'venta'),
    balance: sparkSeries(transactions, period, 'balance'),
  }), [transactions, period]);
  const periodLabel = formatPeriodLabel(anchor, period);

  if (transactions.length === 0) {
    return (
      <>
        <PeriodBar period={period} setPeriod={setPeriod} anchor={anchor} setAnchor={setAnchor}
          label={periodLabel} eyebrow="Resumen" onExport={onExport} showExportButton={false} />
        <EmptyState
          title="Aún no tienes movimientos"
          body="Empieza registrando tu primer ingreso, gasto o venta. Aquí verás tu balance, gráficos y categorías en cuanto agregues datos."
          action={<button className="btn-primary" onClick={onOpenAdd}><span>+</span> Registrar transacción</button>}
        />
      </>
    );
  }

  // Recent (last 8) for dashboard table
  const recent = useMemoV(() => {
    const start = startOfPeriod(anchor, period);
    const end = endOfPeriod(anchor, period);
    return transactions
      .filter((t) => { const d = new Date(t.fecha + 'T00:00:00'); return d >= start && d < end; })
      .slice(0, 8);
  }, [transactions, anchor, period]);

  return (
    <>
      <PeriodBar period={period} setPeriod={setPeriod} anchor={anchor} setAnchor={setAnchor}
        label={periodLabel} eyebrow="Resumen" onExport={onExport} />
      <KPIRow stats={stats} sparks={sparks} />
      <section className="row row-chart">
        <FlowChart buckets={buckets} hasData={stats.count > 0} />
        <CategoriesPanel byCat={stats.byCat} total={stats.gasto} />
      </section>
      <section className="card mov-card" style={{marginTop:'var(--row-gap)'}}>
        <div className="card-head">
          <div>
            <div className="card-eyebrow">Detalle</div>
            <div className="card-title">Movimientos del periodo</div>
          </div>
          <div className="card-meta">{stats.count} movimientos</div>
        </div>
        <MovementsTable txs={recent} products={products} clients={clients} onEdit={onEdit} onDelete={onDelete} compact />
      </section>
    </>
  );
}

// ============================================================
// Shared movements table
// ============================================================
function MovementsTable({ txs, products, clients, onEdit, onDelete, compact }) {
  const pMap = useMemoV(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const cMap = useMemoV(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);

  if (txs.length === 0) {
    return <div className="empty-row" style={{padding:'40px 0'}}>Sin movimientos para mostrar.</div>;
  }
  return (
    <div className="table-wrap">
      <table className="movs">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Concepto</th>
            <th>Categoría</th>
            {!compact && <th>Detalle</th>}
            <th>Tipo</th>
            <th className="num">Monto</th>
            <th className="actions-col"></th>
          </tr>
        </thead>
        <tbody>
          {txs.map((t) => {
            const sign = t.tipo === 'gasto' ? '−' : '+';
            const cls = t.tipo === 'gasto' ? 'neg' : t.tipo === 'venta' ? 'venta' : 'pos';
            const product = t.productoId ? pMap[t.productoId] : null;
            const client = t.clienteId ? cMap[t.clienteId] : null;
            return (
              <tr key={t.id}>
                <td className="muted">{formatDate(t.fecha)}</td>
                <td className="concept">{t.concepto}</td>
                <td className="muted">{categoryLabel(t.tipo, t.categoria)}</td>
                {!compact && (
                  <td className="muted small">
                    {product && <>{t.cantidad}× {product.nombre}{client && <> · {client.nombre}</>}</>}
                    {!product && client && <>{client.nombre}</>}
                    {!product && !client && t.nota}
                  </td>
                )}
                <td><span className={`pill pill-${t.tipo}`}>{t.tipo}</span></td>
                <td className={`num amount ${cls}`}>{sign}{money(t.monto).replace('$','$')}</td>
                <td className="actions-col">
                  <div className="row-actions">
                    <button className="row-btn" onClick={() => onEdit(t)} title="Editar">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4.5 11.5 2 12l.5-2.5L9.5 2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                    </button>
                    <button className="row-btn danger" onClick={() => onDelete(t)} title="Eliminar">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4h9M5 4V2.5h4V4M4 4l.5 7.5h5L10 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// 2. Movimientos (full)
// ============================================================
function MovimientosView(props) {
  const { transactions, products, clients, onOpenAdd, onEdit, onDelete, onExport } = props;
  const [filter, setFilter] = useStateV('todos');
  const [query, setQuery] = useStateV('');
  const [dateFrom, setDateFrom] = useStateV('');
  const [dateTo, setDateTo] = useStateV('');

  const filtered = useMemoV(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filter !== 'todos' && t.tipo !== filter) return false;
      if (q && !(t.concepto.toLowerCase().includes(q) || (t.nota || '').toLowerCase().includes(q))) return false;
      if (dateFrom && t.fecha < dateFrom) return false;
      if (dateTo && t.fecha > dateTo) return false;
      return true;
    });
  }, [transactions, filter, query, dateFrom, dateTo]);

  const totals = useMemoV(() => {
    let i = 0, g = 0, v = 0;
    for (const t of filtered) {
      if (t.tipo === 'ingreso') i += t.monto;
      else if (t.tipo === 'gasto') g += t.monto;
      else if (t.tipo === 'venta') v += t.monto;
    }
    return { i, g, v, balance: i + v - g };
  }, [filtered]);

  return (
    <>
      <section className="action-bar">
        <div className="action-bar-left">
          <div className="page-eyebrow">Detalle</div>
          <h1 className="page-title">movimientos</h1>
        </div>
        <div className="action-bar-right">
          <button className="btn-ghost" onClick={() => onExport('filtrado', filtered)}>Exportar CSV</button>
          <button className="btn-primary" onClick={onOpenAdd}><span>+</span> Nueva transacción</button>
        </div>
      </section>

      {transactions.length === 0 ? (
        <EmptyState
          title="Sin movimientos registrados"
          body="Cuando registres ingresos, gastos o ventas aparecerán aquí en una lista filtrable y exportable."
          action={<button className="btn-primary" onClick={onOpenAdd}><span>+</span> Registrar primera transacción</button>}
        />
      ) : (
        <div className="card">
          <div className="filters-bar">
            <div className="filters-left">
              <div className="search-field">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.1"/><path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar concepto o nota…" />
              </div>
              <div className="mini-tabs">
                {[['todos','Todos'],['ingreso','Ingresos'],['gasto','Gastos'],['venta','Ventas']].map(([id, label]) => (
                  <button key={id} className={classNames('mini-tab', filter === id && 'is-active')} onClick={() => setFilter(id)}>{label}</button>
                ))}
              </div>
            </div>
            <div className="filters-right">
              <label className="date-range">
                <span>Desde</span>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </label>
              <label className="date-range">
                <span>Hasta</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </label>
              {(dateFrom || dateTo || query || filter !== 'todos') && (
                <button className="link-btn" onClick={() => { setDateFrom(''); setDateTo(''); setQuery(''); setFilter('todos'); }}>Limpiar</button>
              )}
            </div>
          </div>

          <div className="totals-strip">
            <div><span className="ts-label">Resultados</span><span className="ts-value">{filtered.length}</span></div>
            <div><span className="ts-label">Ingresos</span><span className="ts-value">{money(totals.i)}</span></div>
            <div><span className="ts-label">Gastos</span><span className="ts-value">{money(totals.g)}</span></div>
            <div><span className="ts-label">Ventas</span><span className="ts-value">{money(totals.v)}</span></div>
            <div><span className="ts-label">Balance</span><span className={classNames('ts-value', totals.balance < 0 && 'is-neg')}>{money(totals.balance)}</span></div>
          </div>

          <MovementsTable txs={filtered} products={products} clients={clients} onEdit={onEdit} onDelete={onDelete} />
        </div>
      )}
    </>
  );
}

// ============================================================
// 3. Inventario
// ============================================================
function InventarioView(props) {
  const { products, transactions, onAdd, onEdit, onDelete } = props;
  const sold = useMemoV(() => {
    const m = {};
    for (const t of transactions) if (t.tipo === 'venta' && t.productoId) m[t.productoId] = (m[t.productoId] || 0) + (t.cantidad || 1);
    return m;
  }, [transactions]);

  const revenue = useMemoV(() => {
    const m = {};
    for (const t of transactions) if (t.tipo === 'venta' && t.productoId) m[t.productoId] = (m[t.productoId] || 0) + t.monto;
    return m;
  }, [transactions]);

  const totals = useMemoV(() => {
    const totalValue = products.reduce((s, p) => s + p.stock * p.costo, 0);
    const totalUnits = products.reduce((s, p) => s + p.stock, 0);
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
    const outStock = products.filter((p) => p.stock === 0).length;
    return { totalValue, totalUnits, lowStock, outStock };
  }, [products]);

  return (
    <>
      <section className="action-bar">
        <div className="action-bar-left">
          <div className="page-eyebrow">Productos</div>
          <h1 className="page-title">inventario</h1>
        </div>
        <div className="action-bar-right">
          <button className="btn-primary" onClick={onAdd}><span>+</span> Nuevo producto</button>
        </div>
      </section>

      {products.length === 0 ? (
        <EmptyState
          title="Sin productos en inventario"
          body="Agrega tus productos para poder registrar ventas con stock automático, márgenes y top de productos vendidos."
          action={<button className="btn-primary" onClick={onAdd}><span>+</span> Crear primer producto</button>}
        />
      ) : (
        <>
          <div className="kpi-row inv-kpis">
            <div className="kpi"><div className="kpi-label">Productos</div><div className="kpi-value">{products.length}</div></div>
            <div className="kpi"><div className="kpi-label">Unidades en stock</div><div className="kpi-value">{totals.totalUnits}</div></div>
            <div className="kpi"><div className="kpi-label">Valor inventario</div><div className="kpi-value">{money(totals.totalValue)}</div></div>
            <div className="kpi"><div className="kpi-label">Alertas</div><div className="kpi-value">{totals.lowStock + totals.outStock}<span className="kpi-suffix"> {totals.outStock > 0 ? `· ${totals.outStock} sin stock` : `· ${totals.lowStock} bajo`}</span></div></div>
          </div>

          <div className="card" style={{marginTop:'var(--row-gap)'}}>
            <div className="card-head">
              <div>
                <div className="card-eyebrow">Catálogo</div>
                <div className="card-title">{products.length} productos</div>
              </div>
            </div>
            <div className="table-wrap">
              <table className="movs">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="num">Stock</th>
                    <th className="num">Precio</th>
                    <th className="num">Costo</th>
                    <th className="num">Margen</th>
                    <th className="num">Vendidas</th>
                    <th className="num">Ingreso</th>
                    <th className="actions-col"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const margin = p.precio - p.costo;
                    const marginPct = p.precio > 0 ? (margin / p.precio) * 100 : 0;
                    const out = p.stock === 0;
                    const low = !out && p.stock <= 5;
                    return (
                      <tr key={p.id}>
                        <td className="concept">
                          <div className="inv-name">
                            <span>{p.nombre}</span>
                            {out && <span className="badge danger">Sin stock</span>}
                            {low && <span className="badge warn">Bajo</span>}
                          </div>
                        </td>
                        <td className="num"><strong>{p.stock}</strong></td>
                        <td className="num">{money(p.precio)}</td>
                        <td className="num muted">{money(p.costo)}</td>
                        <td className="num">{money(margin)} <span className="muted small">· {marginPct.toFixed(0)}%</span></td>
                        <td className="num">{sold[p.id] || 0}</td>
                        <td className="num">{money(revenue[p.id] || 0)}</td>
                        <td className="actions-col">
                          <div className="row-actions">
                            <button className="row-btn" onClick={() => onEdit(p)} title="Editar"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4.5 11.5 2 12l.5-2.5L9.5 2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg></button>
                            <button className="row-btn danger" onClick={() => onDelete(p)} title="Eliminar"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4h9M5 4V2.5h4V4M4 4l.5 7.5h5L10 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ============================================================
// 4. Contactos (clientes + proveedores)
// ============================================================
function ContactosView(props) {
  const { clients, suppliers, transactions,
          onAddClient, onEditClient, onDeleteClient,
          onAddSupplier, onEditSupplier, onDeleteSupplier } = props;
  const [tab, setTab] = useStateV('clientes');

  const clientStats = useMemoV(() => {
    const m = {};
    for (const t of transactions) if (t.tipo === 'venta' && t.clienteId) {
      if (!m[t.clienteId]) m[t.clienteId] = { total: 0, last: t.fecha, count: 0 };
      m[t.clienteId].total += t.monto; m[t.clienteId].count += 1;
      if (t.fecha > m[t.clienteId].last) m[t.clienteId].last = t.fecha;
    }
    return m;
  }, [transactions]);

  return (
    <>
      <section className="action-bar">
        <div className="action-bar-left">
          <div className="page-eyebrow">Personas</div>
          <h1 className="page-title">contactos</h1>
        </div>
        <div className="action-bar-right">
          <div className="segmented">
            <button className={classNames('segmented-btn', tab === 'clientes' && 'is-active')} onClick={() => setTab('clientes')}>Clientes ({clients.length})</button>
            <button className={classNames('segmented-btn', tab === 'proveedores' && 'is-active')} onClick={() => setTab('proveedores')}>Proveedores ({suppliers.length})</button>
          </div>
          {tab === 'clientes' ? (
            <button className="btn-primary" onClick={onAddClient}><span>+</span> Nuevo cliente</button>
          ) : (
            <button className="btn-primary" onClick={onAddSupplier}><span>+</span> Nuevo proveedor</button>
          )}
        </div>
      </section>

      {tab === 'clientes' && (
        clients.length === 0 ? (
          <EmptyState
            title="Sin clientes registrados"
            body="Crea tus clientes para poder asociarlos a las ventas y ver quién compra más."
            action={<button className="btn-primary" onClick={onAddClient}><span>+</span> Crear primer cliente</button>}
          />
        ) : (
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-eyebrow">Cartera</div>
                <div className="card-title">{clients.length} clientes</div>
              </div>
            </div>
            <table className="contacts">
              <thead>
                <tr><th>Nombre</th><th>Tipo</th><th>Ciudad</th><th>Contacto</th><th>Última compra</th><th className="num">Ventas</th><th className="num">Total</th><th className="actions-col"></th></tr>
              </thead>
              <tbody>
                {[...clients]
                  .map((c) => ({ ...c, ...(clientStats[c.id] || { total: 0, last: null, count: 0 }) }))
                  .sort((a, b) => b.total - a.total)
                  .map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="contact-name">
                          <span className="avatar-sm">{c.nombre.split(' ').map((w) => w[0]).slice(0,2).join('').toUpperCase()}</span>
                          <div>{c.nombre}</div>
                        </div>
                      </td>
                      <td className="muted">{c.tipo}</td>
                      <td className="muted">{c.ciudad || '—'}</td>
                      <td className="muted small">{c.email}{c.email && c.telefono && ' · '}{c.telefono}</td>
                      <td className="muted">{c.last ? formatDateFull(c.last) : '—'}</td>
                      <td className="num">{c.count}</td>
                      <td className="num"><strong>{money(c.total)}</strong></td>
                      <td className="actions-col">
                        <div className="row-actions">
                          <button className="row-btn" onClick={() => onEditClient(c)} title="Editar"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4.5 11.5 2 12l.5-2.5L9.5 2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg></button>
                          <button className="row-btn danger" onClick={() => onDeleteClient(c)} title="Eliminar"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4h9M5 4V2.5h4V4M4 4l.5 7.5h5L10 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'proveedores' && (
        suppliers.length === 0 ? (
          <EmptyState
            title="Sin proveedores"
            body="Lleva el registro de tus proveedores y de qué te abastecen."
            action={<button className="btn-primary" onClick={onAddSupplier}><span>+</span> Crear primer proveedor</button>}
          />
        ) : (
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-eyebrow">Cadena</div>
                <div className="card-title">{suppliers.length} proveedores</div>
              </div>
            </div>
            <table className="contacts">
              <thead>
                <tr><th>Nombre</th><th>Concepto</th><th>Contacto</th><th className="actions-col"></th></tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="contact-name">
                        <span className="avatar-sm">{s.nombre.split(' ').map((w) => w[0]).slice(0,2).join('').toUpperCase()}</span>
                        <div>{s.nombre}</div>
                      </div>
                    </td>
                    <td className="muted">{s.concepto || '—'}</td>
                    <td className="muted small">{s.contacto || '—'}</td>
                    <td className="actions-col">
                      <div className="row-actions">
                        <button className="row-btn" onClick={() => onEditSupplier(s)} title="Editar"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4.5 11.5 2 12l.5-2.5L9.5 2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg></button>
                        <button className="row-btn danger" onClick={() => onDeleteSupplier(s)} title="Eliminar"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4h9M5 4V2.5h4V4M4 4l.5 7.5h5L10 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  );
}

// ============================================================
// 5. Reportes
// ============================================================
function ReportesView(props) {
  const { transactions, products, clients, period, setPeriod, anchor, setAnchor, onExport } = props;
  const stats = useMemoV(() => aggregate(transactions, anchor, period), [transactions, anchor, period]);
  const buckets = useMemoV(() => chartBuckets(transactions, anchor, period), [transactions, anchor, period]);
  const periodLabel = formatPeriodLabel(anchor, period);

  // Top productos (in this period)
  const topProducts = useMemoV(() => {
    const start = startOfPeriod(anchor, period);
    const end = endOfPeriod(anchor, period);
    const m = {};
    for (const t of transactions) {
      if (t.tipo !== 'venta' || !t.productoId) continue;
      const d = new Date(t.fecha + 'T00:00:00');
      if (d < start || d >= end) continue;
      if (!m[t.productoId]) m[t.productoId] = { qty: 0, total: 0 };
      m[t.productoId].qty += t.cantidad || 1; m[t.productoId].total += t.monto;
    }
    const pMap = Object.fromEntries(products.map((p) => [p.id, p]));
    return Object.entries(m)
      .map(([id, v]) => ({ id, nombre: pMap[id]?.nombre || 'Producto', qty: v.qty, total: v.total }))
      .sort((a, b) => b.total - a.total).slice(0, 8);
  }, [transactions, products, anchor, period]);

  // Top clientes
  const topClients = useMemoV(() => {
    const start = startOfPeriod(anchor, period);
    const end = endOfPeriod(anchor, period);
    const m = {};
    for (const t of transactions) {
      if (t.tipo !== 'venta' || !t.clienteId) continue;
      const d = new Date(t.fecha + 'T00:00:00');
      if (d < start || d >= end) continue;
      if (!m[t.clienteId]) m[t.clienteId] = { count: 0, total: 0 };
      m[t.clienteId].count += 1; m[t.clienteId].total += t.monto;
    }
    const cMap = Object.fromEntries(clients.map((c) => [c.id, c]));
    return Object.entries(m)
      .map(([id, v]) => ({ id, nombre: cMap[id]?.nombre || 'Cliente', count: v.count, total: v.total }))
      .sort((a, b) => b.total - a.total).slice(0, 8);
  }, [transactions, clients, anchor, period]);

  // 12-period trend (ingresos vs gastos)
  const trend12 = useMemoV(() => {
    const arr = [];
    for (let i = 11; i >= 0; i--) {
      const a = shiftPeriod(anchor, period, -i);
      const start = startOfPeriod(a, period);
      const end = endOfPeriod(a, period);
      let ing = 0, gas = 0, ven = 0;
      for (const t of transactions) {
        const d = new Date(t.fecha + 'T00:00:00');
        if (d < start || d >= end) continue;
        if (t.tipo === 'ingreso') ing += t.monto;
        else if (t.tipo === 'gasto') gas += t.monto;
        else if (t.tipo === 'venta') ven += t.monto;
      }
      arr.push({ label: formatPeriodLabel(a, period), ing, gas, ven, net: ing + ven - gas });
    }
    return arr;
  }, [transactions, anchor, period]);

  if (transactions.length === 0) {
    return (
      <>
        <PeriodBar period={period} setPeriod={setPeriod} anchor={anchor} setAnchor={setAnchor}
          label={periodLabel} eyebrow="Reportes" onExport={onExport} showExportButton={false} />
        <EmptyState
          title="Aún no hay reportes"
          body="Cuando registres movimientos verás aquí tendencias, top productos y top clientes."
          action={null}
        />
      </>
    );
  }

  const maxTrend = Math.max(1, ...trend12.flatMap((d) => [d.ing + d.ven, d.gas]));

  return (
    <>
      <PeriodBar period={period} setPeriod={setPeriod} anchor={anchor} setAnchor={setAnchor}
        label={periodLabel} eyebrow="Reportes" onExport={onExport} />

      <div className="kpi-row">
        <div className="kpi"><div className="kpi-label">Ingresos</div><div className="kpi-value">{money(stats.ingreso)}</div><Delta now={stats.ingreso} prev={stats.prev.ingreso} /></div>
        <div className="kpi"><div className="kpi-label">Gastos</div><div className="kpi-value">{money(stats.gasto)}</div><Delta now={stats.gasto} prev={stats.prev.gasto} /></div>
        <div className="kpi"><div className="kpi-label">Ventas</div><div className="kpi-value">{money(stats.venta)}</div><Delta now={stats.venta} prev={stats.prev.venta} /></div>
        <div className="kpi"><div className="kpi-label">Balance</div><div className="kpi-value">{money(stats.balance)}</div><Delta now={stats.balance} prev={stats.prev.balance} /></div>
      </div>

      <section className="row row-chart">
        <FlowChart buckets={buckets} hasData={stats.count > 0} />
        <CategoriesPanel byCat={stats.byCat} total={stats.gasto} />
      </section>

      <section className="card" style={{marginTop:'var(--row-gap)'}}>
        <div className="card-head">
          <div>
            <div className="card-eyebrow">Tendencia · últimos 12</div>
            <div className="card-title">Comparación periodo a periodo</div>
          </div>
          <div className="legend">
            <span className="swatch in" /> <span>Entradas</span>
            <span className="dot">·</span>
            <span className="swatch out" /> <span>Gastos</span>
          </div>
        </div>
        <div className="trend-grid">
          {trend12.map((d, i) => {
            const inH = ((d.ing + d.ven) / maxTrend) * 100;
            const outH = (d.gas / maxTrend) * 100;
            return (
              <div className="trend-col" key={i}>
                <div className="trend-bars">
                  <div className="trend-bar in" style={{height: inH + '%'}} title={`Entradas ${money(d.ing + d.ven)}`}></div>
                  <div className="trend-bar out" style={{height: outH + '%'}} title={`Gastos ${money(d.gas)}`}></div>
                </div>
                <div className={classNames('trend-net', d.net < 0 && 'neg')}>{moneyCompact(d.net)}</div>
                <div className="trend-label">{d.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="row row-detail" style={{marginTop:'var(--row-gap)'}}>
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Productos</div>
              <div className="card-title">Top vendidos en el periodo</div>
            </div>
          </div>
          {topProducts.length === 0 ? (
            <div className="empty">Sin ventas con producto en este periodo.</div>
          ) : (
            <ul className="rank-list">
              {topProducts.map((p, i) => (
                <li className="rank-row" key={p.id}>
                  <span className="rank-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="rank-name">{p.nombre}</span>
                  <span className="rank-meta">{p.qty} u.</span>
                  <span className="rank-amount">{money(p.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Clientes</div>
              <div className="card-title">Top clientes del periodo</div>
            </div>
          </div>
          {topClients.length === 0 ? (
            <div className="empty">Sin ventas asociadas a clientes en este periodo.</div>
          ) : (
            <ul className="rank-list">
              {topClients.map((c, i) => (
                <li className="rank-row" key={c.id}>
                  <span className="rank-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="rank-name">{c.nombre}</span>
                  <span className="rank-meta">{c.count} compras</span>
                  <span className="rank-amount">{money(c.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

Object.assign(window, {
  EmptyState, MovementsTable, ResumenView, MovimientosView, InventarioView, ContactosView, ReportesView,
});
