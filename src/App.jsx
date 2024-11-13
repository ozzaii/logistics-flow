import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import LogisticsDashboard from './components/LogisticsDashboard';

// Updated API configuration
const BASE_URL = "https://d9d4-34-138-80-119.ngrok-free.app";
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
        console.log("Processing AI response:", response);
        
        // Extract just the numbered list part
        const listMatch = response.match(/1\.\s*Mesaj Tipi:[\s\S]*?(?=\n\n|$)/);
        if (!listMatch) {
            console.warn('No numbered list found in response');
            return;
        }

        const listText = listMatch[0];
        console.log("Parsed list text:", listText);
        
        const entry = {};
        const lines = listText.split('\n');
        
        lines.forEach(line => {
            const match = line.match(/\d+\.\s*([^:]+):\s*(.+)/);
            if (match) {
                const [, key, value] = match;
                entry[key.trim()] = value.trim();
            }
        });

        console.log("Parsed entry:", entry);

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
        console.error('Raw response was:', response);
    }
  }, [saveEntries]);

  // 6. WebSocket connection logic
  const connectWebSocket = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    console.log('Attempting to connect to WebSocket...');
    ws.current = new WebSocket('ws://localhost:3033');

    ws.current.onopen = () => {
        console.log('WebSocket Connected');
        setWsStatus('connected');
    };

    ws.current.onmessage = (event) => {
        console.log('Received WebSocket message:', event.data);
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'new_classification' && data.data?.classification) {
                const lines = data.data.classification.split('\n');
                const entry = {
                    id: Date.now(),
                    timestamp: data.data.timestamp,
                    messageType: lines.find(l => l.includes('Mesaj Tipi'))?.split(': ')[1]?.trim() || 'BELİRTİLMEMİŞ',
                    loadingLocation: lines.find(l => l.includes('Yükleme Yeri'))?.split(': ')[1]?.trim() || 'BELİRTİLMEMİŞ',
                    unloadingLocation: lines.find(l => l.includes('İndirme Yeri'))?.split(': ')[1]?.trim() || 'BELİRTİLMEMİŞ',
                    cargoType: lines.find(l => l.includes('Yük Tipi'))?.split(': ')[1]?.trim() || 'BELİRTİLMEMİŞ',
                    vehicleType: lines.find(l => l.includes('Araç Tipi'))?.split(': ')[1]?.trim() || 'BELİRTİLMEMİŞ',
                    amount: lines.find(l => l.includes('Tonaj/Miktar'))?.split(': ')[1]?.trim() || 'BELİRTİLMEMİŞ',
                    contact: lines.find(l => l.includes('İletişim'))?.split(': ')[1]?.trim() || 'BELİRTİLMEMİŞ',
                    extraInfo: lines.find(l => l.includes('Ekstra Bilgi'))?.split(': ')[1]?.trim() || 'BELİRTİLMEMİŞ'
                };

                setEntries(prev => {
                    const newState = { ...prev };
                    if (entry.messageType.includes('CARGO_SEEKING_TRANSPORT')) {
                        newState.cargoSeekingTransport = [entry, ...prev.cargoSeekingTransport];
                    } else if (entry.messageType.includes('TRANSPORT_SEEKING_CARGO')) {
                        newState.transportSeekingCargo = [entry, ...prev.transportSeekingCargo];
                    }
                    saveEntries(newState);
                    return newState;
                });
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    };

    ws.current.onclose = () => {
        console.log('WebSocket Disconnected');
        setWsStatus('disconnected');
        // Attempt to reconnect after a delay
        setTimeout(connectWebSocket, 3000);
    };
  }, [saveEntries]);

  useEffect(() => {
    connectWebSocket();
    return () => {
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

  // Add this new component
  const LogisticsInput = ({ isLoading }) => {
    const [inputMessage, setInputMessage] = useState('');

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!inputMessage.trim()) return;

      try {
        const response = await fetch('http://localhost:3033/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: inputMessage.trim() })
        });

        if (!response.ok) throw new Error('Failed to send message');
        
        setInputMessage(''); // Clear input on success
      } catch (error) {
        console.error('Error sending message:', error);
        alert('Mesaj gönderilirken bir hata oluştu.');
      }
    };

    return (
      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-white rounded-lg shadow">
        <div className="space-y-4">
          <label 
            htmlFor="whatsapp-message" 
            className="block text-sm font-medium text-gray-700"
          >
            WhatsApp Mesajı
          </label>
          
          <textarea
            id="whatsapp-message"
            name="whatsapp-message"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="WhatsApp mesajını buraya yapıştırın..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            rows="4"
            disabled={isLoading}
          />
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className={`
                px-4 py-2 rounded-md text-white
                ${isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'}
              `}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  İşleniyor...
                </span>
              ) : 'Gönder'}
            </button>
          </div>
        </div>
      </form>
    );
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
        
        <LogisticsInput isLoading={isLoading} />

        <LogisticsDashboard 
          cargoSeekingTransport={entries.cargoSeekingTransport}
          transportSeekingCargo={entries.transportSeekingCargo}
        />
      </div>
    </div>
  );
};

export default App;
