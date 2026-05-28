// ============================================================
// Life Manager — main app
// ============================================================
const { useState, useMemo, useEffect, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "claro",
  "density": "comoda"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Persisted state ------------------------------------------
  const [state, setState] = useState(() => loadState());
  const { transactions, products, clients, suppliers } = state;

  useEffect(() => { saveState(state); }, [state]);

  useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.density = tweaks.density;
  }, [tweaks]);

  // View routing ---------------------------------------------
  const [view, setView] = useState('resumen');

  // Period state (shared between Resumen and Reportes) -------
  const [period, setPeriod] = useState('mes');
  const [anchor, setAnchor] = useState(new Date(TODAY));
  useEffect(() => { setAnchor((a) => startOfPeriod(a, period)); }, [period]);

  // Drawer state ---------------------------------------------
  const [txDrawer, setTxDrawer] = useState({ open: false, editing: null });
  const [prodDrawer, setProdDrawer] = useState({ open: false, editing: null });
  const [cliDrawer, setCliDrawer] = useState({ open: false, editing: null });
  const [supDrawer, setSupDrawer] = useState({ open: false, editing: null });
  const [exportOpen, setExportOpen] = useState(false);

  // Confirm dialog -------------------------------------------
  const [confirm, setConfirm] = useState(null);

  // Toast ----------------------------------------------------
  const [toast, setToast] = useState('');
  const flash = useCallback((msg) => {
    setToast(msg);
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => setToast(''), 2600);
  }, []);

  // ---- Mutations ------------------------------------------
  const saveTransaction = useCallback((tx, isEdit) => {
    setState((s) => {
      let nextTxs;
      let nextProducts = s.products;

      if (isEdit) {
        const prev = s.transactions.find((t) => t.id === tx.id);
        nextTxs = s.transactions.map((t) => (t.id === tx.id ? tx : t));
        // Reverse previous stock effect, then apply new
        if (prev && prev.tipo === 'venta' && prev.productoId) {
          nextProducts = nextProducts.map((p) => p.id === prev.productoId ? { ...p, stock: p.stock + (prev.cantidad || 1) } : p);
        }
        if (tx.tipo === 'venta' && tx.productoId) {
          nextProducts = nextProducts.map((p) => p.id === tx.productoId ? { ...p, stock: Math.max(0, p.stock - (tx.cantidad || 1)) } : p);
        }
      } else {
        nextTxs = [tx, ...s.transactions];
        if (tx.tipo === 'venta' && tx.productoId) {
          nextProducts = nextProducts.map((p) => p.id === tx.productoId ? { ...p, stock: Math.max(0, p.stock - (tx.cantidad || 1)) } : p);
        }
      }
      // Re-sort newest first
      nextTxs.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
      return { ...s, transactions: nextTxs, products: nextProducts };
    });
    flash(isEdit ? 'Transacción actualizada.' : `${tx.tipo === 'gasto' ? 'Gasto' : tx.tipo === 'ingreso' ? 'Ingreso' : 'Venta'} de ${money(tx.monto)} registrado.`);
  }, [flash]);

  const deleteTransaction = useCallback((tx) => {
    setState((s) => {
      const nextTxs = s.transactions.filter((t) => t.id !== tx.id);
      let nextProducts = s.products;
      if (tx.tipo === 'venta' && tx.productoId) {
        nextProducts = nextProducts.map((p) => p.id === tx.productoId ? { ...p, stock: p.stock + (tx.cantidad || 1) } : p);
      }
      return { ...s, transactions: nextTxs, products: nextProducts };
    });
    flash('Transacción eliminada.');
  }, [flash]);

  const saveProduct = useCallback((p, isEdit) => {
    setState((s) => {
      const next = isEdit
        ? s.products.map((x) => (x.id === p.id ? p : x))
        : [...s.products, p];
      return { ...s, products: next };
    });
    flash(isEdit ? 'Producto actualizado.' : 'Producto creado.');
  }, [flash]);

  const deleteProduct = useCallback((p) => {
    setState((s) => ({ ...s, products: s.products.filter((x) => x.id !== p.id) }));
    flash('Producto eliminado.');
  }, [flash]);

  const saveClient = useCallback((c, isEdit) => {
    setState((s) => ({
      ...s,
      clients: isEdit ? s.clients.map((x) => (x.id === c.id ? c : x)) : [...s.clients, c],
    }));
    flash(isEdit ? 'Cliente actualizado.' : 'Cliente creado.');
  }, [flash]);

  const deleteClient = useCallback((c) => {
    setState((s) => ({ ...s, clients: s.clients.filter((x) => x.id !== c.id) }));
    flash('Cliente eliminado.');
  }, [flash]);

  const saveSupplier = useCallback((sp, isEdit) => {
    setState((s) => ({
      ...s,
      suppliers: isEdit ? s.suppliers.map((x) => (x.id === sp.id ? sp : x)) : [...s.suppliers, sp],
    }));
    flash(isEdit ? 'Proveedor actualizado.' : 'Proveedor creado.');
  }, [flash]);

  const deleteSupplier = useCallback((sp) => {
    setState((s) => ({ ...s, suppliers: s.suppliers.filter((x) => x.id !== sp.id) }));
    flash('Proveedor eliminado.');
  }, [flash]);

  // ---- Export ---------------------------------------------
  const openExport = useCallback(() => setExportOpen(true), []);

  // ---- Reset all data -------------------------------------
  function handleReset() {
    setConfirm({
      title: 'Borrar todos los datos',
      body: 'Se eliminarán todos los movimientos, productos, clientes y proveedores guardados en este navegador. Esta acción no se puede deshacer.',
      confirmLabel: 'Borrar todo',
      onConfirm: () => {
        setState(emptyState());
        setConfirm(null);
        flash('Todos los datos fueron borrados.');
      },
    });
  }

  // ---- Confirm helpers ------------------------------------
  function askDeleteTx(tx) {
    setConfirm({
      title: 'Eliminar transacción',
      body: <>¿Eliminar "<strong>{tx.concepto}</strong>" por {money(tx.monto)}?</>,
      confirmLabel: 'Eliminar',
      onConfirm: () => { deleteTransaction(tx); setConfirm(null); },
    });
  }
  function askDeleteProduct(p) {
    setConfirm({
      title: 'Eliminar producto',
      body: <>¿Eliminar "<strong>{p.nombre}</strong>" del catálogo? Las ventas pasadas se conservan.</>,
      confirmLabel: 'Eliminar',
      onConfirm: () => { deleteProduct(p); setConfirm(null); },
    });
  }
  function askDeleteClient(c) {
    setConfirm({
      title: 'Eliminar cliente',
      body: <>¿Eliminar "<strong>{c.nombre}</strong>"? Las ventas pasadas se conservan.</>,
      confirmLabel: 'Eliminar',
      onConfirm: () => { deleteClient(c); setConfirm(null); },
    });
  }
  function askDeleteSupplier(sp) {
    setConfirm({
      title: 'Eliminar proveedor',
      body: <>¿Eliminar "<strong>{sp.nombre}</strong>"?</>,
      confirmLabel: 'Eliminar',
      onConfirm: () => { deleteSupplier(sp); setConfirm(null); },
    });
  }

  // ---- Render ---------------------------------------------
  const totalCount = transactions.length;

  return (
    <div className="app">
      <Header
        view={view} setView={setView}
        dataCount={totalCount}
        onOpenAdd={() => setTxDrawer({ open: true, editing: null })}
        onOpenExport={openExport}
      />

      <main className="main">
        {view === 'resumen' && (
          <ResumenView
            transactions={transactions} products={products} clients={clients}
            period={period} setPeriod={setPeriod} anchor={anchor} setAnchor={setAnchor}
            onOpenAdd={() => setTxDrawer({ open: true, editing: null })}
            onEdit={(tx) => setTxDrawer({ open: true, editing: tx })}
            onDelete={askDeleteTx}
          />
        )}
        {view === 'movs' && (
          <MovimientosView
            transactions={transactions} products={products} clients={clients}
            onOpenAdd={() => setTxDrawer({ open: true, editing: null })}
            onEdit={(tx) => setTxDrawer({ open: true, editing: tx })}
            onDelete={askDeleteTx}
            onOpenExport={openExport}
          />
        )}
        {view === 'inv' && (
          <InventarioView
            products={products} transactions={transactions}
            onAdd={() => setProdDrawer({ open: true, editing: null })}
            onEdit={(p) => setProdDrawer({ open: true, editing: p })}
            onDelete={askDeleteProduct}
          />
        )}
        {view === 'contactos' && (
          <ContactosView
            clients={clients} suppliers={suppliers} transactions={transactions}
            onAddClient={() => setCliDrawer({ open: true, editing: null })}
            onEditClient={(c) => setCliDrawer({ open: true, editing: c })}
            onDeleteClient={askDeleteClient}
            onAddSupplier={() => setSupDrawer({ open: true, editing: null })}
            onEditSupplier={(s) => setSupDrawer({ open: true, editing: s })}
            onDeleteSupplier={askDeleteSupplier}
          />
        )}
        {view === 'reportes' && (
          <ReportesView
            transactions={transactions} products={products} clients={clients}
            period={period} setPeriod={setPeriod} anchor={anchor} setAnchor={setAnchor}
          />
        )}

        <footer className="page-foot">
          <div>Life Manager · datos guardados en este navegador</div>
          <div>
            <button className="link-btn danger-link" onClick={handleReset}>Borrar todos los datos</button>
          </div>
        </footer>
      </main>

      {/* Drawers */}
      <TransactionDrawer
        open={txDrawer.open} editing={txDrawer.editing}
        products={products} clients={clients}
        onClose={() => setTxDrawer({ open: false, editing: null })}
        onSave={saveTransaction}
      />
      <ProductDrawer
        open={prodDrawer.open} editing={prodDrawer.editing}
        onClose={() => setProdDrawer({ open: false, editing: null })}
        onSave={saveProduct}
      />
      <ClientDrawer
        open={cliDrawer.open} editing={cliDrawer.editing}
        onClose={() => setCliDrawer({ open: false, editing: null })}
        onSave={saveClient}
      />
      <SupplierDrawer
        open={supDrawer.open} editing={supDrawer.editing}
        onClose={() => setSupDrawer({ open: false, editing: null })}
        onSave={saveSupplier}
      />
      <ExportDrawer
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        transactions={transactions} products={products} clients={clients}
        onToast={flash}
      />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        body={confirm?.body}
        confirmLabel={confirm?.confirmLabel}
        onCancel={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
      />

      <Toast text={toast} />

      <TweaksPanel title="Tweaks">
        <TweakSection title="Apariencia">
          <TweakRadio
            label="Tema"
            value={tweaks.theme}
            onChange={(v) => setTweak('theme', v)}
            options={[{ value: 'claro', label: 'Claro' }, { value: 'oscuro', label: 'Oscuro' }]}
          />
          <TweakRadio
            label="Densidad"
            value={tweaks.density}
            onChange={(v) => setTweak('density', v)}
            options={[{ value: 'comoda', label: 'Cómoda' }, { value: 'compacta', label: 'Compacta' }]}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
