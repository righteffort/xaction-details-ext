const payeeCache = new Map<string, string>();
let lastStateSignature = "";

// Find React props (vibe coded with Gemini)
function connectToActual() {
  const anchor = document.querySelector('div[data-testid="row"], .recs-table-row')
              || document.querySelector('div[role="columnheader"], .recs-table-header-cell');

  if (!anchor) return null;

  const key = Object.keys(anchor).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternal'));
  // @ts-expect-error: TODO: gemini wrote this code.
  let fiber = anchor[key];
  let steps = 0;

  // Climb the tree to find the component holding the data & handlers
  while (fiber && steps < 50) {
    const p = fiber.memoizedProps;
    if (p) {
      // We need a component that has transactions AND standard handlers
      if (p.transactions && typeof p.onSave === 'function' &&
        Array.isArray(p.payees) && typeof p.onAdd === 'function') {
	  return p;
	}
    }
    fiber = fiber.return;
    steps++;
  }
  return null;
}

// eslint-disable-next-line
async function resolvePayee(name: string, props: any) {
  const key = name.toLowerCase().trim();

  // 1. Check Cache
  if (payeeCache.has(key)) return payeeCache.get(key);
  if (!props.payees) {
    console.error('payees missing from props');
    return null;
  }
  // TODO: might as well build payee cache at this point
  // 2. Check Props (Existing Payees)
  // eslint-disable-next-line
  const existing = props.payees.find((p: any) => p.name.toLowerCase() === key);
  if (existing) {
    payeeCache.set(key, existing.id);
    console.log(`payee: '${name}' -- using existing payee id ${existing.id}`);
    return existing.id;
  }

  // 3. Create New
  console.log(`Bridge: Creating new payee '${name}'...`);
  const newId = props.onCreatePayee(name);
  if (newId) {
    payeeCache.set(key, newId);
    return newId;
  }
  return null;
}

// --- AUTO-POLLING ---
setInterval(() => {
  const props = connectToActual();
  if (!props) {
    if (lastStateSignature !== "void") {
      lastStateSignature = "void";
    }
    return;
  }

  const txs = props.transactions || [];
  // Signature based on count and first ID to detect view changes (filtering/sorting/nav)
  const currentSignature = `${txs.length}:${txs[0]?.id}`;

  if (currentSignature !== lastStateSignature) {
    console.log(`Bridge: View Changed (${txs.length} items). Syncing...`);
    lastStateSignature = currentSignature;
    window.postMessage({ type: 'ACTUAL_BRIDGE_DATA', payload: txs }, '*');
  }
}, 2000);

// Listen for commands from the isolated content script
window.addEventListener('message', async (event) => {
  if (event.data.type !== 'ACTUAL_BRIDGE_CMD') return;
  console.log('actual event data', JSON.stringify(event.data,null,2));
  const { command, payload } = event.data;
  const props = connectToActual();

  if (!props) {
    console.warn("Actual Bridge: Not connected to table.");
    return;
  }

  if (command === 'GET_TRANSACTIONS') {
    // Send data back to isolated world
    window.postMessage({ type: 'ACTUAL_BRIDGE_DATA', payload: props.transactions }, '*');
    return;
  }

  if (command === 'SAVE_TRANSACTION') {
    try {
      // TODO: be pickier about type of payload
      console.log("Bridge: Saving Transaction...", payload.id);
      if (payload.subtransactions && Array.isArray(payload.subtransactions)) {
        console.log("Bridge: Processing Split Update");
        // Arg 1: Transaction
        // Arg 2: Subtransactions Array
        // Arg 3: null (Full update required for structure changes)
        await props.onSave(payload, payload.subtransactions, null);
      } else {
        console.log("Bridge: Processing Field Update");
	// TODO: but the payload might have included other fields ...
        await props.onSave(payload, null, 'notes');
      }
      console.log("Bridge: Save Success", payload.id);
    } catch (e) {
      console.error("Bridge: Save Failed", e);
    }
    return;
  }

  // --- IMPORT (New Transaction) ---
  if (command === 'IMPORT_TRANSACTION') {
    // Fragile, only deduplicates against currently loaded/visible transactions.
    const existingTransactions = props.transactions || [];
    // TODO: at least check that the current view is for the right account.
    // TODO: should maintaint a set of imported_id here ... and add whatever we import to it.
    if (payload.imported_id) {
      // eslint-disable-next-line
       const isDuplicate = existingTransactions.some((t: any) => t.imported_id === payload.imported_id);
       if (isDuplicate) {
         console.log(`Bridge: Skipping duplicate import (${payload.imported_id})`);
         return;
       }
    }

    try {
      console.log("Bridge: Importing...", payload.payee_name);

      // 1. Resolve Payee ID
      const payeeId = await resolvePayee(payload.payee_name || "", props);
      if (!payeeId) throw new Error(`Could not resolve payee ID for '${payload.payee_name}'`);

      // 2. Construct Final Object for onAdd
      const newTx = {
        ...payload,
        payee: payeeId, // Swap name for ID
      };
      // Remove helper fields not needed for DB
      delete newTx.payee_name;

      // 3. Fire onAdd
      await props.onAdd([newTx]);
      console.log("Bridge: Import Success");

    } catch (e) {
      console.error("Bridge: Import Failed", e);
    }
    return;
  }

});

console.log("✅ Actual Bridge: Injected into Main World");
