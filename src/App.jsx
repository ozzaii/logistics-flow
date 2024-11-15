import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import LogisticsDashboard from './components/LogisticsDashboard';

// Updated API configuration
const BASE_URL = window.location.hostname === 'localhost' 
  ? "https://ozai.ngrok.app"
  : "https://ozai.ngrok.app";

const API_URL = `${BASE_URL}/predict`;
const WS_URL = 'wss://ozai.ngrok.app/ws';

const App = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem('logisticsEntries');
    return saved ? JSON.parse(saved) : {
      cargoSeekingTransport: [],
      transportSeekingCargo: []
    };
  });
  const [wsConnected, setWsConnected] = useState(false);
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [wsStatus, setWsStatus] = useState('connecting');
  const lastPongReceived = useRef(Date.now());
  const healthCheckInterval = useRef(null);

  const processAIResponse = useCallback((response) => {
    try {
      console.log('Processing response:', response);
      
      const classificationText = response.classification
        .replace(/\*\*Cevap:\*\*\n+/g, '')
        .replace(/\*\*/g, '')
        .trim();
      
      const lines = classificationText.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const cleanLine = line.replace(/^\d+\.\s*/, '').trim();
          const [key, ...valueParts] = cleanLine.split(/:(.*)/s);
          const value = valueParts.join('').trim();
          return { key: key.trim(), value };
        });

      const entry = {
        id: Date.now(),
        timestamp: response.timestamp,
        messageType: lines.find(l => l.key === 'Mesaj Tipi')?.value || 'BELİRTİLMEMİŞ',
        loadingLocation: lines.find(l => l.key === 'Yükleme Yeri veya Yerleri')?.value || 'BELİRTİLMEMİŞ',
        unloadingLocation: lines.find(l => l.key === 'İndirme Yeri veya Yerleri')?.value || 'BELİRTİLMEMİŞ',
        cargoType: lines.find(l => l.key === 'Yük Tipi')?.value || 'BELİRTİLMEMİŞ',
        vehicleType: lines.find(l => l.key === 'Araç Tipi')?.value || 'BELİRTİLMEMİŞ',
        amount: lines.find(l => l.key === 'Tonaj/Miktar')?.value || 'BELİRTİLMEMİŞ',
        price: lines.find(l => l.key === 'Fiyat Bilgisi')?.value || 'BELİRTİLMEMİŞ',
        date: lines.find(l => l.key === 'Tarih')?.value || 'BELİRTİLMEMİŞ',
        contact: lines.find(l => l.key === 'İletişim')?.value || 'BELİRTİLMEMİŞ',
        extraInfo: lines.find(l => l.key === 'Ekstra Bilgi')?.value || 'BELİRTİLMEMİŞ'
      };

      setEntries(prevEntries => {
        const messageType = lines.find(l => l.key === 'Mesaj Tipi')?.value;
        if (messageType === 'CARGO_SEEKING_TRANSPORT') {
          return {
            ...prevEntries,
            cargoSeekingTransport: [entry, ...prevEntries.cargoSeekingTransport]
          };
        } else if (messageType === 'TRANSPORT_SEEKING_CARGO') {
          return {
            ...prevEntries,
            transportSeekingCargo: [entry, ...prevEntries.transportSeekingCargo]
          };
        }
        return prevEntries;
      });

    } catch (error) {
      console.error('Error processing AI response:', error);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setWsStatus('failed');
      return;
    }

    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        return;
      }

      const socket = new WebSocket(WS_URL);
      socket.binaryType = 'blob';

      socket.addEventListener('open', () => {
        console.log('WebSocket Connected Successfully');
        reconnectAttempts.current = 0;
        setWsStatus('connected');
        // Initial ping
        socket.send(JSON.stringify({ type: 'ping' }));
      });

      socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            lastPongReceived.current = Date.now();
          } else if (data.type === 'new_classification') {
            processAIResponse(data.data);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });

      socket.addEventListener('close', (event) => {
        if (wsStatus === 'disconnected') return; // Prevent multiple reconnection attempts
        
        setWsStatus('disconnected');
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }

        const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        console.log(`Attempting to reconnect in ${backoffTime/1000} seconds...`);
        
        reconnectTimeout.current = setTimeout(() => {
          reconnectAttempts.current++;
          connectWebSocket();
        }, backoffTime);
      });

      socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      });

      ws.current = socket;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setWsStatus('disconnected');
    }
  }, [wsStatus, processAIResponse]);

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();

    // Cleanup function
    return () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (healthCheckInterval.current) {
        clearInterval(healthCheckInterval.current);
      }
    };
  }, [connectWebSocket]);

  // Add heartbeat to keep connection alive
  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send heartbeat every 30 seconds

    return () => clearInterval(heartbeat);
  }, []);

  // Add this effect for health checking
  useEffect(() => {
    healthCheckInterval.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        // Check if we haven't received a pong in more than 30 seconds
        if (Date.now() - lastPongReceived.current > 30000) {
          console.log('No pong received in 30s, reconnecting...');
          ws.current.close();
        } else {
          ws.current.send(JSON.stringify({ type: 'ping' }));
        }
      }
    }, 15000); // Check every 15 seconds

    return () => {
      if (healthCheckInterval.current) {
        clearInterval(healthCheckInterval.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    if (!inputMessage.trim()) return;
    
    setIsLoading(true);
    try {
      console.log("Sending request to:", API_URL);
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      };
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: headers,
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

  // Add local storage for persistence
  useEffect(() => {
    const savedEntries = localStorage.getItem('logisticsEntries');
    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('logisticsEntries', JSON.stringify(entries));
  }, [entries]);

  const handleReset = () => {
    setShowConfirmReset(true);
  };

  const confirmReset = () => {
    setEntries({
      cargoSeekingTransport: [],
      transportSeekingCargo: []
    });
    localStorage.removeItem('logisticsEntries');
    setShowConfirmReset(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto p-4 max-w-6xl">
        <header className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Lojistik Mesaj İşlemcisi
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Lojistik mesajlarınızı yapay zeka destekli sistemimizle analiz edin ve organize edin.
          </p>
          <button
            onClick={handleReset}
            className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
          >
            Sayfayı Temizle
          </button>
        </header>
        
        {showConfirmReset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-4">
                Sayfayı Temizle
              </h3>
              <p className="text-gray-600 mb-6">
                Tüm kayıtlar silinecek. Emin misiniz?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  İptal
                </button>
                <button
                  onClick={confirmReset}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                >
                  Evet, Temizle
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="relative">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Lojistik mesajını buraya yapıştırın..."
              className="w-full h-40 p-4 border border-gray-200 rounded-lg mb-4 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={isLoading}
            />
            {isLoading && (
              <div className="absolute inset-0 bg-gray-50 bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={isLoading || !inputMessage.trim()}
            className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-all
              ${isLoading || !inputMessage.trim() 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600 shadow-md hover:shadow-lg'
              }`}
          >
            {isLoading ? (
              <span>İşleniyor...</span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Search size={20} />
                Mesajı İşle
              </span>
            )}
          </button>
        </div>

        <LogisticsDashboard 
          cargoSeekingTransport={entries.cargoSeekingTransport}
          transportSeekingCargo={entries.transportSeekingCargo}
          isLoading={isLoading}
        />

        <div className={`fixed bottom-4 right-4 px-3 py-1 rounded-full text-sm ${
          wsStatus === 'connected' ? 'bg-green-100 text-green-800' :
          wsStatus === 'disconnected' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {wsStatus === 'connected' ? '🟢 Bağlı' :
           wsStatus === 'disconnected' ? '🔴 Bağlantı Kesildi' :
           '🟡 Bağlanıyor...'}
        </div>
      </div>
    </div>
  );
};

export default App;
