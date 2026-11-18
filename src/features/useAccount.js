import { useEffect, useState } from 'react';
import { fetchAccount } from '../api/account.js';
import { SETTINGS_EVENT } from '../api/tradierSettings.js';

export default function useAccount() {
  const [state, setState] = useState({ status: 'loading', account: null, error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    const bump = () => setReloadKey(key => key + 1);
    const visible = () => { if (document.visibilityState === 'visible') bump(); };
    window.addEventListener(SETTINGS_EVENT, bump);
    window.addEventListener('focus', bump);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, bump);
      window.removeEventListener('focus', bump);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetchAccount(controller.signal)
      .then(account => { if (!controller.signal.aborted) setState({ status: 'ready', account, error: '' }); })
      .catch(error => {
        if (controller.signal.aborted || error.name === 'AbortError') return;
        setState(previous => ({ status: 'error', account: previous.account, error: error.message }));
      });
    return () => controller.abort();
  }, [reloadKey]);
  return state;
}
