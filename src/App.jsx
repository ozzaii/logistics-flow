import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import LogisticsDashboard from './components/LogisticsDashboard';

// Updated API configuration
const BASE_URL = "https://5c39-34-142-233-221.ngrok-free.app";
const API_URL = `${BASE_URL}/predict`;

const App = () => {
  // 1. Constants first
  const STORAGE_KEY = 'logistics_classifications';
  const maxReconnectDelay = 5000;

  // 2. All useRef declarations
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);

  // 3. All useState declarations
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 4. Initialize entries with stored data
  const [entries, setEntries] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {
        cargoSeekingTransport: [],
        transportSeekingCargo: []
      };
    } catch {
      return {
        cargoSeekingTransport: [],
        transportSeekingCargo: []
      };
    }
  });

  // 5. useCallback functions
  const saveEntries = useCallback((newEntries) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
  }, []);

  const deleteEntry = useCallback((id, type) => {
    setEntries(prev => {
      const newState = {
        ...prev,
        [type]: prev[type].filter(entry => entry.id !== id)
      };
      saveEntries(newState);
      return newState;
    });
  }, [saveEntries]);

  const processAIResponse = useCallback((response) => {
    try {
      console.log("Processing response:", response);
      
      // Extract classification data
      const listMatch = response.match(/1\.\s*Mesaj Tipi:[\s\S]*?(?=\n\n|$)/);
      if (!listMatch) {
        console.warn('No numbered list found in response');
        return;
      }

      const listText = listMatch[0];
      const entry = {};
      const lines = listText.split('\n');
      
      lines.forEach(line => {
        const match = line.match(/\d+\.\s*([^:]+):\s*(.+)/);
        if (match) {
          const [, key, value] = match;
          entry[key.trim()] = value.trim();
        }
      });

      const newEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        messageType: entry['Mesaj Tipi'] || 'BELİRTİLMEMİŞ',
        loadingLocation: entry['Yükleme Yeri'] || 'BELİRTİLMEMİŞ',
        unloadingLocation: entry['İndirme Yeri/Yerleri'] || 'BELİRTİLMEMİŞ',
        cargoType: entry['Yük Tipi'] || 'BELİRTİLMEMİŞ',
        vehicleType: entry['Araç Tipi'] || 'BELİRTİLMEMİŞ',
        amount: entry['Tonaj/Miktar'] || 'BELİRTİLMEMİŞ',
        contact: entry['İletişim'] || 'BELİRTİLMEMİŞ',
        extraInfo: entry['Ekstra Bilgi'] || 'BELİRTİLMEMİŞ'
      };

      setEntries(prev => {
        const newState = { ...prev };
        if (entry['Mesaj Tipi']?.toLowerCase().includes('cargo_seeking_transport')) {
          newState.cargoSeekingTransport = [newEntry, ...prev.cargoSeekingTransport];
        } else if (entry['Mesaj Tipi']?.toLowerCase().includes('transport_seeking_cargo')) {
          newState.transportSeekingCargo = [newEntry, ...prev.transportSeekingCargo];
        }
        saveEntries(newState);
        return newState;
      });

    } catch (error) {
      console.error('Error processing AI response:', error);
    }
  }, [saveEntries]);

  // 6. WebSocket connection logic
  const connectWebSocket = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket('ws://localhost:3033');

    ws.current.onopen = () => {
      console.log('Connected to WhatsApp listener');
      setWsStatus('connected');
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };

    ws.current.onmessage = (event) => {
      console.log("WebSocket received:", event.data);
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_classification') {
        console.log("Processing classification:", data.data.classification);
        processAIResponse(data.data.classification);
      } else if (data.type === 'status') {
        setWsStatus(data.status);
      }
    };

    ws.current.onclose = () => {
      console.log('Disconnected from WhatsApp listener');
      setWsStatus('disconnected');
      reconnectTimeout.current = setTimeout(() => {
        console.log('Attempting to reconnect...');
        connectWebSocket();
      }, Math.random() * maxReconnectDelay);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsStatus('error');
    };
  }, [processAIResponse]);

  // 7. useEffect hooks last
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connectWebSocket]);

  const handleSubmit = async () => {
    if (!inputMessage.trim()) return;
    
    setIsLoading(true);
    try {
      console.log("Sending request to:", API_URL);
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify({
          message: inputMessage
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Raw API Response:', result);
      
      if (result.response) {
        processAIResponse(result.response);
        setInputMessage('');
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (error) {
      console.error('API Error:', error);
      alert('Bağlantı hatası! AI servisine ulaşılamıyor. Lütfen konsolu kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          Lojistik Mesaj İşlemcisi
        </h1>
        
        <div className={`fixed top-4 right-4 px-3 py-1 rounded-full text-sm font-medium ${
          wsStatus === 'connected' 
            ? 'bg-green-100 text-green-800' 
            : wsStatus === 'error' 
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
        }`}>
          {wsStatus === 'connected' ? 'WhatsApp Bağlı' : 
           wsStatus === 'error' ? 'Bağlantı Hatası' : 'Bağlanıyor...'}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Lojistik mesajını buraya yapıştırın..."
            className="w-full h-32 p-4 border rounded-lg mb-4 resize-none"
            disabled={isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !inputMessage.trim()}
            className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-colors ${
              isLoading || !inputMessage.trim() 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isLoading ? 'İşleniyor...' : 'Mesajı İşle'}
          </button>
        </div>

        <LogisticsDashboard 
          cargoSeekingTransport={entries.cargoSeekingTransport}
          transportSeekingCargo={entries.transportSeekingCargo}
        />
      </div>
    </div>
  );
};

export default App;
