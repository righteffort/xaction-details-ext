import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import browser from 'webextension-polyfill';

type AppState = 'IDLE' | 'CHECKING_TABS' | 'READY_TO_SYNC' | 'SYNCING';

function App() {
  const [status, setStatus] = useState<AppState>('IDLE');
  const [tabs, setTabs] = useState({ actual: false, chase: false });
  const [logs, setLogs] = useState<string[]>([]);

  // Check if required tabs are open
  const checkTabs = async () => {
    const actualTabs = await browser.tabs.query({ url: "*://actual.romerfamily.com/*" });
    const chaseTabs = await browser.tabs.query({ url: "*://*.chase.com/*" });

    const hasActual = actualTabs.length > 0;
    const hasChase = chaseTabs.length > 0;

    setTabs({ actual: hasActual, chase: hasChase });

    if (hasActual/* && hasChase*/) return 'READY_TO_SYNC';
    return 'CHECKING_TABS';
  };

  // Poll for tab status
  useEffect(() => {
    checkTabs().then(setStatus);
    // Poll every 2s to see if user opened tabs
    const interval = setInterval(() => checkTabs().then(setStatus), 2000);
    return () => clearInterval(interval);
  }, []);

  // Listen for logs from background
  useEffect(() => {
    const listener = (msg: any) => {
      if (msg.action === 'STATE_UPDATED') {
        setLogs(prev => [...prev, `✅ Received ${msg.count} transactions from Actual.`]);
        setStatus('READY_TO_SYNC');
      }
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);

  const handleSync = async () => {
    setStatus('SYNCING');
    setLogs(prev => [...prev, "Starting Sync..."]);

    // 1. Trigger Actual Bridge
    const actualTabs = await browser.tabs.query({ url: "*://actual.romerfamily.com/*" });
    if (actualTabs[0]?.id) {
       browser.tabs.sendMessage(actualTabs[0].id, { action: 'FETCH_ACTUAL_DATA' });
       setLogs(prev => [...prev, "Requested Actual Data..."]);
    } else {
      setLogs(prev => [...prev, "❌ Error: Actual tab lost."]);
    }
  };

  // NEW: Manual Trigger for Import PoC
  const handleImportTest = async (action: string) => {
    const actualTab = (await browser.tabs.query({ url: "*://actual.romerfamily.com/*" }))[0];

    if (actualTab?.id) {
        setLogs(prev => [...prev, "👉 Triggering Manual Import Test..."]);
        // Tell Background to construct payload and fire
        browser.runtime.sendMessage({ action, tabId: actualTab.id });
    }
  };
  // --- RENDER HELPERS ---

  if (!tabs.actual) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Step 1: Open Actual</h2>
        <p>Please open your Actual Budget tab to continue.</p>
        <button onClick={() => browser.tabs.create({ url: 'https://actual.romerfamily.com/' })}>
          Open Actual
        </button>
      </div>
    );
  }
  /*
  if (!tabs.chase) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Step 2: Open Chase</h2>
        <p>Actual is ready. Now open Chase.</p>
        <button onClick={() => browser.tabs.create({ url: 'https://www.chase.com' })}>
          Open Chase
        </button>
      </div>
    );
  }
   */

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h3>Bridge Ready</h3>
      <p>Both sites detected.</p>

      <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
        <button
          onClick={handleSync}
          disabled={status === 'SYNCING'}
          style={{ padding: '10px 20px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: 4 }}
        >
          {status === 'SYNCING' ? 'Running...' : 'Sync Data'}
        </button>

        <button
          onClick={() => handleImportTest('RUN_POC_IMPORT_ONE')}
          style={{ padding: '10px 20px', cursor: 'pointer', background: '#28a745', color:
'white', border: 'none', borderRadius: 4 }}
        >
           Test Import PoC one
        </button>

	<button
          onClick={() => handleImportTest('RUN_POC_IMPORT_TWO')}
          style={{ padding: '10px 20px', cursor: 'pointer', background: '#28a745', color:
'white', border: 'none', borderRadius: 4 }}
        >
           Test Import PoC two
        </button>
      </div>

      <div style={{ marginTop: 20, background: '#f5f5f5', padding: 10, borderRadius: 4, fontSize: '0.9em', minHeight: 100 }}>
        <strong>Activity Log:</strong>
        {logs.map((l, i) => <div key={i} style={{ marginTop: 4 }}>{l}</div>)}
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Root element not found");
}
