import { useState } from 'react';
import { useAtom } from 'jotai';
import { displaySettingsAtom } from '../store/atoms';

export const DisplaySettingsPanel = () => {
  const [displaySettings, setDisplaySettings] = useAtom(displaySettingsAtom);
  const [isOpen, setIsOpen] = useState(false);

  const updateSetting = (key, value) => {
    setDisplaySettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${
          isOpen
            ? 'bg-purple-600 text-white'
            : 'bg-white/90 backdrop-blur-xl text-gray-700 hover:bg-white'
        }`}
        title="Display Settings"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-4 min-w-[220px] border border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Display Settings</h3>

          {/* Brightness */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-gray-500">Brightness</label>
              <span className="text-xs text-gray-400">{Math.round(displaySettings.brightness * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="2"
              step="0.1"
              value={displaySettings.brightness}
              onChange={(e) => updateSetting('brightness', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>Dim</span>
              <span>Bright</span>
            </div>
          </div>

          {/* Wobble / Motion */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-gray-500">Motion</label>
              <span className="text-xs text-gray-400">{displaySettings.wobble === 0 ? 'Off' : Math.round(displaySettings.wobble * 100) + '%'}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={displaySettings.wobble}
              onChange={(e) => updateSetting('wobble', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>Still</span>
              <span>Float</span>
            </div>
          </div>

          {/* Reset button */}
          <button
            onClick={() => setDisplaySettings({ brightness: 1.0, wobble: 0.2 })}
            className="w-full text-xs text-gray-500 hover:text-purple-600 py-1 transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
};
