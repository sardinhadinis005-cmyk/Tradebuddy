import { useEffect, useState } from 'react';
import { fetchAccount } from '../api/account.js';
import { SETTINGS_EVENT } from '../api/tradierSettings.js';

export default function useAccount() {
  const [state, setState] = useState({ status: 'loading', account: null, error: '' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const bump = () => setReloadKey((key) => key + 1);
    window.addEventListener(SETTINGS_EVENT, bump);
    return () => window.removeEventListener(SETTINGS_EVENT, bump);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchAccount(controller.signal)
      .then((account) => setState({ status: 'ready', account, error: '' }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setState((previous) => ({ status: 'error', account: previous.account, error: error.message }));
      });
    return () => controller.abort();
  }, [reloadKey]);

  return state;
}
