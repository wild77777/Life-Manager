// ============================================================
// Life Manager — CRM module (clients, projects, payments, WhatsApp)
// ============================================================
const { useState: useCrmState, useMemo: useCrmMemo, useEffect: useCrmEffect } = React;

// ---- Small helpers -----------------------------------------
function clientFullName(c) {
  return [c.nombre, c.apellido].filter(Boolean).join(' ') || 'Sin nombre';
}
function clientInitials(c) {
  return [c.nombre, c.apellido].filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '–';
}

// ============================================================
// Drawer: CRM client
// ============================================================
function CrmClientDrawer({ open, onClose, onSave, editing }) {
  const [f, setF] = useCrmState({});
  const [touched, setTouched] = useCrmState(false);
  useCrmEffect(() => {
    if (!open) return;
    setF(editing ? { ...editing } : { nombre: '', apellido: '', celular: '', whatsapp: '', cedula: '', email: '', direccion: '' });
    setTouched(false);
  }, [open, editing]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const valid = (f.nombre || '').trim() && (f.whatsapp || '').trim();

  function copyCelToWa() { set('whatsapp', f.celular || ''); }

  function handleSave() {
    setTouched(true);
    if (!valid) return;
    onSave({
      id: editing ? editing.id : newId('crmcli'),
      nombre: (f.nombre || '').trim(),
      apellido: (f.apellido || '').trim(),
      celular: (f.celular || '').trim(),
      whatsapp: (f.whatsapp || '').trim(),
      cedula: (f.cedula || '').trim(),
      email: (f.email || '').trim(),
      direccion: (f.direccion || '').trim(),
      createdAt: editing ? editing.createdAt : todayISO(),
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
            <div className="drawer-title">{editing ? clientFullName(editing) : 'Registrar cliente'}</div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="drawer-body">
          <div className="field-row">
            <div className="field">
              <label>Nombre</label>
              <input value={f.nombre || ''} onChange={(e) => set('nombre', e.target.value)} placeholder="ej. Carlos" />
              {touched && !(f.nombre || '').trim() && <div className="field-error">Indica el nombre.</div>}
            </div>
            <div className="field">
              <label>Apellido</label>
              <input value={f.apellido || ''} onChange={(e) => set('apellido', e.target.value)} placeholder="ej. Rivas" />
            </div>
          </div>
          <div className="field">
            <label>Número celular</label>
            <input value={f.celular || ''} onChange={(e) => set('celular', e.target.value)} placeholder="ej. 0991234567" />
          </div>
          <div className="field">
            <label>
              Número de WhatsApp
              {f.celular && f.celular !== f.whatsapp && (
                <button type="button" className="link-btn inline-link" onClick={copyCelToWa}>usar el mismo celular</button>
              )}
            </label>
            <input value={f.whatsapp || ''} onChange={(e) => set('whatsapp', e.target.value)} placeholder="Con código de país, ej. 593991234567" />
            <div className="field-hint">Incluye el código de país (Ecuador = 593) para que el envío funcione.</div>
            {touched && !(f.whatsapp || '').trim() && <div className="field-error">El WhatsApp es necesario para enviar el detalle.</div>}
          </div>
          <div className="field">
            <label>Número de cédula</label>
            <input value={f.cedula || ''} onChange={(e) => set('cedula', e.target.value)} placeholder="ej. 0912345678" />
          </div>
          <div className="field">
            <label>Correo electrónico <span className="muted small">opcional</span></label>
            <input type="email" value={f.email || ''} onChange={(e) => set('email', e.target.value)} placeholder="cliente@correo.com" />
          </div>
          <div className="field">
            <label>Dirección <span className="muted small">opcional</span></label>
            <textarea rows="2" value={f.direccion || ''} onChange={(e) => set('direccion', e.target.value)} placeholder="Calle, ciudad, referencia…" />
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

// ============================================================
// Drawer: project
// ============================================================
function ProjectDrawer({ open, onClose, onSave, editing, clientName }) {
  const [f, setF] = useCrmState({});
  const [touched, setTouched] = useCrmState(false);
  useCrmEffect(() => {
    if (!open) return;
    setF(editing ? { ...editing } : {
      nombre: '', descripcion: '', estado: 'pendiente',
      fechaInicio: todayISO(), fechaLimite: '', plazoIndefinido: false, precioTotal: '',
    });
    setTouched(false);
  }, [open, editing]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const valid = (f.nombre || '').trim() && +f.precioTotal >= 0 && f.precioTotal !== '';

  function handleSave() {
    setTouched(true);
    if (!valid) return;
    onSave({
      id: editing ? editing.id : newId('proj'),
      clienteId: editing ? editing.clienteId : f.clienteId,
      nombre: (f.nombre || '').trim(),
      descripcion: (f.descripcion || '').trim(),
      estado: f.estado || 'pendiente',
      fechaInicio: f.fechaInicio || todayISO(),
      fechaLimite: f.plazoIndefinido ? '' : (f.fechaLimite || ''),
      plazoIndefinido: !!f.plazoIndefinido,
      precioTotal: +(+f.precioTotal || 0).toFixed(2),
      pagos: editing ? (editing.pagos || []) : [],
      observaciones: editing ? (editing.observaciones || []) : [],
    }, !!editing);
    onClose();
  }

  return (
    <>
      <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
      <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="drawer-eyebrow">{editing ? 'Editar proyecto' : 'Nuevo proyecto'}</div>
            <div className="drawer-title">{clientName || 'Servicio / trabajo'}</div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="drawer-body">
          <div className="field">
            <label>Nombre del servicio</label>
            <input value={f.nombre || ''} onChange={(e) => set('nombre', e.target.value)} placeholder="ej. Página web corporativa" />
            {touched && !(f.nombre || '').trim() && <div className="field-error">Indica el nombre del servicio.</div>}
          </div>
          <div className="field">
            <label>Descripción del trabajo</label>
            <textarea rows="3" value={f.descripcion || ''} onChange={(e) => set('descripcion', e.target.value)} placeholder="Alcance, módulos, detalles del proyecto…" />
          </div>
          <div className="field">
            <label>Estado del proyecto</label>
            <div className="chip-row">
              {PROJECT_STATES.map((s) => (
                <button key={s.id} className={classNames('chip', f.estado === s.id && 'is-active')} onClick={() => set('estado', s.id)}>{s.label}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Precio total del proyecto (USD)</label>
            <div className="amount-input">
              <span className="amount-symbol">$</span>
              <input type="number" step="0.01" min="0" value={f.precioTotal || ''} onChange={(e) => set('precioTotal', e.target.value)} placeholder="0.00" />
              <span className="amount-iso">USD</span>
            </div>
            {touched && (f.precioTotal === '' || +f.precioTotal < 0) && <div className="field-error">Indica el precio total.</div>}
          </div>
          <div className="field-row">
            <div className="field">
              <label>Fecha de inicio</label>
              <input type="date" value={f.fechaInicio || ''} onChange={(e) => set('fechaInicio', e.target.value)} />
            </div>
            <div className="field">
              <label>Fecha límite de entrega</label>
              <input type="date" value={f.fechaLimite || ''} disabled={f.plazoIndefinido} onChange={(e) => set('fechaLimite', e.target.value)} />
            </div>
          </div>
          <label className="check-row">
            <input type="checkbox" checked={!!f.plazoIndefinido} onChange={(e) => set('plazoIndefinido', e.target.checked)} />
            <span>Plazo indefinido (sin fecha límite)</span>
          </label>
        </div>
        <footer className="drawer-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave}>{editing ? 'Guardar cambios' : 'Crear proyecto'}</button>
        </footer>
      </aside>
    </>
  );
}

// ============================================================
// Drawer: payment
// ============================================================
function PaymentDrawer({ open, onClose, onSave, project }) {
  const [monto, setMonto] = useCrmState('');
  const [metodo, setMetodo] = useCrmState('transferencia');
  const [fecha, setFecha] = useCrmState(todayISO());
  const [nota, setNota] = useCrmState('');
  const [touched, setTouched] = useCrmState(false);

  useCrmEffect(() => {
    if (!open) return;
    setMonto(''); setMetodo('transferencia'); setFecha(todayISO()); setNota(''); setTouched(false);
  }, [open]);

  const pending = project ? projectPending(project) : 0;
  const valid = monto && +monto > 0;

  function handleSave() {
    setTouched(true);
    if (!valid) return;
    onSave({
      id: newId('pay'),
      monto: +(+monto).toFixed(2),
      metodo, fecha,
      nota: nota.trim(),
    });
    onClose();
  }

  return (
    <>
      <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
      <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="drawer-eyebrow">Registrar abono</div>
            <div className="drawer-title">{project ? project.nombre : 'Abono'}</div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="drawer-body">
          {project && (
            <div className="callout">
              Pendiente actual: <strong>{money(pending)}</strong> de {money(project.precioTotal)}
            </div>
          )}
          <div className="field amount-field">
            <label>Monto del abono</label>
            <div className="amount-input">
              <span className="amount-symbol">$</span>
              <input type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" />
              <span className="amount-iso">USD</span>
            </div>
            {pending > 0 && (
              <button type="button" className="link-btn inline-link" onClick={() => setMonto(String(pending))}>Abonar el total pendiente ({money(pending)})</button>
            )}
            {touched && !valid && <div className="field-error">Indica un monto mayor a 0.</div>}
          </div>
          <div className="field">
            <label>Método de pago</label>
            <div className="chip-row">
              {PAYMENT_METHODS.map((m) => (
                <button key={m.id} className={classNames('chip', metodo === m.id && 'is-active')} onClick={() => setMetodo(m.id)}>{m.label}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Fecha del abono</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="field">
            <label>Nota <span className="muted small">opcional</span></label>
            <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="ej. Primer abono, comprobante #123" />
          </div>
        </div>
        <footer className="drawer-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave}>Registrar abono</button>
        </footer>
      </aside>
    </>
  );
}

// ============================================================
// Drawer: bank account
// ============================================================
function BankDrawer({ open, onClose, onSave, bank }) {
  const [f, setF] = useCrmState({});
  useCrmEffect(() => { if (open) setF({ ...bank }); }, [open, bank]);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  return (
    <>
      <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
      <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="drawer-eyebrow">Cuenta bancaria</div>
            <div className="drawer-title">Datos para cobros</div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="drawer-body">
          <div className="callout">Estos datos se adjuntan automáticamente al mensaje de WhatsApp cuando el proyecto tiene saldo pendiente.</div>
          <div className="field">
            <label>Banco</label>
            <input value={f.banco || ''} onChange={(e) => set('banco', e.target.value)} placeholder="ej. Banco Guayaquil" />
          </div>
          <div className="field">
            <label>Tipo de cuenta</label>
            <div className="chip-row">
              {['Corriente', 'Ahorros'].map((t) => (
                <button key={t} className={classNames('chip', f.tipoCuenta === t && 'is-active')} onClick={() => set('tipoCuenta', t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Número de cuenta</label>
            <input value={f.numeroCuenta || ''} onChange={(e) => set('numeroCuenta', e.target.value)} placeholder="ej. 0003747328" />
          </div>
          <div className="field">
            <label>Nombre del titular</label>
            <input value={f.titular || ''} onChange={(e) => set('titular', e.target.value)} placeholder="ej. Jordy Colón Pincay" />
          </div>
        </div>
        <footer className="drawer-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => { onSave({
            banco: (f.banco || '').trim(), tipoCuenta: f.tipoCuenta || 'Corriente',
            numeroCuenta: (f.numeroCuenta || '').trim(), titular: (f.titular || '').trim(),
          }); onClose(); }}>Guardar cuenta</button>
        </footer>
      </aside>
    </>
  );
}

// ============================================================
// Drawer: WhatsApp preview before sending
// ============================================================
function WhatsappDrawer({ open, onClose, project, client, bank, onToast }) {
  const [msg, setMsg] = useCrmState('');
  useCrmEffect(() => {
    if (open && project && client) setMsg(buildWhatsappMessage(project, client, bank));
  }, [open, project, client, bank]);

  if (!project || !client) {
    return (
      <>
        <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
        <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open} />
      </>
    );
  }

  const hasWa = !!String(client.whatsapp || '').replace(/[^\d]/g, '');

  function send() {
    if (!hasWa) { onToast && onToast('Este cliente no tiene WhatsApp registrado.'); return; }
    window.open(whatsappLink(client.whatsapp, msg), '_blank');
    onToast && onToast('Abriendo WhatsApp…');
    onClose();
  }
  async function copy() {
    try { await navigator.clipboard.writeText(msg); onToast && onToast('Mensaje copiado.'); }
    catch (e) { onToast && onToast('No se pudo copiar.'); }
  }

  return (
    <>
      <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
      <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="drawer-eyebrow">Enviar al cliente</div>
            <div className="drawer-title">Detalle por WhatsApp</div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="drawer-body">
          <div className="wa-to">
            <span className="avatar-sm">{clientInitials(client)}</span>
            <div>
              <div className="wa-to-name">{clientFullName(client)}</div>
              <div className="muted small">{hasWa ? `WhatsApp: ${client.whatsapp}` : 'Sin número de WhatsApp'}</div>
            </div>
          </div>
          {!hasWa && <div className="callout callout-warn">Registra el WhatsApp del cliente (con código de país) para poder enviar.</div>}
          {!(bank && (bank.banco || bank.numeroCuenta)) && projectPending(project) > 0 && (
            <div className="callout callout-warn">No has configurado la cuenta bancaria. El mensaje se enviará sin los datos de cobro.</div>
          )}
          <div className="field">
            <label>Mensaje (editable)</label>
            <textarea className="wa-textarea" rows="14" value={msg} onChange={(e) => setMsg(e.target.value)} />
          </div>
        </div>
        <footer className="drawer-foot">
          <button className="btn-ghost" onClick={copy}>Copiar</button>
          <button className="btn-primary btn-wa" onClick={send} disabled={!hasWa}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.01c-.24.68-1.42 1.31-1.96 1.36-.5.05-.96.23-3.23-.67-2.73-1.08-4.45-3.86-4.58-4.04-.13-.18-1.1-1.46-1.1-2.79s.7-1.98.94-2.25c.24-.27.53-.34.71-.34.18 0 .35 0 .51.01.16.01.39-.06.6.46.24.56.78 1.91.85 2.05.07.14.12.3.02.48-.09.18-.14.29-.28.45-.14.16-.29.36-.42.48-.14.14-.28.28-.12.55.16.27.71 1.17 1.53 1.9 1.05.93 1.94 1.22 2.21 1.36.27.14.43.12.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.6-.14.24.09 1.55.73 1.81.86.27.13.45.2.51.31.07.11.07.63-.17 1.31z"/></svg>
            Enviar por WhatsApp
          </button>
        </footer>
      </aside>
    </>
  );
}

// ============================================================
// Drawer: reporte consolidado del cliente (todos los proyectos)
// ============================================================
function ClientReportDrawer({ open, onClose, client, projects, bank, onToast }) {
  const [msg, setMsg] = useCrmState('');
  useCrmEffect(() => {
    if (open && client) setMsg(buildClientReport(client, projects || [], bank));
  }, [open, client, projects, bank]);

  if (!client) {
    return (
      <>
        <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
        <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open} />
      </>
    );
  }

  const t = clientReportTotals(projects || []);
  const hasWa = !!String(client.whatsapp || '').replace(/[^\d]/g, '');

  function send() {
    if (!hasWa) { onToast && onToast('Este cliente no tiene WhatsApp registrado.'); return; }
    window.open(whatsappLink(client.whatsapp, msg), '_blank');
    onToast && onToast('Abriendo WhatsApp…');
    onClose();
  }
  async function copy() {
    try { await navigator.clipboard.writeText(msg); onToast && onToast('Reporte copiado.'); }
    catch (e) { onToast && onToast('No se pudo copiar.'); }
  }
  function pdf() {
    const html = buildClientReportHTML(client, projects || [], bank);
    const w = window.open('', '_blank');
    if (!w) { onToast && onToast('Permite las ventanas emergentes para generar el PDF.'); return; }
    w.document.open(); w.document.write(html); w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch (e) {} }, 350);
    onToast && onToast('Abriendo vista de impresión → guarda como PDF.');
  }

  return (
    <>
      <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
      <aside className={classNames('drawer drawer-wide', open && 'is-open')} aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="drawer-eyebrow">Reporte completo</div>
            <div className="drawer-title">{[client.nombre, client.apellido].filter(Boolean).join(' ') || 'Cliente'}</div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="drawer-body">
          {(projects || []).length === 0 ? (
            <div className="callout callout-warn">Este cliente aún no tiene proyectos para reportar.</div>
          ) : (
            <>
              <div className="report-summary">
                <div className="rs-cell"><span>Proyectos</span><strong>{t.count}</strong></div>
                <div className="rs-cell"><span>Total</span><strong>{money(t.total)}</strong></div>
                <div className="rs-cell"><span>Abonado</span><strong className="pos">{money(t.abonado)}</strong></div>
                <div className="rs-cell"><span>Saldo</span><strong className="neg">{money(t.pendiente)}</strong></div>
              </div>

              <button className="btn-primary btn-block report-pdf-btn" onClick={pdf}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M4 1.5h5l3 3V14a.5.5 0 0 1-.5.5h-7A.5.5 0 0 1 4 14V2a.5.5 0 0 1 .5-.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/><path d="M9 1.5V4.5H12M6 8.5h4M6 11h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
                Descargar / Imprimir PDF
              </button>

              {!hasWa && <div className="callout callout-warn">Registra el WhatsApp del cliente (con código de país) para poder enviarlo por chat.</div>}

              <div className="field">
                <label>Mensaje para WhatsApp (editable)</label>
                <textarea className="wa-textarea" rows="16" value={msg} onChange={(e) => setMsg(e.target.value)} />
              </div>
            </>
          )}
        </div>
        <footer className="drawer-foot">
          <button className="btn-ghost" onClick={copy} disabled={(projects || []).length === 0}>Copiar texto</button>
          <button className="btn-primary btn-wa" onClick={send} disabled={!hasWa || (projects || []).length === 0}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.01c-.24.68-1.42 1.31-1.96 1.36-.5.05-.96.23-3.23-.67-2.73-1.08-4.45-3.86-4.58-4.04-.13-.18-1.1-1.46-1.1-2.79s.7-1.98.94-2.25c.24-.27.53-.34.71-.34.18 0 .35 0 .51.01.16.01.39-.06.6.46.24.56.78 1.91.85 2.05.07.14.12.3.02.48-.09.18-.14.29-.28.45-.14.16-.29.36-.42.48-.14.14-.28.28-.12.55.16.27.71 1.17 1.53 1.9 1.05.93 1.94 1.22 2.21 1.36.27.14.43.12.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.6-.14.24.09 1.55.73 1.81.86.27.13.45.2.51.31.07.11.07.63-.17 1.31z"/></svg>
            Enviar por WhatsApp
          </button>
        </footer>
      </aside>
    </>
  );
}

// ============================================================
// Project card (detail)
// ============================================================
function ProjectCard({ project, client, bank, onEdit, onDelete, onAddPayment, onDeletePayment, onChangeState, onAddObservation, onToggleObservation, onDeleteObservation, onSendWhatsapp }) {
  const [obsText, setObsText] = useCrmState('');
  const paid = projectPaid(project);
  const pending = projectPending(project);
  const total = +project.precioTotal || 0;
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const state = projectStateMeta(project.estado);
  const dleft = project.plazoIndefinido ? null : daysUntil(project.fechaLimite);

  const pagos = [...(project.pagos || [])].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const obs = [...(project.observaciones || [])].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  function addObs(text) {
    const t = (text != null ? text : obsText).trim();
    if (!t) return;
    onAddObservation(project.id, t);
    setObsText('');
  }

  return (
    <div className="proj-card">
      <div className="proj-card-head">
        <div className="proj-title-wrap">
          <span className={classNames('state-badge', 'state-' + state.cls)}>{state.label}</span>
          <h3 className="proj-name">{project.nombre}</h3>
        </div>
        <div className="proj-head-actions">
          <button className="row-btn" onClick={() => onEdit(project)} title="Editar proyecto"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4.5 11.5 2 12l.5-2.5L9.5 2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg></button>
          <button className="row-btn danger" onClick={() => onDelete(project)} title="Eliminar proyecto"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4h9M5 4V2.5h4V4M4 4l.5 7.5h5L10 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        </div>
      </div>

      {project.descripcion && <p className="proj-desc">{project.descripcion}</p>}

      <div className="proj-meta-row">
        <div className="proj-meta">
          <span className="meta-label">Inicio</span>
          <span className="meta-value">{project.fechaInicio ? formatDateFull(project.fechaInicio) : '—'}</span>
        </div>
        <div className="proj-meta">
          <span className="meta-label">Entrega</span>
          <span className="meta-value">
            {project.plazoIndefinido ? 'Plazo indefinido' : (project.fechaLimite ? formatDateFull(project.fechaLimite) : '—')}
            {dleft != null && (
              <span className={classNames('days-pill', dleft < 0 ? 'overdue' : dleft <= 3 ? 'soon' : '')}>
                {dleft < 0 ? `${Math.abs(dleft)}d vencido` : dleft === 0 ? 'hoy' : `${dleft}d`}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Financial */}
      <div className="proj-finance">
        <div className="finance-bars">
          <div className="finance-bar"><div className="finance-bar-fill" style={{ width: pct + '%' }} /></div>
        </div>
        <div className="finance-grid">
          <div><span className="ts-label">Total</span><span className="ts-value">{money(total)}</span></div>
          <div><span className="ts-label">Abonado</span><span className="ts-value pos">{money(paid)}</span></div>
          <div><span className="ts-label">Pendiente</span><span className={classNames('ts-value', pending > 0 && 'neg')}>{money(pending)}</span></div>
        </div>
      </div>

      {/* State changer */}
      <div className="proj-section">
        <div className="proj-section-title">Cambiar estado</div>
        <div className="state-switch">
          {PROJECT_STATES.map((s) => (
            <button key={s.id} className={classNames('state-opt', project.estado === s.id && 'is-active', 'state-' + s.cls)} onClick={() => onChangeState(project.id, s.id)}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Payments */}
      <div className="proj-section">
        <div className="proj-section-head">
          <div className="proj-section-title">Historial de pagos</div>
          <button className="btn-tiny" onClick={() => onAddPayment(project)}>+ Abono</button>
        </div>
        {pagos.length === 0 ? (
          <div className="mini-empty">Sin abonos registrados.</div>
        ) : (
          <ul className="pay-list">
            {pagos.map((p) => (
              <li key={p.id} className="pay-row">
                <span className="pay-date">{formatDateFull(p.fecha)}</span>
                <span className="pay-method">{paymentMethodLabel(p.metodo)}{p.nota ? ` · ${p.nota}` : ''}</span>
                <span className="pay-amount">{money(p.monto)}</span>
                <button className="row-btn danger" onClick={() => onDeletePayment(project.id, p.id)} title="Eliminar abono"><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2.5 4h9M5 4V2.5h4V4M4 4l.5 7.5h5L10 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Observations / internal comms */}
      <div className="proj-section">
        <div className="proj-section-title">Observaciones internas</div>
        <div className="obs-presets">
          {OBSERVATION_PRESETS.map((p) => (
            <button key={p} className="obs-preset" onClick={() => addObs(p)}>+ {p}</button>
          ))}
        </div>
        <div className="obs-composer">
          <input value={obsText} onChange={(e) => setObsText(e.target.value)} placeholder="Escribe una observación…"
            onKeyDown={(e) => { if (e.key === 'Enter') addObs(); }} />
          <button className="btn-tiny" onClick={() => addObs()}>Agregar</button>
        </div>
        {obs.length > 0 && (
          <ul className="obs-list">
            {obs.map((o) => (
              <li key={o.id} className={classNames('obs-row', o.resuelto && 'is-done')}>
                <button className="obs-check" onClick={() => onToggleObservation(project.id, o.id)} title={o.resuelto ? 'Marcar pendiente' : 'Marcar resuelto'}>
                  {o.resuelto
                    ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5L6 11l5.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : <span className="obs-dot" />}
                </button>
                <span className="obs-text">{o.texto}</span>
                <span className="obs-date">{formatDate(o.fecha)}</span>
                <button className="row-btn danger" onClick={() => onDeleteObservation(project.id, o.id)} title="Eliminar"><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2.5 4h9M5 4V2.5h4V4M4 4l.5 7.5h5L10 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Send to client */}
      <div className="proj-send">
        <button className="btn-primary btn-wa btn-block" onClick={() => onSendWhatsapp(project)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.01c-.24.68-1.42 1.31-1.96 1.36-.5.05-.96.23-3.23-.67-2.73-1.08-4.45-3.86-4.58-4.04-.13-.18-1.1-1.46-1.1-2.79s.7-1.98.94-2.25c.24-.27.53-.34.71-.34.18 0 .35 0 .51.01.16.01.39-.06.6.46.24.56.78 1.91.85 2.05.07.14.12.3.02.48-.09.18-.14.29-.28.45-.14.16-.29.36-.42.48-.14.14-.28.28-.12.55.16.27.71 1.17 1.53 1.9 1.05.93 1.94 1.22 2.21 1.36.27.14.43.12.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.6-.14.24.09 1.55.73 1.81.86.27.13.45.2.51.31.07.11.07.63-.17 1.31z"/></svg>
          Enviar detalle al cliente
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Main CRM view
// ============================================================
function CrmView(props) {
  const {
    crmClients, crmProjects, bankAccount,
    onSaveClient, onDeleteClient, onSaveProject, onDeleteProject,
    onAddPayment, onDeletePayment, onChangeState,
    onAddObservation, onToggleObservation, onDeleteObservation,
    onSaveBank, onToast, onConfirm,
  } = props;

  const [selectedId, setSelectedId] = useCrmState(null);
  const [search, setSearch] = useCrmState('');

  // Drawers (managed locally)
  const [cliDrawer, setCliDrawer] = useCrmState({ open: false, editing: null });
  const [projDrawer, setProjDrawer] = useCrmState({ open: false, editing: null, clienteId: null });
  const [payDrawer, setPayDrawer] = useCrmState({ open: false, project: null });
  const [bankDrawer, setBankDrawer] = useCrmState(false);
  const [waDrawer, setWaDrawer] = useCrmState({ open: false, project: null });
  const [reportDrawer, setReportDrawer] = useCrmState(false);

  // Keep a valid selection
  useCrmEffect(() => {
    if (crmClients.length === 0) { setSelectedId(null); return; }
    if (!selectedId || !crmClients.find((c) => c.id === selectedId)) {
      setSelectedId(crmClients[0].id);
    }
  }, [crmClients]);

  const projectsByClient = useCrmMemo(() => {
    const m = {};
    for (const p of crmProjects) (m[p.clienteId] = m[p.clienteId] || []).push(p);
    return m;
  }, [crmProjects]);

  // Dashboard metrics
  const dash = useCrmMemo(() => {
    let pendientes = 0, entregados = 0, pagosPendientes = 0, totalGenerado = 0, enProceso = 0;
    const alertas = [];
    for (const p of crmProjects) {
      if (p.estado === 'entregado') entregados++;
      else if (p.estado === 'pendiente') pendientes++;
      else if (p.estado === 'proceso') enProceso++;
      const paid = projectPaid(p);
      const pend = projectPending(p);
      pagosPendientes += pend;
      totalGenerado += paid;
      if (!p.plazoIndefinido && p.fechaLimite && p.estado !== 'entregado') {
        const d = daysUntil(p.fechaLimite);
        if (d != null && d <= 5) alertas.push({ project: p, days: d });
      }
    }
    alertas.sort((a, b) => a.days - b.days);
    return { pendientes, enProceso, entregados, pagosPendientes, totalGenerado, alertas };
  }, [crmProjects]);

  const filteredClients = useCrmMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...crmClients].sort((a, b) => clientFullName(a).localeCompare(clientFullName(b)));
    if (!q) return list;
    return list.filter((c) =>
      clientFullName(c).toLowerCase().includes(q) ||
      (c.celular || '').includes(q) ||
      (c.whatsapp || '').includes(q) ||
      (c.cedula || '').includes(q)
    );
  }, [crmClients, search]);

  const selected = crmClients.find((c) => c.id === selectedId) || null;
  const selectedProjects = selected ? (projectsByClient[selected.id] || []) : [];
  const clientName = selected ? clientFullName(selected) : '';

  // Confirm-wrapped deletes
  function askDeleteClient(c) {
    onConfirm({
      title: 'Eliminar cliente',
      body: <>¿Eliminar a "<strong>{clientFullName(c)}</strong>" y todos sus proyectos? Esta acción no se puede deshacer.</>,
      confirmLabel: 'Eliminar',
      onConfirm: () => onDeleteClient(c.id),
    });
  }
  function askDeleteProject(p) {
    onConfirm({
      title: 'Eliminar proyecto',
      body: <>¿Eliminar el proyecto "<strong>{p.nombre}</strong>" con su historial de pagos y observaciones?</>,
      confirmLabel: 'Eliminar',
      onConfirm: () => onDeleteProject(p.id),
    });
  }

  const bankReady = bankAccount && (bankAccount.banco || bankAccount.numeroCuenta);

  return (
    <>
      <section className="action-bar">
        <div className="action-bar-left">
          <div className="page-eyebrow">CRM · Clientes y proyectos</div>
          <h1 className="page-title">gestión</h1>
        </div>
        <div className="action-bar-right">
          <button className={classNames('btn-ghost', !bankReady && 'attn')} onClick={() => setBankDrawer(true)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5l5.5 2.5H1.5L7 1.5zM2 4v6m3-6v6m4-6v6m3-6v6M1.5 12.5h11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {bankReady ? 'Cuenta bancaria' : 'Configurar cuenta'}
          </button>
          <button className="btn-primary" onClick={() => setCliDrawer({ open: true, editing: null })}>
            <span aria-hidden="true">+</span> Nuevo cliente
          </button>
        </div>
      </section>

      {/* Dashboard */}
      <div className="crm-dash">
        <div className="crm-kpi"><span className="kpi-label">Clientes</span><span className="kpi-value">{crmClients.length}</span></div>
        <div className="crm-kpi"><span className="kpi-label">Pendientes</span><span className="kpi-value">{dash.pendientes}</span></div>
        <div className="crm-kpi"><span className="kpi-label">En proceso</span><span className="kpi-value">{dash.enProceso}</span></div>
        <div className="crm-kpi"><span className="kpi-label">Entregados</span><span className="kpi-value">{dash.entregados}</span></div>
        <div className="crm-kpi"><span className="kpi-label">Por cobrar</span><span className="kpi-value neg">{money(dash.pagosPendientes)}</span></div>
        <div className="crm-kpi"><span className="kpi-label">Total generado</span><span className="kpi-value pos">{money(dash.totalGenerado)}</span></div>
      </div>

      {dash.alertas.length > 0 && (
        <div className="crm-alerts">
          <span className="alert-icon">⚠</span>
          <span className="alert-label">Entregas próximas:</span>
          <div className="alert-chips">
            {dash.alertas.slice(0, 6).map(({ project, days }) => (
              <button key={project.id} className={classNames('alert-chip', days < 0 ? 'overdue' : 'soon')}
                onClick={() => setSelectedId(project.clienteId)}>
                {project.nombre} · {days < 0 ? `${Math.abs(days)}d vencido` : days === 0 ? 'hoy' : `${days}d`}
              </button>
            ))}
          </div>
        </div>
      )}

      {crmClients.length === 0 ? (
        <EmptyState
          title="Aún no tienes clientes en el CRM"
          body="Registra tu primer cliente para gestionar sus proyectos web, controlar pagos y enviarle el detalle por WhatsApp."
          action={<button className="btn-primary" onClick={() => setCliDrawer({ open: true, editing: null })}><span>+</span> Registrar primer cliente</button>}
        />
      ) : (
        <div className="crm-layout">
          {/* Clients list */}
          <aside className="crm-clients">
            <div className="crm-search">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.1"/><path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente…" />
            </div>
            <ul className="crm-client-list">
              {filteredClients.map((c) => {
                const projs = projectsByClient[c.id] || [];
                const pend = projs.reduce((s, p) => s + projectPending(p), 0);
                return (
                  <li key={c.id}>
                    <button className={classNames('crm-client-item', selectedId === c.id && 'is-active')} onClick={() => setSelectedId(c.id)}>
                      <span className="avatar-sm">{clientInitials(c)}</span>
                      <span className="cci-main">
                        <span className="cci-name">{clientFullName(c)}</span>
                        <span className="cci-sub">{projs.length} {projs.length === 1 ? 'proyecto' : 'proyectos'}{pend > 0 ? ` · ${money(pend)} por cobrar` : ''}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {filteredClients.length === 0 && <li className="mini-empty">Sin coincidencias.</li>}
            </ul>
          </aside>

          {/* Detail */}
          <div className="crm-detail">
            {selected && (
              <>
                <div className="crm-client-head">
                  <div className="cch-left">
                    <span className="avatar-lg">{clientInitials(selected)}</span>
                    <div>
                      <h2 className="cch-name">{clientFullName(selected)}</h2>
                      <div className="cch-contacts">
                        {selected.celular && <span>📱 {selected.celular}</span>}
                        {selected.whatsapp && <span>🟢 {selected.whatsapp}</span>}
                        {selected.cedula && <span>🪪 {selected.cedula}</span>}
                        {selected.email && <span>✉ {selected.email}</span>}
                      </div>
                      {selected.direccion && <div className="cch-addr">📍 {selected.direccion}</div>}
                    </div>
                  </div>
                  <div className="cch-actions">
                    <button className="btn-primary btn-sm cch-report" onClick={() => setReportDrawer(true)} title="Reporte completo del cliente">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 1.5h5l3 3V14a.5.5 0 0 1-.5.5h-7A.5.5 0 0 1 4 14V2a.5.5 0 0 1 .5-.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/><path d="M9 1.5V4.5H12M6 8.5h4M6 11h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
                      Reporte completo
                    </button>
                    <button className="row-btn" onClick={() => setCliDrawer({ open: true, editing: selected })} title="Editar cliente"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4.5 11.5 2 12l.5-2.5L9.5 2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg></button>
                    <button className="row-btn danger" onClick={() => askDeleteClient(selected)} title="Eliminar cliente"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4h9M5 4V2.5h4V4M4 4l.5 7.5h5L10 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                  </div>
                </div>

                <div className="crm-projects-head">
                  <div className="proj-count">{selectedProjects.length} {selectedProjects.length === 1 ? 'proyecto' : 'proyectos'}</div>
                  <button className="btn-primary btn-sm" onClick={() => setProjDrawer({ open: true, editing: null, clienteId: selected.id })}><span>+</span> Nuevo proyecto</button>
                </div>

                {selectedProjects.length === 0 ? (
                  <div className="mini-empty pad">Este cliente aún no tiene proyectos. Crea el primero.</div>
                ) : (
                  <div className="proj-list">
                    {selectedProjects.map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p} client={selected} bank={bankAccount}
                        onEdit={(proj) => setProjDrawer({ open: true, editing: proj, clienteId: selected.id })}
                        onDelete={askDeleteProject}
                        onAddPayment={(proj) => setPayDrawer({ open: true, project: proj })}
                        onDeletePayment={onDeletePayment}
                        onChangeState={onChangeState}
                        onAddObservation={onAddObservation}
                        onToggleObservation={onToggleObservation}
                        onDeleteObservation={onDeleteObservation}
                        onSendWhatsapp={(proj) => setWaDrawer({ open: true, project: proj })}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Drawers */}
      <CrmClientDrawer
        open={cliDrawer.open} editing={cliDrawer.editing}
        onClose={() => setCliDrawer({ open: false, editing: null })}
        onSave={onSaveClient}
      />
      <ProjectDrawer
        open={projDrawer.open} editing={projDrawer.editing} clientName={clientName}
        onClose={() => setProjDrawer({ open: false, editing: null, clienteId: null })}
        onSave={(proj, isEdit) => onSaveProject(proj, isEdit, projDrawer.clienteId)}
      />
      <PaymentDrawer
        open={payDrawer.open} project={payDrawer.project}
        onClose={() => setPayDrawer({ open: false, project: null })}
        onSave={(pago) => onAddPayment(payDrawer.project.id, pago)}
      />
      <BankDrawer
        open={bankDrawer} bank={bankAccount}
        onClose={() => setBankDrawer(false)}
        onSave={onSaveBank}
      />
      <WhatsappDrawer
        open={waDrawer.open} project={waDrawer.project} client={selected} bank={bankAccount}
        onClose={() => setWaDrawer({ open: false, project: null })}
        onToast={onToast}
      />
      <ClientReportDrawer
        open={reportDrawer} client={selected} projects={selectedProjects} bank={bankAccount}
        onClose={() => setReportDrawer(false)}
        onToast={onToast}
      />
    </>
  );
}

Object.assign(window, { CrmView });
