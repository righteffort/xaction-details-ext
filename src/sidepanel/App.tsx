import { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';

type AppState = 'IDLE' | 'CHECKING_TABS' | 'READY_TO_SYNC' | 'SYNCING';

export default function App() {
  const [status, setStatus] = useState<AppState>('IDLE');
  const [tabs, setTabs] = useState({ actual: false, chase: false });
  const [logs, setLogs] = useState<string[]>([]);

  const checkTabs = async () => {
    const actualTabs = await browser.tabs.query({ url: "*://*.actualbudget.org/*" });
    const chaseTabs = await browser.tabs.query({ url: "*://*.chase.com/*" });
    
    const hasActual = actualTabs.length > 0;
    const hasChase = chaseTabs.length > 0;

    setTabs({ actual: hasActual, chase: hasChase });
    
    if (hasActual && hasChase) return 'READY_TO_SYNC';
    return 'CHECKING_TABS';
  };

  useEffect(() => {
    checkTabs().then(setStatus);
    // Poll every 2s to see if user opened tabs
    const interval = setInterval(() => checkTabs().then(setStatus), 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setStatus('SYNCING');
    setLogs(prev => [...prev, "Starting Sync..."]);
    
    // 1. Trigger Actual Bridge
    const actualTabs = await browser.tabs.query({ url: "*://*.actualbudget.org/*" });
    if (actualTabs[0]?.id) {
       browser.tabs.sendMessage(actualTabs[0].id, { action: 'FETCH_ACTUAL_DATA' });
       setLogs(prev => [...prev, "Requested Actual Data..."]);
    }
  };

  // --- RENDER HELPERS ---
  
  if (!tabs.actual) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Step 1: Open Actual</h2>
        <p>Please open your Actual Budget tab to continue.</p>
        <button onClick={() => browser.tabs.create({ url: 'https://app.actualbudget.org' })}>
          Open Actual
        </button>
      </div>
    );
  }

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

  return (
    <div style={{ padding: 20 }}>
      <h2>Ready to Sync</h2>
      <button onClick={handleSync} disabled={status === 'SYNCING'}>
        {status === 'SYNCING' ? 'Syncing...' : 'Start Bridge'}
      </button>
      
      <div style={{ marginTop: 20, background: '#f0f0f0', padding: 10, borderRadius: 4 }}>
        <strong>Logs:</strong>
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
