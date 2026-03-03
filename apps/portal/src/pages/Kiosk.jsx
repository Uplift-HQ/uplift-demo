// ============================================================
// KIOSK PAGE
// Full-screen clock-in/out interface for tablets and kiosks
// No sidebar, no header, standalone interface
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Clock, LogIn, LogOut, AlertCircle, Wifi, WifiOff, User, X, Loader2 } from 'lucide-react';

// Simple API helper for kiosk requests
const kioskApi = {
  baseUrl: import.meta.env.VITE_API_URL || '',

  async request(endpoint, options = {}) {
    const apiKey = localStorage.getItem('kiosk_api_key');
    if (!apiKey) throw new Error('No kiosk API key configured');

    const response = await fetch(`${this.baseUrl}/api/kiosk${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Kiosk-Key': apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  },

  getConfig() {
    return this.request('/config');
  },

  lookup(query) {
    const params = new URLSearchParams(query);
    return this.request(`/lookup?${params}`);
  },

  clock(employeeId, action) {
    return this.request('/clock', {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId, action }),
    });
  },
};

export default function Kiosk() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const lock = searchParams.get('lock') === 'true';

  // State
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Input state
  const [inputValue, setInputValue] = useState('');
  const [employee, setEmployee] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [clocking, setClocking] = useState(false);

  // Success/error feedback
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message, details }

  // Offline queue
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);

  const inputRef = useRef(null);

  // Load config on mount
  useEffect(() => {
    loadConfig();

    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync offline queue when back online
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineQueue();
    }
  }, [isOnline]);

  // Focus input when no employee selected
  useEffect(() => {
    if (!employee && !feedback && inputRef.current) {
      inputRef.current.focus();
    }
  }, [employee, feedback]);

  // Clear feedback after 5 seconds and reset
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
        setEmployee(null);
        setInputValue('');
        inputRef.current?.focus();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const loadConfig = async () => {
    try {
      const data = await kioskApi.getConfig();
      setConfig(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load kiosk configuration');
    } finally {
      setLoading(false);
    }
  };

  const syncOfflineQueue = async () => {
    const queue = [...offlineQueue];
    setOfflineQueue([]);

    for (const item of queue) {
      try {
        await kioskApi.clock(item.employeeId, item.action);
      } catch (err) {
        console.error('Failed to sync offline clock:', err);
      }
    }
  };

  const handleInputSubmit = async () => {
    if (!inputValue.trim()) return;

    setLookingUp(true);
    try {
      const data = await kioskApi.lookup({ employee_id: inputValue.trim() });
      setEmployee(data);
      setInputValue('');
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Employee not found',
      });
      setInputValue('');
    } finally {
      setLookingUp(false);
    }
  };

  const handleClock = async (action) => {
    if (!employee) return;

    setClocking(true);
    try {
      if (!isOnline) {
        // Queue for later
        setOfflineQueue(q => [...q, { employeeId: employee.employee_id, action }]);
        setFeedback({
          type: 'success',
          message: action === 'in' ? 'Clock In Queued' : 'Clock Out Queued',
          details: 'Will sync when online',
        });
      } else {
        const result = await kioskApi.clock(employee.employee_id, action);
        setFeedback({
          type: 'success',
          message: action === 'in' ? 'Clocked In' : 'Clocked Out',
          details: result.message,
          time: action === 'in' ? result.clock_time : result.clock_out,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Clock failed',
      });
    } finally {
      setClocking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleInputSubmit();
    }
  };

  const handleNumberPad = (value) => {
    if (value === 'clear') {
      setInputValue('');
    } else if (value === 'enter') {
      handleInputSubmit();
    } else {
      setInputValue(prev => prev + value);
    }
  };

  const handleCancel = () => {
    setEmployee(null);
    setInputValue('');
    inputRef.current?.focus();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Setup screen (no API key configured)
  if (!localStorage.getItem('kiosk_api_key') && !loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{t('kiosk.setup')}</h1>
          <p className="text-slate-400 mb-6">{t('kiosk.setupDesc')}</p>
          <input
            type="text"
            placeholder="ksk_..."
            className="w-full bg-slate-700 text-white text-lg p-4 rounded-xl border-2 border-slate-600 focus:border-orange-500 focus:outline-none mb-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.startsWith('ksk_')) {
                localStorage.setItem('kiosk_api_key', e.target.value);
                window.location.reload();
              }
            }}
          />
          <p className="text-sm text-slate-500">Get your API key from Settings &gt; Time &amp; Attendance</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-xl">Loading kiosk...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-red-900/50 rounded-2xl p-8 text-center border border-red-700">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">{t('kiosk.error')}</h1>
          <p className="text-red-300 mb-6">{error}</p>
          <button
            onClick={() => {
              localStorage.removeItem('kiosk_api_key');
              window.location.reload();
            }}
            className="bg-slate-700 text-white px-6 py-3 rounded-xl text-lg hover:bg-slate-600 transition"
          >
            Reconfigure Kiosk
          </button>
        </div>
      </div>
    );
  }

  const primaryColor = config?.primary_color || '#F26522';

  return (
    <div
      className="min-h-screen bg-slate-900 flex flex-col"
      style={{ '--kiosk-primary': primaryColor }}
    >
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 flex items-center justify-center gap-2">
          <WifiOff className="w-5 h-5" />
          <span className="font-medium">Offline - events will sync when connected</span>
          {offlineQueue.length > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded text-sm">{offlineQueue.length} queued</span>
          )}
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {config?.logo_url ? (
              <img src={config.logo_url} alt="Logo" className="h-12 w-auto" />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: primaryColor }}
              >
                {config?.org_name?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{config?.org_name}</h1>
              <p className="text-slate-400">{config?.location_name}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-mono font-bold text-white">{formatTime(currentTime)}</div>
            <p className="text-slate-400">{formatDate(currentTime)}</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-8">
        {feedback ? (
          // Feedback screen (success/error)
          <div className="text-center">
            {feedback.type === 'success' ? (
              <>
                <div className="w-32 h-32 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Check className="w-20 h-20 text-green-500" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-2">{feedback.message}</h2>
                {feedback.details && (
                  <p className="text-2xl text-slate-400">{feedback.details}</p>
                )}
              </>
            ) : (
              <>
                <div className="w-32 h-32 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-20 h-20 text-red-500" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-2">{feedback.message}</h2>
              </>
            )}
          </div>
        ) : employee ? (
          // Employee action screen
          <div className="text-center max-w-2xl mx-auto">
            {/* Employee info */}
            <div className="mb-8">
              {employee.photo_url ? (
                <img
                  src={employee.photo_url}
                  alt={employee.name}
                  className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-slate-700 object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-4">
                  <User className="w-16 h-16 text-slate-500" />
                </div>
              )}
              <h2 className="text-4xl font-bold text-white mb-2">{employee.name}</h2>
              {employee.location_name && (
                <p className="text-xl text-slate-400">{employee.location_name}</p>
              )}
              {employee.clocked_in && employee.last_clock_time && (
                <p className="text-lg text-green-400 mt-2">
                  Clocked in at {new Date(employee.last_clock_time).toLocaleTimeString()}
                </p>
              )}
              {!employee.clocked_in && employee.last_clock_time && (
                <p className="text-lg text-slate-500 mt-2">
                  Last clocked out at {new Date(employee.last_clock_time).toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-6 justify-center">
              {!employee.clocked_in && (
                <button
                  onClick={() => handleClock('in')}
                  disabled={clocking}
                  className="flex items-center gap-4 bg-green-600 hover:bg-green-500 text-white text-2xl font-bold px-12 py-6 rounded-2xl transition-all disabled:opacity-50 min-w-[200px] justify-center"
                >
                  {clocking ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <LogIn className="w-8 h-8" />
                  )}
                  Clock In
                </button>
              )}
              {employee.clocked_in && (
                <button
                  onClick={() => handleClock('out')}
                  disabled={clocking}
                  className="flex items-center gap-4 bg-red-600 hover:bg-red-500 text-white text-2xl font-bold px-12 py-6 rounded-2xl transition-all disabled:opacity-50 min-w-[200px] justify-center"
                >
                  {clocking ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <LogOut className="w-8 h-8" />
                  )}
                  Clock Out
                </button>
              )}
              <button
                onClick={handleCancel}
                className="flex items-center gap-4 bg-slate-700 hover:bg-slate-600 text-white text-2xl font-bold px-8 py-6 rounded-2xl transition-all"
              >
                <X className="w-8 h-8" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          // Input screen
          <div className="text-center max-w-xl mx-auto">
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-8"
              style={{ backgroundColor: primaryColor }}
            >
              <Clock className="w-14 h-14 text-white" />
            </div>

            <h2 className="text-3xl font-bold text-white mb-2">Enter Employee ID or Scan Badge</h2>
            <p className="text-xl text-slate-400 mb-8">Use the number pad or scan your badge</p>

            {/* Input field */}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Employee ID or PIN"
              className="w-full bg-slate-800 text-white text-3xl text-center p-6 rounded-2xl border-2 border-slate-700 focus:border-orange-500 focus:outline-none mb-6 font-mono"
              autoFocus
              autoComplete="off"
            />

            {/* Number pad */}
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberPad(String(num))}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-3xl font-bold py-6 rounded-xl transition-all active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => handleNumberPad('clear')}
                className="bg-red-900/50 hover:bg-red-800/50 text-red-300 text-xl font-bold py-6 rounded-xl transition-all"
              >
                Clear
              </button>
              <button
                onClick={() => handleNumberPad('0')}
                className="bg-slate-800 hover:bg-slate-700 text-white text-3xl font-bold py-6 rounded-xl transition-all active:scale-95"
              >
                0
              </button>
              <button
                onClick={() => handleNumberPad('enter')}
                disabled={lookingUp || !inputValue}
                className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xl font-bold py-6 rounded-xl transition-all flex items-center justify-center"
              >
                {lookingUp ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  'Enter'
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      {!lock && (
        <footer className="bg-slate-800 border-t border-slate-700 px-8 py-3 text-center">
          <p className="text-slate-500 text-sm">
            Powered by Uplift &bull; {isOnline ? (
              <span className="text-green-400 inline-flex items-center gap-1">
                <Wifi className="w-3 h-3" /> Online
              </span>
            ) : (
              <span className="text-amber-400 inline-flex items-center gap-1">
                <WifiOff className="w-3 h-3" /> Offline
              </span>
            )}
          </p>
        </footer>
      )}
    </div>
  );
}
