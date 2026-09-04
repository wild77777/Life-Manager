// ============================================================
// Life Manager — Pedidos
// Delivery Guayaquil · Ventas en local · Cuadre de repartidores
// ============================================================
const { useState: usePState, useMemo: usePMemo, useEffect: usePEffect } = React;

const HORARIOS = ['Mañana 9–13', 'Tarde 13–18', 'Noche 18–21', 'A convenir'];

// ---- Píldoras de estado ------------------------------------
function EstadoPill({ estado, size }) {
  const m = pedidoEstadoMeta(estado);
  return <span className={classNames('ped-pill', 'ped-' + m.cls, size === 'sm' && 'is-sm')}>{m.label}</span>;
}
function EstadoDot({ estado }) {
  const m = pedidoEstadoMeta(estado);
  return <span className={classNames('semaforo-dot', 'sem-' + m.dot)} title={m.label} />;
}

function waHref(tel, msg) { return whatsappLink(tel, msg); }
function hasTel(tel) { return !!String(tel || '').replace(/[^\d]/g, ''); }

// ============================================================
// Editor de productos del pedido
// ============================================================
function ItemsEditor({ items, setItems, products }) {
  function addFromProduct(id) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    const existing = items.find((it) => it.productoId === id);
    if (existing) {
      setItems(items.map((it) => it.productoId === id ? { ...it, cantidad: (+it.cantidad || 0) + 1 } : it));
    } else {
      setItems([...items, { id: newId('it'), productoId: p.id, nombre: p.nombre, precio: +p.precio || 0, cantidad: 1 }]);
    }
  }
  function addManual() {
    setItems([...items, { id: newId('it'), productoId: '', nombre: '', precio: '', cantidad: 1 }]);
  }
  function upd(id, k, v) { setItems(items.map((it) => it.id === id ? { ...it, [k]: v } : it)); }
  function del(id) { setItems(items.filter((it) => it.id !== id)); }

  const subtotal = items.reduce((s, it) => s + (+it.precio || 0) * (+it.cantidad || 0), 0);

  return (
    <div className="field">
      <label>Productos del pedido</label>

      <div className="items-add">
        <select value="" onChange={(e) => { addFromProduct(e.target.value); e.target.value = ''; }}>
          <option value="">Agregar desde inventario…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre} · {money(p.precio)} · {p.stock} en stock</option>
          ))}
        </select>
        <button type="button" className="btn-ghost btn-sm" onClick={addManual}>+ Ítem libre</button>
      </div>

      {items.length === 0 ? (
        <div className="mini-empty">Todavía no agregas productos.</div>
      ) : (
        <ul className="item-rows">
          <li className="item-head">
            <span>Producto</span><span className="ir-c">Cant</span><span className="ir-c">P. unit</span><span className="ir-c">Total</span><span />
          </li>
          {items.map((it) => (
            <li key={it.id} className="item-row">
              <input
                className="ir-name" value={it.nombre}
                onChange={(e) => upd(it.id, 'nombre', e.target.value)}
                placeholder="Nombre del producto"
              />
              <input
                className="ir-qty" type="number" min="1" step="1" value={it.cantidad}
                onChange={(e) => upd(it.id, 'cantidad', Math.max(1, +e.target.value || 1))}
              />
              <input
                className="ir-price" type="number" min="0" step="0.01" value={it.precio}
                onChange={(e) => upd(it.id, 'precio', e.target.value)} placeholder="0.00"
              />
              <span className="ir-total">{money((+it.precio || 0) * (+it.cantidad || 0))}</span>
              <button type="button" className="row-btn danger" onClick={() => del(it.id)} title="Quitar">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 && (
        <div className="items-subtotal"><span>Subtotal de productos</span><strong>{money(subtotal)}</strong></div>
      )}
    </div>
  );
}

// ============================================================
// Drawer: crear / editar pedido
// ============================================================
function PedidoDrawer({ open, onClose, onSave, editing, canal, products, repartidores, pedidos, clients }) {
  const [f, setF] = usePState({});
  const [items, setItems] = usePState([]);
  const [touched, setTouched] = usePState(false);
  const isEdit = !!editing;
  const ch = f.canal || canal || 'delivery';
  const isLocal = ch === 'local';

  usePEffect(() => {
    if (!open) return;
    if (editing) {
      setF({ ...editing });
      setItems(editing.items || []);
    } else {
      setF({
        canal: canal || 'delivery',
        clienteNombre: '', clienteTelefono: '', clienteId: '',
        zona: 'centro', direccion: '', referencia: '',
        fecha: todayISO(), fechaEntrega: todayISO(), horario: 'A convenir',
        descuento: '', flete: canal === 'local' ? 0 : zonaMeta('centro').flete,
        fleteParaRepartidor: true,
        metodoPago: 'efectivo', repartidorId: '',
        estado: canal === 'local' ? 'entregado' : 'nuevo',
        nota: '',
      });
      setItems([]);
    }
    setTouched(false);
  }, [open, editing, canal]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  function setZona(z) {
    setF((p) => ({ ...p, zona: z, flete: zonaMeta(z).flete }));
  }

  const draft = { ...f, items, canal: ch };
  const subtotal = pedidoSubtotal(draft);
  const total = pedidoTotal(draft);
  const valid = items.length > 0
    && items.every((it) => (it.nombre || '').trim() && +it.cantidad > 0)
    && (isLocal || (f.clienteNombre || '').trim())
    && (isLocal || (f.direccion || '').trim());

  function handleSave() {
    setTouched(true);
    if (!valid) return;
    const p = {
      id: editing ? editing.id : newId('ped'),
      numero: editing ? editing.numero : nextPedidoNumero(pedidos),
      canal: ch,
      clienteNombre: (f.clienteNombre || '').trim(),
      clienteTelefono: (f.clienteTelefono || '').trim(),
      clienteId: f.clienteId || '',
      zona: isLocal ? '' : (f.zona || 'otro'),
      direccion: isLocal ? '' : (f.direccion || '').trim(),
      referencia: isLocal ? '' : (f.referencia || '').trim(),
      fecha: f.fecha || todayISO(),
      fechaEntrega: isLocal ? (f.fecha || todayISO()) : (f.fechaEntrega || f.fecha || todayISO()),
      horario: isLocal ? '' : (f.horario || ''),
      items: items.map((it) => ({ ...it, precio: +(+it.precio || 0).toFixed(2), cantidad: +it.cantidad || 1 })),
      descuento: +(+f.descuento || 0).toFixed(2),
      flete: isLocal ? 0 : +(+f.flete || 0).toFixed(2),
      fleteParaRepartidor: isLocal ? false : !!f.fleteParaRepartidor,
      metodoPago: f.metodoPago || 'efectivo',
      repartidorId: isLocal ? '' : (f.repartidorId || ''),
      estado: f.estado || (isLocal ? 'entregado' : 'nuevo'),
      liquidado: editing ? !!editing.liquidado : (isLocal ? true : false),
      fechaEntregaReal: editing ? editing.fechaEntregaReal : (isLocal ? (f.fecha || todayISO()) : ''),
      nota: (f.nota || '').trim(),
      createdAt: editing ? editing.createdAt : todayISO(),
    };
    onSave(p, isEdit);
    onClose();
  }

  return (
    <>
      <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
      <aside className={classNames('drawer drawer-wide', open && 'is-open')} aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="drawer-eyebrow">{isEdit ? `Editar ${pedidoRef(editing)}` : (isLocal ? 'Venta en local' : 'Nuevo pedido')}</div>
            <div className="drawer-title">{isLocal ? 'Registrar venta del local' : 'Pedido con delivery'}</div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div className="drawer-body">
          {!isEdit && (
            <div className="type-tabs type-tabs-2">
              <button className={classNames('type-tab', !isLocal && 'is-active', 'tab-delivery')} onClick={() => set('canal', 'delivery')}>🛵 Delivery</button>
              <button className={classNames('type-tab', isLocal && 'is-active', 'tab-local')} onClick={() => { set('canal', 'local'); set('estado', 'entregado'); }}>🏪 Local</button>
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label>Cliente {isLocal && <span className="muted small">opcional</span>}</label>
              <input value={f.clienteNombre || ''} onChange={(e) => set('clienteNombre', e.target.value)} placeholder="ej. María Zambrano" list="lm-clientes" />
              <datalist id="lm-clientes">
                {(clients || []).map((c) => <option key={c.id} value={c.nombre} />)}
              </datalist>
              {touched && !isLocal && !(f.clienteNombre || '').trim() && <div className="field-error">Indica el nombre del cliente.</div>}
            </div>
            <div className="field">
              <label>WhatsApp {isLocal && <span className="muted small">opcional</span>}</label>
              <input value={f.clienteTelefono || ''} onChange={(e) => set('clienteTelefono', e.target.value)} placeholder="5939XXXXXXXX" inputMode="tel" />
              {!isLocal && <div className="field-hint">Con 593 al inicio para escribirle directo.</div>}
            </div>
          </div>

          {!isLocal && (
            <>
              <div className="field">
                <label>Zona de Guayaquil</label>
                <div className="zona-grid">
                  {ZONAS_GYE.map((z) => (
                    <button key={z.id} type="button"
                      className={classNames('zona-chip', f.zona === z.id && 'is-active')}
                      onClick={() => setZona(z.id)}>
                      <span className="zc-name">{z.label}</span>
                      {z.flete > 0 && <span className="zc-flete">{money(z.flete)}</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Dirección de entrega</label>
                <textarea rows="2" value={f.direccion || ''} onChange={(e) => set('direccion', e.target.value)} placeholder="ej. Alborada 6ta etapa, Mz 620 V. 12" />
                {touched && !(f.direccion || '').trim() && <div className="field-error">Sin dirección el repartidor no puede salir.</div>}
              </div>

              <div className="field">
                <label>Referencia <span className="muted small">opcional</span></label>
                <input value={f.referencia || ''} onChange={(e) => set('referencia', e.target.value)} placeholder="ej. casa esquinera reja negra, junto a la farmacia" />
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Fecha de entrega</label>
                  <input type="date" value={f.fechaEntrega || ''} onChange={(e) => set('fechaEntrega', e.target.value)} />
                </div>
                <div className="field">
                  <label>Horario</label>
                  <select value={f.horario || ''} onChange={(e) => set('horario', e.target.value)}>
                    {HORARIOS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {isLocal && (
            <div className="field">
              <label>Fecha de la venta</label>
              <input type="date" value={f.fecha || ''} onChange={(e) => set('fecha', e.target.value)} />
            </div>
          )}

          <ItemsEditor items={items} setItems={setItems} products={products} />

          <div className="field-row">
            <div className="field">
              <label>Descuento <span className="muted small">opcional</span></label>
              <div className="amount-input sm">
                <span className="amount-symbol">$</span>
                <input type="number" min="0" step="0.01" value={f.descuento || ''} onChange={(e) => set('descuento', e.target.value)} placeholder="0.00" />
              </div>
            </div>
            {!isLocal && (
              <div className="field">
                <label>Valor del envío</label>
                <div className="amount-input sm">
                  <span className="amount-symbol">$</span>
                  <input type="number" min="0" step="0.01" value={f.flete} onChange={(e) => set('flete', e.target.value)} placeholder="0.00" />
                </div>
              </div>
            )}
          </div>

          {!isLocal && (
            <label className="check-row">
              <input type="checkbox" checked={!!f.fleteParaRepartidor} onChange={(e) => set('fleteParaRepartidor', e.target.checked)} />
              <span>El envío se lo queda el repartidor (se descuenta en el cuadre)</span>
            </label>
          )}

          <div className="field">
            <label>Forma de pago</label>
            <div className="chip-row">
              {PAYMENT_METHODS.map((m) => (
                <button key={m.id} type="button" className={classNames('chip', f.metodoPago === m.id && 'is-active')} onClick={() => set('metodoPago', m.id)}>
                  {m.id === 'efectivo' && !isLocal ? 'Efectivo · contra entrega' : m.label}
                </button>
              ))}
            </div>
          </div>

          {!isLocal && (
            <div className="field-row">
              <div className="field">
                <label>Repartidor <span className="muted small">opcional</span></label>
                <select value={f.repartidorId || ''} onChange={(e) => set('repartidorId', e.target.value)}>
                  <option value="">— Sin asignar —</option>
                  {repartidores.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Estado</label>
                <select value={f.estado || 'nuevo'} onChange={(e) => set('estado', e.target.value)}>
                  {PEDIDO_ESTADOS.map((e2) => <option key={e2.id} value={e2.id}>{e2.label}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="field">
            <label>Nota interna <span className="muted small">opcional</span></label>
            <textarea rows="2" value={f.nota || ''} onChange={(e) => set('nota', e.target.value)} placeholder="ej. llamar antes de llegar, cambio de $20" />
          </div>

          <div className="ped-total-box">
            <div><span>Productos</span><strong>{money(subtotal)}</strong></div>
            {+f.descuento > 0 && <div><span>Descuento</span><strong className="neg">−{money(f.descuento)}</strong></div>}
            {!isLocal && <div><span>Envío</span><strong>{money(f.flete)}</strong></div>}
            <div className="ptb-total"><span>Total a cobrar</span><strong>{money(total)}</strong></div>
          </div>
        </div>

        <footer className="drawer-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave}>
            {isEdit ? 'Guardar cambios' : (isLocal ? 'Registrar venta' : 'Crear pedido')}
          </button>
        </footer>
      </aside>
    </>
  );
}

// ============================================================
// Drawer: detalle del pedido
// ============================================================
function PedidoDetailDrawer({ open, pedido, repartidores, onClose, onEdit, onDelete, onChangeEstado, onAssign, onToast }) {
  if (!pedido) {
    return (
      <>
        <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
        <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open} />
      </>
    );
  }
  const p = pedido;
  const isLocal = p.canal === 'local';
  const rep = repartidores.find((r) => r.id === p.repartidorId);
  const total = pedidoTotal(p);

  function copy(text, msg) {
    navigator.clipboard?.writeText(text).then(() => onToast && onToast(msg || 'Copiado.'));
  }

  return (
    <>
      <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
      <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="drawer-eyebrow">{isLocal ? 'Venta en local' : 'Pedido delivery'} · {pedidoRef(p)}</div>
            <div className="drawer-title">{p.clienteNombre || 'Sin nombre'}</div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div className="drawer-body">
          <div className="detail-status">
            <EstadoPill estado={p.estado} />
            {p.liquidado && p.estado === 'entregado' && <span className="ped-pill ped-liquidado">Liquidado</span>}
            <span className="muted small">{formatDateFull(p.fechaEntrega || p.fecha)}{p.horario ? ` · ${p.horario}` : ''}</span>
          </div>

          {!isLocal && (
            <div className="proj-section">
              <div className="proj-section-title">Avanzar el pedido</div>
              <div className="estado-track">
                {PEDIDO_ESTADOS.filter((e) => !['reagendado', 'devuelto', 'cancelado'].includes(e.id)).map((e) => (
                  <button key={e.id}
                    className={classNames('estado-step', p.estado === e.id && 'is-active', 'st-' + e.cls)}
                    onClick={() => onChangeEstado(p.id, e.id)}>
                    {e.short}
                  </button>
                ))}
              </div>
              <div className="chip-row" style={{ marginTop: 8 }}>
                {['reagendado', 'devuelto', 'cancelado'].map((id) => (
                  <button key={id} className={classNames('chip', p.estado === id && 'is-active')} onClick={() => onChangeEstado(p.id, id)}>
                    {pedidoEstadoMeta(id).label}
                  </button>
                ))}
              </div>
              {p.estado === 'entregado' && (
                <div className="field-hint" style={{ marginTop: 8 }}>
                  Al marcar entregado se registra automáticamente una venta de {money(total)} en Movimientos.
                </div>
              )}
            </div>
          )}

          <div className="proj-section">
            <div className="proj-section-title">Productos</div>
            <ul className="detail-items">
              {(p.items || []).map((it) => (
                <li key={it.id}>
                  <span className="di-qty">{it.cantidad}×</span>
                  <span className="di-name">{it.nombre}</span>
                  <span className="di-amount">{money((+it.precio || 0) * (+it.cantidad || 0))}</span>
                </li>
              ))}
            </ul>
            <div className="ped-total-box">
              <div><span>Productos</span><strong>{money(pedidoSubtotal(p))}</strong></div>
              {+p.descuento > 0 && <div><span>Descuento</span><strong className="neg">−{money(p.descuento)}</strong></div>}
              {!isLocal && <div><span>Envío · {zonaLabel(p.zona)}</span><strong>{money(p.flete)}</strong></div>}
              <div className="ptb-total"><span>Total</span><strong>{money(total)}</strong></div>
            </div>
            <div className="field-hint" style={{ marginTop: 6 }}>
              Cobro: {paymentMethodLabel(p.metodoPago)}{p.metodoPago === 'efectivo' && !isLocal ? ' · contra entrega' : ''}
            </div>
          </div>

          {!isLocal && (
            <div className="proj-section">
              <div className="proj-section-title">Entrega</div>
              <div className="detail-meta">
                <div className="proj-meta"><span className="meta-label">Zona</span><span className="meta-value">{zonaLabel(p.zona)}</span></div>
                <div className="proj-meta"><span className="meta-label">Repartidor</span><span className="meta-value">{rep ? rep.nombre : 'Sin asignar'}</span></div>
              </div>
              <div className="direccion-box">
                <div className="db-text">{p.direccion || '—'}</div>
                {p.referencia && <div className="db-ref">{p.referencia}</div>}
                <div className="db-actions">
                  <a className="btn-ghost btn-sm" href={mapsLink(p.direccion, p.referencia)} target="_blank" rel="noreferrer">Ver en el mapa</a>
                  <button className="btn-ghost btn-sm" onClick={() => copy(`${p.direccion}${p.referencia ? ' · ' + p.referencia : ''}`, 'Dirección copiada.')}>Copiar dirección</button>
                </div>
              </div>

              <div className="field" style={{ marginTop: 12 }}>
                <label>Asignar repartidor</label>
                <select value={p.repartidorId || ''} onChange={(e) => onAssign(p.id, e.target.value)}>
                  <option value="">— Sin asignar —</option>
                  {repartidores.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </div>
            </div>
          )}

          {p.nota && <div className="callout">{p.nota}</div>}

          {hasTel(p.clienteTelefono) && (
            <a className="btn-primary btn-wa btn-block" href={waHref(p.clienteTelefono, buildPedidoWhatsapp(p))} target="_blank" rel="noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.01c-.24.68-1.42 1.31-1.96 1.36-.5.05-.96.23-3.23-.67-2.73-1.08-4.45-3.86-4.58-4.04-.13-.18-1.1-1.46-1.1-2.79s.7-1.98.94-2.25c.24-.27.53-.34.71-.34.18 0 .35 0 .51.01.16.01.39-.06.6.46.24.56.78 1.91.85 2.05.07.14.12.3.02.48-.09.18-.14.29-.28.45-.14.16-.29.36-.42.48-.14.14-.28.28-.12.55.16.27.71 1.17 1.53 1.9 1.05.93 1.94 1.22 2.21 1.36.27.14.43.12.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.6-.14.24.09 1.55.73 1.81.86.27.13.45.2.51.31.07.11.07.63-.17 1.31z"/></svg>
              Enviar confirmación al cliente
            </a>
          )}
        </div>

        <footer className="drawer-foot drawer-foot-split">
          <button className="btn-ghost danger-ghost" onClick={() => onDelete(p)}>Eliminar</button>
          <button className="btn-primary" onClick={() => onEdit(p)}>Editar pedido</button>
        </footer>
      </aside>
    </>
  );
}

// ============================================================
// Drawer: repartidor
// ============================================================
function RepartidorDrawer({ open, onClose, onSave, editing }) {
  const [f, setF] = usePState({});
  const [touched, setTouched] = usePState(false);

  usePEffect(() => {
    if (!open) return;
    setF(editing ? { ...editing } : { nombre: '', telefono: '', vehiculo: 'Moto', zona: '', nota: '' });
    setTouched(false);
  }, [open, editing]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const valid = (f.nombre || '').trim();

  function handleSave() {
    setTouched(true);
    if (!valid) return;
    onSave({
      id: editing ? editing.id : newId('rep'),
      nombre: (f.nombre || '').trim(),
      telefono: (f.telefono || '').trim(),
      vehiculo: f.vehiculo || 'Moto',
      zona: (f.zona || '').trim(),
      nota: (f.nota || '').trim(),
    }, !!editing);
    onClose();
  }

  return (
    <>
      <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
      <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="drawer-eyebrow">{editing ? 'Editar repartidor' : 'Nuevo repartidor'}</div>
            <div className="drawer-title">{editing ? f.nombre : 'Agregar repartidor'}</div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="drawer-body">
          <div className="field">
            <label>Nombre</label>
            <input value={f.nombre || ''} onChange={(e) => set('nombre', e.target.value)} placeholder="ej. Kevin Mendoza" />
            {touched && !valid && <div className="field-error">Indica el nombre.</div>}
          </div>
          <div className="field">
            <label>WhatsApp</label>
            <input value={f.telefono || ''} onChange={(e) => set('telefono', e.target.value)} placeholder="5939XXXXXXXX" inputMode="tel" />
            <div className="field-hint">Con 593 al inicio para enviarle la hoja de ruta.</div>
          </div>
          <div className="field">
            <label>Vehículo</label>
            <div className="chip-row">
              {['Moto', 'Carro', 'Bicicleta', 'A pie'].map((v) => (
                <button key={v} className={classNames('chip', f.vehiculo === v && 'is-active')} onClick={() => set('vehiculo', v)}>{v}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Zonas que cubre <span className="muted small">opcional</span></label>
            <input value={f.zona || ''} onChange={(e) => set('zona', e.target.value)} placeholder="ej. Norte y Vía a Daule" />
          </div>
          <div className="field">
            <label>Nota <span className="muted small">opcional</span></label>
            <textarea rows="2" value={f.nota || ''} onChange={(e) => set('nota', e.target.value)} placeholder="Horario, acuerdo de pago…" />
          </div>
        </div>
        <footer className="drawer-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave}>{editing ? 'Guardar cambios' : 'Agregar repartidor'}</button>
        </footer>
      </aside>
    </>
  );
}

// ============================================================
// Drawer: liquidar repartidor
// ============================================================
function LiquidarDrawer({ open, onClose, repartidor, cuadre, onLiquidar, onToast }) {
  const [gastoFlete, setGastoFlete] = usePState(true);
  if (!repartidor || !cuadre) {
    return (
      <>
        <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
        <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open} />
      </>
    );
  }
  const lista = cuadre.porLiquidar;

  return (
    <>
      <div className={classNames('drawer-scrim', open && 'is-open')} onClick={onClose} />
      <aside className={classNames('drawer', open && 'is-open')} aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="drawer-eyebrow">Cuadre de caja</div>
            <div className="drawer-title">{repartidor.nombre}</div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="drawer-body">
          <div className="cuadre-summary">
            <div><span className="ts-label">Efectivo cobrado</span><span className="ts-value">{money(cuadre.efectivo)}</span></div>
            <div><span className="ts-label">Fletes a pagarle</span><span className="ts-value neg">−{money(cuadre.fletes)}</span></div>
            <div className="cs-total"><span className="ts-label">Debe entregarte</span><span className="ts-value pos">{money(cuadre.aRecibir)}</span></div>
          </div>

          {cuadre.otros > 0 && (
            <div className="callout">
              <strong>{money(cuadre.otros)}</strong> de estos pedidos se cobraron por transferencia o PayPhone: ese dinero no lo trae el repartidor.
            </div>
          )}

          <div className="proj-section">
            <div className="proj-section-title">Pedidos por liquidar ({lista.length})</div>
            {lista.length === 0 ? (
              <div className="mini-empty">No hay pedidos pendientes de cuadre.</div>
            ) : (
              <ul className="pay-list">
                {lista.map((p) => (
                  <li key={p.id} className="pay-row">
                    <span className="pay-date">{pedidoRef(p)}</span>
                    <span className="pay-method">{p.clienteNombre} · {paymentMethodLabel(p.metodoPago)}</span>
                    <span className="pay-amount">{money(pedidoTotal(p))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {cuadre.fletes > 0 && (
            <label className="check-row">
              <input type="checkbox" checked={gastoFlete} onChange={(e) => setGastoFlete(e.target.checked)} />
              <span>Registrar {money(cuadre.fletes)} de fletes como gasto de transporte</span>
            </label>
          )}
        </div>
        <footer className="drawer-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={lista.length === 0}
            onClick={() => { onLiquidar(repartidor, lista, gastoFlete && cuadre.fletes > 0 ? cuadre.fletes : 0); onClose(); }}>
            Cerrar cuadre
          </button>
        </footer>
      </aside>
    </>
  );
}

// ============================================================
// Vista principal
// ============================================================
function PedidosView(props) {
  const {
    pedidos, repartidores, products, clients,
    onSavePedido, onDeletePedido, onChangeEstado, onAssign,
    onSaveRepartidor, onDeleteRepartidor, onLiquidar,
    onToast, onConfirm,
  } = props;

  const [tab, setTab] = usePState('delivery');
  const [rango, setRango] = usePState('hoy');
  const [estadoF, setEstadoF] = usePState('abiertos');
  const [repF, setRepF] = usePState('todos');
  const [search, setSearch] = usePState('');
  const [vista, setVista] = usePState('lista');
  const [fechaLocal, setFechaLocal] = usePState(todayISO());

  const [drawer, setDrawer] = usePState({ open: false, editing: null, canal: 'delivery' });
  const [detail, setDetail] = usePState({ open: false, id: null });
  const [repDrawer, setRepDrawer] = usePState({ open: false, editing: null });
  const [liqDrawer, setLiqDrawer] = usePState({ open: false, rep: null });

  const deliveries = usePMemo(() => pedidos.filter((p) => p.canal !== 'local'), [pedidos]);
  const locales = usePMemo(() => pedidos.filter((p) => p.canal === 'local'), [pedidos]);

  // ---- Rango de fechas para delivery ----
  function inRango(p) {
    const f = p.fechaEntrega || p.fecha;
    const hoy = todayISO();
    if (rango === 'hoy') return f === hoy;
    if (rango === 'manana') {
      const m = new Date(TODAY); m.setDate(m.getDate() + 1);
      return f === m.toISOString().slice(0, 10);
    }
    if (rango === 'semana') {
      const s = startOfPeriod(TODAY, 'semana'), e = endOfPeriod(TODAY, 'semana');
      return inRange(f, s, e);
    }
    return true;
  }

  const listaDelivery = usePMemo(() => {
    const q = search.trim().toLowerCase();
    return deliveries
      .filter(inRango)
      .filter((p) => estadoF === 'todos' ? true : estadoF === 'abiertos' ? pedidoAbierto(p) : p.estado === estadoF)
      .filter((p) => repF === 'todos' ? true : repF === 'sin' ? !p.repartidorId : p.repartidorId === repF)
      .filter((p) => !q
        || (p.clienteNombre || '').toLowerCase().includes(q)
        || (p.direccion || '').toLowerCase().includes(q)
        || (p.clienteTelefono || '').includes(q)
        || pedidoRef(p).includes(q)
        || (p.items || []).some((it) => (it.nombre || '').toLowerCase().includes(q)))
      .sort((a, b) => {
        const fa = a.fechaEntrega || a.fecha, fb = b.fechaEntrega || b.fecha;
        if (fa !== fb) return fa < fb ? -1 : 1;
        return (b.numero || 0) - (a.numero || 0);
      });
  }, [deliveries, rango, estadoF, repF, search]);

  // ---- Métricas delivery ----
  const met = usePMemo(() => {
    const enRango = deliveries.filter(inRango);
    const entregados = enRango.filter((p) => p.estado === 'entregado');
    const cerrados = enRango.filter((p) => ['entregado', 'devuelto'].includes(p.estado));
    let efectivoCalle = 0;
    for (const p of deliveries) {
      if (p.estado === 'entregado' && !p.liquidado && p.metodoPago === 'efectivo') efectivoCalle += pedidoTotal(p);
    }
    return {
      abiertos: enRango.filter(pedidoAbierto).length,
      enRuta: enRango.filter((p) => p.estado === 'ruta').length,
      entregados: entregados.length,
      vendido: entregados.reduce((s, p) => s + pedidoTotal(p), 0),
      efectivoCalle,
      tasa: cerrados.length ? Math.round((entregados.length / cerrados.length) * 100) : null,
      devueltos: enRango.filter((p) => ['devuelto', 'reagendado'].includes(p.estado)).length,
      sinAsignar: enRango.filter((p) => !p.repartidorId && pedidoAbierto(p)).length,
    };
  }, [deliveries, rango]);

  // ---- Agrupado por repartidor (vista ruta) ----
  const grupos = usePMemo(() => {
    const map = new Map();
    for (const p of listaDelivery) {
      const k = p.repartidorId || '__sin__';
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(p);
    }
    return [...map.entries()].sort((a, b) => (a[0] === '__sin__' ? -1 : b[0] === '__sin__' ? 1 : 0));
  }, [listaDelivery]);

  const caja = usePMemo(() => cierreCaja(pedidos, fechaLocal), [pedidos, fechaLocal]);

  const cuadres = usePMemo(() => repartidores.map((r) => ({ rep: r, c: cuadreRepartidor(deliveries, r.id) })), [repartidores, deliveries]);
  const totalCalle = cuadres.reduce((s, x) => s + x.c.aRecibir, 0);

  const detalle = detail.id ? pedidos.find((p) => p.id === detail.id) : null;

  function askDelete(p) {
    onConfirm({
      title: 'Eliminar pedido',
      body: <>¿Eliminar el pedido <strong>{pedidoRef(p)}</strong> de {p.clienteNombre || 'sin nombre'} por {money(pedidoTotal(p))}?</>,
      confirmLabel: 'Eliminar',
      onConfirm: () => { onDeletePedido(p.id); setDetail({ open: false, id: null }); },
    });
  }
  function askDeleteRep(r) {
    onConfirm({
      title: 'Eliminar repartidor',
      body: <>¿Eliminar a <strong>{r.nombre}</strong>? Los pedidos que tenía quedarán sin asignar.</>,
      confirmLabel: 'Eliminar',
      onConfirm: () => onDeleteRepartidor(r.id),
    });
  }

  function enviarRuta(rep, lista) {
    if (!hasTel(rep.telefono)) { onToast('Agrega el WhatsApp del repartidor para enviarle la ruta.'); return; }
    const msg = buildRutaWhatsapp(rep, lista, lista[0] ? (lista[0].fechaEntrega || lista[0].fecha) : todayISO());
    window.open(waHref(rep.telefono, msg), '_blank');
  }

  const rangos = [['hoy', 'Hoy'], ['manana', 'Mañana'], ['semana', 'Esta semana'], ['todos', 'Todos']];
  const estados = [['abiertos', 'Pendientes'], ['ruta', 'En ruta'], ['entregado', 'Entregados'], ['reagendado', 'Reagendados'], ['devuelto', 'Devueltos'], ['todos', 'Todos']];

  return (
    <>
      <section className="action-bar">
        <div className="action-bar-left">
          <div className="page-eyebrow">Operación diaria</div>
          <h1 className="page-title">pedidos</h1>
        </div>
        <div className="action-bar-right">
          <div className="segmented">
            {[['delivery', 'Delivery'], ['local', 'Local'], ['cuadre', 'Cuadre']].map(([id, label]) => (
              <button key={id} className={classNames('segmented-btn', tab === id && 'is-active')} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          {tab !== 'cuadre' && (
            <button className="btn-primary" onClick={() => setDrawer({ open: true, editing: null, canal: tab === 'local' ? 'local' : 'delivery' })}>
              <span aria-hidden="true">+</span> {tab === 'local' ? 'Nueva venta' : 'Nuevo pedido'}
            </button>
          )}
          {tab === 'cuadre' && (
            <button className="btn-primary" onClick={() => setRepDrawer({ open: true, editing: null })}>
              <span aria-hidden="true">+</span> Repartidor
            </button>
          )}
        </div>
      </section>

      {/* ============================ DELIVERY ============================ */}
      {tab === 'delivery' && (
        <>
          <div className="ped-metrics">
            <div className="pmet">
              <span className="kpi-label">Pendientes</span>
              <span className="kpi-value">{met.abiertos}</span>
              <span className="pmet-note">{met.sinAsignar > 0 ? `${met.sinAsignar} sin repartidor` : 'todos asignados'}</span>
            </div>
            <div className="pmet">
              <span className="kpi-label">En ruta</span>
              <span className="kpi-value">{met.enRuta}</span>
              <span className="pmet-note">saliendo ahora</span>
            </div>
            <div className="pmet">
              <span className="kpi-label">Entregados</span>
              <span className="kpi-value pos">{met.entregados}</span>
              <span className="pmet-note">{money(met.vendido)} vendidos</span>
            </div>
            <div className="pmet">
              <span className="kpi-label">Efectivo en la calle</span>
              <span className={classNames('kpi-value', met.efectivoCalle > 0 && 'warn')}>{money(met.efectivoCalle)}</span>
              <span className="pmet-note">sin cuadrar</span>
            </div>
            <div className="pmet">
              <span className="kpi-label">Entregas logradas</span>
              <span className="kpi-value">{met.tasa == null ? '—' : met.tasa + '%'}</span>
              <span className="pmet-note">{met.devueltos} devueltos o reagendados</span>
            </div>
          </div>

          {deliveries.length === 0 ? (
            <EmptyState
              title="Todavía no registras pedidos"
              body="Registra los pedidos que salen con los deliver: dirección, zona, qué se cobra y quién lo lleva. Después cuadras el efectivo de cada repartidor en un clic."
              action={<button className="btn-primary" onClick={() => setDrawer({ open: true, editing: null, canal: 'delivery' })}><span>+</span> Crear el primer pedido</button>}
            />
          ) : (
            <div className="card">
              <div className="filters-bar">
                <div className="filters-left">
                  <div className="search-field">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.1"/><path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cliente, dirección, producto o #…" />
                  </div>
                  <div className="mini-tabs">
                    {rangos.map(([id, l]) => (
                      <button key={id} className={classNames('mini-tab', rango === id && 'is-active')} onClick={() => setRango(id)}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="filters-right">
                  <select className="mini-select" value={repF} onChange={(e) => setRepF(e.target.value)}>
                    <option value="todos">Todos los repartidores</option>
                    <option value="sin">Sin asignar</option>
                    {repartidores.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                  <div className="mini-tabs">
                    <button className={classNames('mini-tab', vista === 'lista' && 'is-active')} onClick={() => setVista('lista')}>Lista</button>
                    <button className={classNames('mini-tab', vista === 'ruta' && 'is-active')} onClick={() => setVista('ruta')}>Por ruta</button>
                  </div>
                </div>
              </div>

              <div className="chip-row estado-filters">
                {estados.map(([id, l]) => (
                  <button key={id} className={classNames('chip', estadoF === id && 'is-active')} onClick={() => setEstadoF(id)}>{l}</button>
                ))}
              </div>

              {listaDelivery.length === 0 ? (
                <div className="empty-row" style={{ padding: '40px 0' }}>Ningún pedido con estos filtros.</div>
              ) : vista === 'lista' ? (
                <div className="table-wrap">
                  <table className="movs pedidos-table">
                    <thead>
                      <tr>
                        <th className="sem-col"></th>
                        <th>Pedido</th>
                        <th>Entrega</th>
                        <th>Productos</th>
                        <th className="num">Total</th>
                        <th>Pago</th>
                        <th>Repartidor</th>
                        <th>Estado</th>
                        <th className="actions-col"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaDelivery.map((p) => (
                        <tr key={p.id} className="ped-row" onClick={() => setDetail({ open: true, id: p.id })}>
                          <td className="sem-col"><EstadoDot estado={p.estado} /></td>
                          <td className="concept">
                            <div className="ped-cliente">
                              <span>{p.clienteNombre || 'Sin nombre'}</span>
                              <span className="muted small">{pedidoRef(p)}{p.clienteTelefono ? ` · ${p.clienteTelefono}` : ''}</span>
                            </div>
                          </td>
                          <td className="muted small">
                            <div className="ped-dir">
                              <strong>{zonaLabel(p.zona)}</strong>
                              <span>{p.direccion}</span>
                            </div>
                          </td>
                          <td className="muted small">{pedidoItemsResumen(p)}</td>
                          <td className="num amount">{money(pedidoTotal(p))}</td>
                          <td className="muted small">{paymentMethodLabel(p.metodoPago)}</td>
                          <td className="muted small">{p.repartidorId ? repartidorNombre(repartidores, p.repartidorId) : <span className="tag-warn">Sin asignar</span>}</td>
                          <td><EstadoPill estado={p.estado} size="sm" /></td>
                          <td className="actions-col" onClick={(e) => e.stopPropagation()}>
                            <div className="row-actions">
                              {hasTel(p.clienteTelefono) && (
                                <a className="row-btn" href={waHref(p.clienteTelefono, buildPedidoWhatsapp(p))} target="_blank" rel="noreferrer" title="WhatsApp al cliente">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.01c-.24.68-1.42 1.31-1.96 1.36-.5.05-.96.23-3.23-.67-2.73-1.08-4.45-3.86-4.58-4.04-.13-.18-1.1-1.46-1.1-2.79s.7-1.98.94-2.25c.24-.27.53-.34.71-.34.18 0 .35 0 .51.01.16.01.39-.06.6.46.24.56.78 1.91.85 2.05.07.14.12.3.02.48-.09.18-.14.29-.28.45-.14.16-.29.36-.42.48-.14.14-.28.28-.12.55.16.27.71 1.17 1.53 1.9 1.05.93 1.94 1.22 2.21 1.36.27.14.43.12.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.6-.14.24.09 1.55.73 1.81.86.27.13.45.2.51.31.07.11.07.63-.17 1.31z"/></svg>
                                </a>
                              )}
                              <button className="row-btn" onClick={() => setDrawer({ open: true, editing: p, canal: 'delivery' })} title="Editar">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4.5 11.5 2 12l.5-2.5L9.5 2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                              </button>
                              <button className="row-btn danger" onClick={() => askDelete(p)} title="Eliminar">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4h9M5 4V2.5h4V4M4 4l.5 7.5h5L10 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rutas">
                  {grupos.map(([key, lista]) => {
                    const rep = repartidores.find((r) => r.id === key);
                    const cobrar = lista.filter((p) => p.metodoPago === 'efectivo').reduce((s, p) => s + pedidoTotal(p), 0);
                    return (
                      <div key={key} className="ruta-group">
                        <div className="ruta-head">
                          <div className="ruta-title">
                            <span className="ruta-name">{rep ? rep.nombre : 'Sin asignar'}</span>
                            <span className="ruta-meta">{lista.length} {lista.length === 1 ? 'parada' : 'paradas'} · cobrar {money(cobrar)}</span>
                          </div>
                          {rep && (
                            <button className="btn-ghost btn-sm" onClick={() => enviarRuta(rep, lista)}>Enviar ruta por WhatsApp</button>
                          )}
                        </div>
                        <ol className="ruta-list">
                          {lista.map((p, i) => (
                            <li key={p.id} className="ruta-item" onClick={() => setDetail({ open: true, id: p.id })}>
                              <span className="ri-num">{i + 1}</span>
                              <div className="ri-main">
                                <div className="ri-top">
                                  <span className="ri-cliente">{p.clienteNombre || 'Sin nombre'}</span>
                                  <EstadoPill estado={p.estado} size="sm" />
                                </div>
                                <div className="ri-dir">{zonaLabel(p.zona)} · {p.direccion}</div>
                                <div className="ri-items">{pedidoItemsResumen(p)}</div>
                              </div>
                              <div className="ri-right">
                                <span className="ri-total">{money(pedidoTotal(p))}</span>
                                <span className="ri-pago">{p.metodoPago === 'efectivo' ? 'cobrar' : 'pagado'}</span>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="table-foot">
                <span>{listaDelivery.length} pedidos · {money(listaDelivery.reduce((s, p) => s + pedidoTotal(p), 0))}</span>
                <button className="link-btn" onClick={() => { exportPedidos({ format: 'xls', pedidos: listaDelivery, repartidores }); onToast('Pedidos exportados a Excel.'); }}>
                  Exportar a Excel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================ LOCAL ============================ */}
      {tab === 'local' && (
        <>
          <div className="ped-metrics local-metrics">
            <div className="pmet">
              <span className="kpi-label">Vendido</span>
              <span className="kpi-value pos">{money(caja.total)}</span>
              <span className="pmet-note">{formatDateFull(caja.fecha)}</span>
            </div>
            <div className="pmet">
              <span className="kpi-label">Tickets</span>
              <span className="kpi-value">{caja.tickets}</span>
              <span className="pmet-note">{caja.unidades} unidades</span>
            </div>
            <div className="pmet">
              <span className="kpi-label">Ticket promedio</span>
              <span className="kpi-value">{money(caja.promedio)}</span>
              <span className="pmet-note">por venta</span>
            </div>
            <div className="pmet">
              <span className="kpi-label">Efectivo en caja</span>
              <span className="kpi-value">{money(caja.efectivo)}</span>
              <span className="pmet-note">{money(caja.total - caja.efectivo)} en otros medios</span>
            </div>
          </div>

          <div className="card">
            <div className="filters-bar">
              <div className="filters-left">
                <div className="date-range">
                  <span className="muted small">Día</span>
                  <input type="date" value={fechaLocal} onChange={(e) => setFechaLocal(e.target.value)} />
                  <button className="link-btn" onClick={() => setFechaLocal(todayISO())}>Hoy</button>
                </div>
              </div>
              <div className="filters-right">
                <button className="btn-ghost btn-sm" disabled={caja.tickets === 0}
                  onClick={() => { navigator.clipboard?.writeText(buildCierreCajaTexto(caja)); onToast('Cierre de caja copiado.'); }}>
                  Copiar cierre de caja
                </button>
                <button className="btn-ghost btn-sm" disabled={caja.tickets === 0}
                  onClick={() => { exportPedidos({ format: 'xls', pedidos: caja.lista, repartidores, filenameBase: `life-manager_local_${caja.fecha}` }); onToast('Ventas del día exportadas.'); }}>
                  Exportar
                </button>
              </div>
            </div>

            {caja.tickets === 0 ? (
              <EmptyState
                title={locales.length === 0 ? 'Sin ventas en el local todavía' : 'Sin ventas ese día'}
                body="Cada venta del mostrador queda registrada con sus productos y forma de pago, y suma al cierre de caja del día."
                action={<button className="btn-primary" onClick={() => setDrawer({ open: true, editing: null, canal: 'local' })}><span>+</span> Registrar venta</button>}
              />
            ) : (
              <div className="table-wrap">
                <table className="movs">
                  <thead>
                    <tr>
                      <th>Ticket</th>
                      <th>Cliente</th>
                      <th>Productos</th>
                      <th className="num">Unid.</th>
                      <th>Pago</th>
                      <th className="num">Total</th>
                      <th className="actions-col"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {caja.lista.map((p) => (
                      <tr key={p.id} className="ped-row" onClick={() => setDetail({ open: true, id: p.id })}>
                        <td className="concept">{pedidoRef(p)}</td>
                        <td className="muted">{p.clienteNombre || 'Mostrador'}</td>
                        <td className="muted small">{pedidoItemsResumen(p)}</td>
                        <td className="num muted">{pedidoUnidades(p)}</td>
                        <td className="muted small">{paymentMethodLabel(p.metodoPago)}</td>
                        <td className="num amount pos">{money(pedidoTotal(p))}</td>
                        <td className="actions-col" onClick={(e) => e.stopPropagation()}>
                          <div className="row-actions">
                            <button className="row-btn" onClick={() => setDrawer({ open: true, editing: p, canal: 'local' })} title="Editar">
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4.5 11.5 2 12l.5-2.5L9.5 2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                            </button>
                            <button className="row-btn danger" onClick={() => askDelete(p)} title="Eliminar">
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4h9M5 4V2.5h4V4M4 4l.5 7.5h5L10 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="5">Total del día</td>
                      <td className="num amount pos">{money(caja.total)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============================ CUADRE ============================ */}
      {tab === 'cuadre' && (
        <>
          <div className="ped-metrics local-metrics">
            <div className="pmet">
              <span className="kpi-label">Por recibir de repartidores</span>
              <span className={classNames('kpi-value', totalCalle > 0 && 'warn')}>{money(totalCalle)}</span>
              <span className="pmet-note">efectivo menos fletes</span>
            </div>
            <div className="pmet">
              <span className="kpi-label">Repartidores</span>
              <span className="kpi-value">{repartidores.length}</span>
              <span className="pmet-note">activos</span>
            </div>
            <div className="pmet">
              <span className="kpi-label">En ruta ahora</span>
              <span className="kpi-value">{deliveries.filter((p) => p.estado === 'ruta').length}</span>
              <span className="pmet-note">pedidos fuera</span>
            </div>
            <div className="pmet">
              <span className="kpi-label">Devueltos</span>
              <span className="kpi-value">{deliveries.filter((p) => p.estado === 'devuelto').length}</span>
              <span className="pmet-note">histórico</span>
            </div>
          </div>

          {repartidores.length === 0 ? (
            <EmptyState
              title="Agrega a tus repartidores"
              body="Con cada repartidor registrado puedes asignarle pedidos, mandarle la hoja de ruta por WhatsApp y cuadrar al final del día cuánto efectivo trae y cuánto le toca de fletes."
              action={<button className="btn-primary" onClick={() => setRepDrawer({ open: true, editing: null })}><span>+</span> Agregar repartidor</button>}
            />
          ) : (
            <div className="cuadre-grid">
              {cuadres.map(({ rep, c }) => (
                <div key={rep.id} className="cuadre-card">
                  <div className="cc-head">
                    <div>
                      <div className="cc-name">{rep.nombre}</div>
                      <div className="cc-sub">{rep.vehiculo}{rep.zona ? ` · ${rep.zona}` : ''}{rep.telefono ? ` · ${rep.telefono}` : ''}</div>
                    </div>
                    <div className="row-actions is-static">
                      <button className="row-btn" onClick={() => setRepDrawer({ open: true, editing: rep })} title="Editar">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4.5 11.5 2 12l.5-2.5L9.5 2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                      </button>
                      <button className="row-btn danger" onClick={() => askDeleteRep(rep)} title="Eliminar">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4h9M5 4V2.5h4V4M4 4l.5 7.5h5L10 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  </div>

                  <div className="cc-stats">
                    <div><span className="ts-label">En ruta</span><span className="ts-value">{c.enRuta}</span></div>
                    <div><span className="ts-label">Por liquidar</span><span className="ts-value">{c.porLiquidar.length}</span></div>
                    <div><span className="ts-label">Efectivo</span><span className="ts-value">{money(c.efectivo)}</span></div>
                    <div><span className="ts-label">Fletes</span><span className="ts-value neg">{money(c.fletes)}</span></div>
                  </div>

                  <div className="cc-foot">
                    <div className="cc-arecibir">
                      <span className="ts-label">Debe entregarte</span>
                      <span className={classNames('cc-amount', c.aRecibir > 0 ? 'pos' : 'muted')}>{money(c.aRecibir)}</span>
                    </div>
                    <button className="btn-primary btn-sm" disabled={c.porLiquidar.length === 0}
                      onClick={() => setLiqDrawer({ open: true, rep })}>
                      Cuadrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <PedidoDrawer
        open={drawer.open} editing={drawer.editing} canal={drawer.canal}
        products={products} repartidores={repartidores} pedidos={pedidos} clients={clients}
        onClose={() => setDrawer({ open: false, editing: null, canal: drawer.canal })}
        onSave={onSavePedido}
      />
      <PedidoDetailDrawer
        open={detail.open} pedido={detalle} repartidores={repartidores}
        onClose={() => setDetail({ open: false, id: null })}
        onEdit={(p) => { setDetail({ open: false, id: null }); setDrawer({ open: true, editing: p, canal: p.canal || 'delivery' }); }}
        onDelete={askDelete}
        onChangeEstado={onChangeEstado}
        onAssign={onAssign}
        onToast={onToast}
      />
      <RepartidorDrawer
        open={repDrawer.open} editing={repDrawer.editing}
        onClose={() => setRepDrawer({ open: false, editing: null })}
        onSave={onSaveRepartidor}
      />
      <LiquidarDrawer
        open={liqDrawer.open}
        repartidor={liqDrawer.rep}
        cuadre={liqDrawer.rep ? cuadreRepartidor(deliveries, liqDrawer.rep.id) : null}
        onClose={() => setLiqDrawer({ open: false, rep: null })}
        onLiquidar={onLiquidar}
        onToast={onToast}
      />
    </>
  );
}

Object.assign(window, { PedidosView });
