// The "Sniper" logic we developed to find React props
function connectToActual() {
  const anchor = document.querySelector('div[data-testid="row"], .recs-table-row') 
              || document.querySelector('div[role="columnheader"], .recs-table-header-cell');

  if (!anchor) return null;

  const key = Object.keys(anchor).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternal'));
  // @ts-expect-error: TODO: gemini wrote this code.
  let fiber = anchor[key];
  let steps = 0;

  while (fiber && steps < 30) {
    const p = fiber.memoizedProps;
    if (p && p.transactions && typeof p.onSave === 'function') {
      return p;
    }
    fiber = fiber.return;
    steps++;
  }
  return null;
}

// Listen for commands from the isolated content script
window.addEventListener('message', async (event) => {
  if (event.data.type !== 'ACTUAL_BRIDGE_CMD') return;

  const { command, payload } = event.data;
  const props = connectToActual();

  if (!props) {
    console.warn("Actual Bridge: Not connected to table.");
    return;
  }

  if (command === 'GET_TRANSACTIONS') {
    // Send data back to isolated world
    window.postMessage({ type: 'ACTUAL_BRIDGE_DATA', payload: props.transactions }, '*');
  } 
  
  if (command === 'SAVE_TRANSACTION') {
    try {
      // Stub: In v0.1 we only update notes
      await props.onSave(payload, null, 'notes'); 
      console.log("Bridge: Saved", payload.id);
    } catch (e) {
      console.error("Bridge Save Failed", e);
    }
  }
});

console.log("✅ Actual Bridge: Injected into Main World");
