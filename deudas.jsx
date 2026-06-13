// ============================================================
// Life Manager — Deudas (cuentas por cobrar y por pagar)
// ============================================================
const { useState: useDState, useMemo: useDMemo, useEffect: useDEffect } = React;

// ---- Semáforo dot ------------------------------------------
function SemaforoDot({ debt, withLabel }) {
  const meta = debtStatusMeta(debt);
  return (
    <span className="semaforo">
      <span className={classNames('semaforo-dot', 'sem-' + meta.dot)} />
      {withLabel && <span className="semaforo-label">{meta.label}</span>}
    </span>
  );
}

function DebtStatusPill({ debt }) {
  const meta = debtStatusMeta(debt);
  return <span className={classNames('debt-pill', 'debt-' + meta.cls)}>{meta.label}</span>;
}

// ============================================================
// Drawer: create / edit a debt
// ============================================================
function DeudaDrawer({ open, onClose, onSave, editing, defaultDir }) {
  const [f, setF] = useDState({});
  const [touched, setTouched] = useDState(false);

  useDEffect(() => {
    if (!open) return;
    if (editing) {
      setF({ ...editing, abonoInicial: '' });
    } else {
      setF({
        direccion: defaultDir || 'cobrar',
        contraparte: '', telefono: '', concepto: '',
        total: '', abonoInicial: '',
        fecha: todayISO(), fechaVencimiento: '', sinVencimiento: false, nota: '',
      });
    }
    setTouched(false);
  }, [open, editing]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const isEdit = !!editing;
  const dir = f.direccion || 'cobrar';
  const dirMeta = DEBT_DIRECTIONS.find((d) => d.id === dir) || DEBT_DIRECTIONS[0];
  const valid = (f.contraparte || '').trim() && f.total !== '' && +f.total > 0;

  function handleSave() {
    setTouched(true);
    if (!valid) return;
    let pagos = isEdit ? (editing.pagos || []) : [];
    if (!isEdit && +f.abonoInicial > 0) {
      pagos = [{ id: newId('dpay'), monto: +(+f.abonoInicial).toFixed(2), metodo: 'efectivo', fecha: f.fecha || todayISO(), nota: 'Abono inicial' }];
    }
    onSave({
      id: editing ? editing.id : newId('debt'),
      direccion: dir,
      contraparte: (f.contraparte || '').trim(),
      telefono: (f.telefono || '').trim(),
      concepto: (f.concepto || '').trim(),
      total: +(+f.total || 0).toFixed(2),
      fecha: f.fecha || todayISO(),
      fechaVencimiento: f.sinVencimiento ? '' : (f.fechaVencimiento || ''),
      sinVencimiento: !!f.sinVencimiento,
      nota: (f.nota || '').trim(),
      pagos,
      createdAt: editing ? editing.createdAt : todayISO(),
    }, isEdit);
    onClose();
  }

  return (
    <>
      <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
      <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="drawer-eyebrow">{isEdit ? 'Editar deuda' : 'Nueva deuda'}</div>
            <div className="drawer-title">{isEdit ? f.contraparte : 'Registrar deuda'}</div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div className="drawer-body">
          <div className="type-tabs type-tabs-2">
            {DEBT_DIRECTIONS.map((d) => (
              <button
                key={d.id}
                className={classNames('type-tab', dir === d.id && 'is-active', 'tab-' + d.id)}
                onClick={() => set('direccion', d.id)}
                disabled={isEdit}
              >{d.label}</button>
            ))}
          </div>

          <div className="field">
            <label>{dir === 'cobrar' ? 'Cliente · quién me debe' : 'A quién le debo'}</label>
            <input value={f.contraparte || ''} onChange={(e) => set('contraparte', e.target.value)} placeholder={dir === 'cobrar' ? 'ej. Juan Pérez' : 'ej. Proveedora del Valle'} />
            {touched && !(f.contraparte || '').trim() && <div className="field-error">Indica el nombre.</div>}
          </div>

          <div className="field">
            <label>Teléfono <span className="muted small">opcional</span></label>
            <input value={f.telefono || ''} onChange={(e) => set('telefono', e.target.value)} placeholder="ej. 0999999999" />
            {dir === 'cobrar' && <div className="field-hint">Con código de país (593…) para enviar recordatorios por WhatsApp.</div>}
          </div>

          <div className="field">
            <label>Concepto · producto, factura o motivo</label>
            <input value={f.concepto || ''} onChange={(e) => set('concepto', e.target.value)} placeholder="ej. 2 sacos de café · factura #0142" />
          </div>

          <div className="field amount-field">
            <label>Valor total</label>
            <div className="amount-input">
              <span className="amount-symbol">$</span>
              <input type="number" inputMode="decimal" step="0.01" min="0" value={f.total || ''} onChange={(e) => set('total', e.target.value)} placeholder="0.00" />
              <span className="amount-iso">USD</span>
            </div>
            {touched && (f.total === '' || +f.total <= 0) && <div className="field-error">Indica un valor mayor a 0.</div>}
          </div>

          {!isEdit && (
            <div className="field">
              <label>Abono inicial <span className="muted small">opcional</span></label>
              <div className="amount-input sm">
                <span className="amount-symbol">$</span>
                <input type="number" step="0.01" min="0" value={f.abonoInicial || ''} onChange={(e) => set('abonoInicial', e.target.value)} placeholder="0.00" />
                <span className="amount-iso">USD</span>
              </div>
              {+f.total > 0 && (
                <div className="field-hint">
                  Saldo pendiente: <strong>{money(Math.max(0, +f.total - (+f.abonoInicial || 0)))}</strong>
                </div>
              )}
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label>{dir === 'cobrar' ? 'Fecha de venta' : 'Fecha de la deuda'}</label>
              <input type="date" value={f.fecha || ''} onChange={(e) => set('fecha', e.target.value)} />
            </div>
            <div className="field">
              <label>Fecha de vencimiento</label>
              <input type="date" value={f.fechaVencimiento || ''} disabled={f.sinVencimiento} onChange={(e) => set('fechaVencimiento', e.target.value)} />
            </div>
          </div>
          <label className="check-row">
            <input type="checkbox" checked={!!f.sinVencimiento} onChange={(e) => set('sinVencimiento', e.target.checked)} />
            <span>Sin fecha de vencimiento</span>
          </label>

          <div className="field">
            <label>Observaciones <span className="muted small">opcional</span></label>
            <textarea rows="2" value={f.nota || ''} onChange={(e) => set('nota', e.target.value)} placeholder="Acuerdo de pago, referencia…" />
          </div>
        </div>

        <footer className="drawer-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave}>{isEdit ? 'Guardar cambios' : 'Registrar deuda'}</button>
        </footer>
      </aside>
    </>
  );
}

// ============================================================
// Drawer: detail + payment management
// ============================================================
function DeudaDetailDrawer({ open, debt, bank, onClose, onAddPayment, onDeletePayment, onEdit, onDelete }) {
  const [monto, setMonto] = useDState('');
  const [metodo, setMetodo] = useDState('efectivo');
  const [fecha, setFecha] = useDState(todayISO());

  useDEffect(() => {
    if (open) { setMonto(''); setMetodo('efectivo'); setFecha(todayISO()); }
  }, [open, debt && debt.id]);

  if (!debt) {
    return (
      <>
        <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
        <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open} />
      </>
    );
  }

  const dir = debt.direccion || 'cobrar';
  const isCobrar = dir === 'cobrar';
  const total = +debt.total || 0;
  const paid = debtPaid(debt);
  const saldo = debtBalance(debt);
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const meta = debtStatusMeta(debt);
  const dleft = debt.sinVencimiento ? null : daysUntil(debt.fechaVencimiento);
  const pagos = [...(debt.pagos || [])].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const hasWa = !!String(debt.telefono || '').replace(/[^\d]/g, '');

  function addAbono(full) {
    const amt = full ? saldo : +monto;
    if (!amt || amt <= 0) return;
    onAddPayment(debt.id, { id: newId('dpay'), monto: +amt.toFixed(2), metodo, fecha, nota: '' });
    setMonto('');
  }
  function sendReminder() {
    if (!hasWa) return;
    window.open(whatsappLink(debt.telefono, buildDebtReminder(debt, bank)), '_blank');
  }

  return (
    <>
      <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
      <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="drawer-eyebrow">{isCobrar ? 'Por cobrar · me deben' : 'Por pagar · yo debo'}</div>
            <div className="drawer-title">{debt.contraparte}</div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div className="drawer-body">
          <div className="detail-status">
            <SemaforoDot debt={debt} withLabel />
            {dleft != null && saldo > 0 && (
              <span className={classNames('days-pill', dleft < 0 ? 'overdue' : dleft <= 3 ? 'soon' : '')}>
                {dleft < 0 ? `${Math.abs(dleft)}d vencido` : dleft === 0 ? 'vence hoy' : `vence en ${dleft}d`}
              </span>
            )}
          </div>

          {debt.concepto && <div className="detail-concepto">{debt.concepto}</div>}

          <div className="proj-finance" style={{ marginTop: 4 }}>
            <div className="finance-bars">
              <div className="finance-bar"><div className={classNames('finance-bar-fill', !isCobrar && 'is-pagar')} style={{ width: pct + '%' }} /></div>
            </div>
            <div className="finance-grid">
              <div><span className="ts-label">Total</span><span className="ts-value">{money(total)}</span></div>
              <div><span className="ts-label">Abonado</span><span className="ts-value pos">{money(paid)}</span></div>
              <div><span className="ts-label">Saldo</span><span className={classNames('ts-value', saldo > 0 && 'neg')}>{money(saldo)}</span></div>
            </div>
          </div>

          <div className="detail-meta">
            <div className="proj-meta">
              <span className="meta-label">{isCobrar ? 'Venta' : 'Inicio'}</span>
              <span className="meta-value">{debt.fecha ? formatDateFull(debt.fecha) : '—'}</span>
            </div>
            <div className="proj-meta">
              <span className="meta-label">Vencimiento</span>
              <span className="meta-value">{debt.sinVencimiento ? 'Sin fecha' : (debt.fechaVencimiento ? formatDateFull(debt.fechaVencimiento) : '—')}</span>
            </div>
            {debt.telefono && (
              <div className="proj-meta">
                <span className="meta-label">Teléfono</span>
                <span className="meta-value">{debt.telefono}</span>
              </div>
            )}
          </div>

          {debt.nota && <div className="callout">{debt.nota}</div>}

          {/* Add abono */}
          {saldo > 0 && (
            <div className="proj-section">
              <div className="proj-section-title">Registrar abono</div>
              <div className="abono-form">
                <div className="amount-input sm">
                  <span className="amount-symbol">$</span>
                  <input type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" />
                </div>
                <input type="date" className="abono-date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="chip-row" style={{ marginTop: 8 }}>
                {PAYMENT_METHODS.map((m) => (
                  <button key={m.id} className={classNames('chip', metodo === m.id && 'is-active')} onClick={() => setMetodo(m.id)}>{m.label}</button>
                ))}
              </div>
              <div className="abono-actions">
                <button className="btn-ghost btn-sm" onClick={() => addAbono(true)}>Saldar todo ({money(saldo)})</button>
                <button className="btn-primary btn-sm" onClick={() => addAbono(false)} disabled={!monto || +monto <= 0}>+ Abono</button>
              </div>
            </div>
          )}

          {/* Payment history */}
          <div className="proj-section">
            <div className="proj-section-title">Historial de pagos</div>
            {pagos.length === 0 ? (
              <div className="mini-empty">Sin abonos registrados.</div>
            ) : (
              <ul className="pay-list">
                {pagos.map((p) => (
                  <li key={p.id} className="pay-row">
                    <span className="pay-date">{formatDateFull(p.fecha)}</span>
                    <span className="pay-method">{paymentMethodLabel(p.metodo)}{p.nota ? ` · ${p.nota}` : ''}</span>
                    <span className="pay-amount">{money(p.monto)}</span>
                    <button className="row-btn danger" onClick={() => onDeletePayment(debt.id, p.id)} title="Eliminar abono"><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2.5 4h9M5 4V2.5h4V4M4 4l.5 7.5h5L10 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isCobrar && saldo > 0 && (
            <button className="btn-primary btn-wa btn-block" onClick={sendReminder} disabled={!hasWa} title={hasWa ? '' : 'Agrega el teléfono con código de país'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.01c-.24.68-1.42 1.31-1.96 1.36-.5.05-.96.23-3.23-.67-2.73-1.08-4.45-3.86-4.58-4.04-.13-.18-1.1-1.46-1.1-2.79s.7-1.98.94-2.25c.24-.27.53-.34.71-.34.18 0 .35 0 .51.01.16.01.39-.06.6.46.24.56.78 1.91.85 2.05.07.14.12.3.02.48-.09.18-.14.29-.28.45-.14.16-.29.36-.42.48-.14.14-.28.28-.12.55.16.27.71 1.17 1.53 1.9 1.05.93 1.94 1.22 2.21 1.36.27.14.43.12.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.6-.14.24.09 1.55.73 1.81.86.27.13.45.2.51.31.07.11.07.63-.17 1.31z"/></svg>
              Enviar recordatorio
            </button>
          )}
        </div>

        <footer className="drawer-foot drawer-foot-split">
          <button className="btn-ghost danger-ghost" onClick={() => onDelete(debt)}>Eliminar</button>
          <button className="btn-primary" onClick={() => onEdit(debt)}>Editar deuda</button>
        </footer>
      </aside>
    </>
  );
}

// ============================================================
// Main Deudas view
// ============================================================
function DeudasView(props) {
  const { debts, bankAccount, onSave, onDelete, onAddPayment, onDeletePayment, onConfirm } = props;
  const [dir, setDir] = useDState('cobrar');
  const [search, setSearch] = useDState('');
  const [statusFilter, setStatusFilter] = useDState('todas');
  const [drawer, setDrawer] = useDState({ open: false, editing: null });
  const [detail, setDetail] = useDState({ open: false, debt: null });

  // Totals across both directions (always shown)
  const totals = useDMemo(() => {
    let porCobrar = 0, porPagar = 0, vencidas = 0;
    for (const d of debts) {
      const bal = debtBalance(d);
      if (d.direccion === 'pagar') porPagar += bal; else porCobrar += bal;
      if (bal > 0 && debtStatus(d) === 'vencido') vencidas++;
    }
    return { porCobrar, porPagar, neto: porCobrar - porPagar, vencidas };
  }, [debts]);

  const list = useDMemo(() => {
    const q = search.trim().toLowerCase();
    return debts
      .filter((d) => (d.direccion || 'cobrar') === dir)
      .filter((d) => statusFilter === 'todas' ? true : statusFilter === 'pendientes' ? debtBalance(d) > 0 : debtStatus(d) === statusFilter)
      .filter((d) => !q || (d.contraparte || '').toLowerCase().includes(q) || (d.concepto || '').toLowerCase().includes(q) || (d.telefono || '').includes(q))
      .sort((a, b) => {
        const sa = debtBalance(a) <= 0 ? 1 : 0, sb = debtBalance(b) <= 0 ? 1 : 0;
        if (sa !== sb) return sa - sb;
        const da = daysUntil(a.fechaVencimiento), db = daysUntil(b.fechaVencimiento);
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      });
  }, [debts, dir, search, statusFilter]);

  const dirTotal = useDMemo(() => list.reduce((s, d) => s + debtBalance(d), 0), [list]);

  // Alerts (current direction)
  const alerts = useDMemo(() => {
    return debts
      .filter((d) => (d.direccion || 'cobrar') === dir && debtBalance(d) > 0)
      .map((d) => ({ debt: d, days: daysUntil(d.fechaVencimiento) }))
      .filter((x) => x.days != null && x.days <= 3)
      .sort((a, b) => a.days - b.days);
  }, [debts, dir]);

  const isCobrar = dir === 'cobrar';

  function askDelete(d) {
    onConfirm({
      title: 'Eliminar deuda',
      body: <>¿Eliminar la deuda de "<strong>{d.contraparte}</strong>" por {money(d.total)}? Se borrará su historial de abonos.</>,
      confirmLabel: 'Eliminar',
      onConfirm: () => { onDelete(d.id); setDetail({ open: false, debt: null }); },
    });
  }

  const statusFilters = [
    ['todas', 'Todas'],
    ['pendientes', 'Pendientes'],
    ['vencido', 'Vencidas'],
    ['porvencer', 'Por vencer'],
    ['pagado', 'Pagadas'],
  ];

  return (
    <>
      <section className="action-bar">
        <div className="action-bar-left">
          <div className="page-eyebrow">Cobros y pagos</div>
          <h1 className="page-title">deudas</h1>
        </div>
        <div className="action-bar-right">
          <div className="segmented">
            {DEBT_DIRECTIONS.map((d) => (
              <button key={d.id} className={classNames('segmented-btn', dir === d.id && 'is-active')} onClick={() => setDir(d.id)}>{d.label}</button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setDrawer({ open: true, editing: null })}><span aria-hidden="true">+</span> Nueva deuda</button>
        </div>
      </section>

      {/* Summary */}
      <div className="deuda-summary">
        <div className="dsum dsum-cobrar">
          <span className="kpi-label">Por cobrar · me deben</span>
          <span className="kpi-value pos">{money(totals.porCobrar)}</span>
        </div>
        <div className="dsum dsum-pagar">
          <span className="kpi-label">Por pagar · yo debo</span>
          <span className="kpi-value neg">{money(totals.porPagar)}</span>
        </div>
        <div className="dsum">
          <span className="kpi-label">Balance neto</span>
          <span className={classNames('kpi-value', totals.neto < 0 ? 'neg' : 'pos')}>{money(totals.neto)}</span>
          <span className="dsum-note">{totals.neto >= 0 ? 'a tu favor' : 'en contra'}</span>
        </div>
        <div className="dsum">
          <span className="kpi-label">Vencidas</span>
          <span className={classNames('kpi-value', totals.vencidas > 0 && 'neg')}>{totals.vencidas}</span>
          <span className="dsum-note">{totals.vencidas === 1 ? 'deuda vencida' : 'deudas vencidas'}</span>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="crm-alerts">
          <span className="alert-icon">⚠</span>
          <span className="alert-label">{isCobrar ? 'Cobros urgentes:' : 'Pagos urgentes:'}</span>
          <div className="alert-chips">
            {alerts.slice(0, 6).map(({ debt, days }) => (
              <button key={debt.id} className={classNames('alert-chip', days < 0 ? 'overdue' : 'soon')} onClick={() => setDetail({ open: true, debt })}>
                {debt.contraparte} · {money(debtBalance(debt))} · {days < 0 ? `${Math.abs(days)}d vencido` : days === 0 ? 'hoy' : `${days}d`}
              </button>
            ))}
          </div>
        </div>
      )}

      {debts.filter((d) => (d.direccion || 'cobrar') === dir).length === 0 ? (
        <EmptyState
          title={isCobrar ? 'Nadie te debe… por ahora' : 'No tienes deudas registradas'}
          body={isCobrar
            ? 'Registra las ventas a crédito (fiados) para llevar el control de quién te debe, cuánto y cuándo vence cada saldo.'
            : 'Registra el dinero que debes a proveedores o personas para no perder de vista tus pagos y vencimientos.'}
          action={<button className="btn-primary" onClick={() => setDrawer({ open: true, editing: null })}><span>+</span> Registrar primera deuda</button>}
        />
      ) : (
        <div className="card">
          <div className="filters-bar">
            <div className="filters-left">
              <div className="search-field">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.1"/><path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nombre o concepto…" />
              </div>
              <div className="mini-tabs">
                {statusFilters.map(([id, label]) => (
                  <button key={id} className={classNames('mini-tab', statusFilter === id && 'is-active')} onClick={() => setStatusFilter(id)}>{label}</button>
                ))}
              </div>
            </div>
            <div className="filters-right">
              <span className="dir-total">{isCobrar ? 'Por cobrar' : 'Por pagar'}: <strong>{money(dirTotal)}</strong></span>
            </div>
          </div>

          {list.length === 0 ? (
            <div className="empty-row" style={{ padding: '40px 0' }}>Sin deudas para este filtro.</div>
          ) : (
            <div className="table-wrap">
              <table className="movs deudas-table">
                <thead>
                  <tr>
                    <th className="sem-col"></th>
                    <th>{isCobrar ? 'Cliente' : 'Acreedor'}</th>
                    <th>Concepto</th>
                    <th className="num">Total</th>
                    <th className="num">Abonado</th>
                    <th className="num">Saldo</th>
                    <th>Vence</th>
                    <th>Estado</th>
                    <th className="actions-col"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((d) => {
                    const saldo = debtBalance(d);
                    const dleft = d.sinVencimiento ? null : daysUntil(d.fechaVencimiento);
                    return (
                      <tr key={d.id} className="deuda-row" onClick={() => setDetail({ open: true, debt: d })}>
                        <td className="sem-col"><SemaforoDot debt={d} /></td>
                        <td className="concept">
                          <div className="deuda-party">
                            <span>{d.contraparte}</span>
                            {d.telefono && <span className="muted small">{d.telefono}</span>}
                          </div>
                        </td>
                        <td className="muted">{d.concepto || '—'}</td>
                        <td className="num">{money(d.total)}</td>
                        <td className="num muted">{money(debtPaid(d))}</td>
                        <td className={classNames('num', saldo > 0 ? 'amount neg' : 'muted')}>{money(saldo)}</td>
                        <td className="muted">
                          {d.sinVencimiento || !d.fechaVencimiento ? '—' : (
                            <span className="vence-cell">
                              {formatDate(d.fechaVencimiento)}
                              {dleft != null && saldo > 0 && (
                                <span className={classNames('days-pill', dleft < 0 ? 'overdue' : dleft <= 3 ? 'soon' : '')}>
                                  {dleft < 0 ? `${Math.abs(dleft)}d` : dleft === 0 ? 'hoy' : `${dleft}d`}
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                        <td><DebtStatusPill debt={d} /></td>
                        <td className="actions-col" onClick={(e) => e.stopPropagation()}>
                          <div className="row-actions">
                            <button className="row-btn" onClick={() => setDrawer({ open: true, editing: d })} title="Editar"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4.5 11.5 2 12l.5-2.5L9.5 2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg></button>
                            <button className="row-btn danger" onClick={() => askDelete(d)} title="Eliminar"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4h9M5 4V2.5h4V4M4 4l.5 7.5h5L10 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <DeudaDrawer
        open={drawer.open} editing={drawer.editing} defaultDir={dir}
        onClose={() => setDrawer({ open: false, editing: null })}
        onSave={onSave}
      />
      <DeudaDetailDrawer
        open={detail.open} debt={detail.debt ? debts.find((x) => x.id === detail.debt.id) || detail.debt : null} bank={bankAccount}
        onClose={() => setDetail({ open: false, debt: null })}
        onAddPayment={onAddPayment}
        onDeletePayment={onDeletePayment}
        onEdit={(d) => { setDetail({ open: false, debt: null }); setDrawer({ open: true, editing: d }); }}
        onDelete={askDelete}
      />
    </>
  );
}

Object.assign(window, { DeudasView });
