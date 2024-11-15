import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import LogisticsDashboard from './components/LogisticsDashboard';

// Updated API configuration
const BASE_URL = window.location.hostname === 'localhost' 
  ? "https://ozai.ngrok.app"
  : "https://ozai.ngrok.app";

const API_URL = `${BASE_URL}/predict`;
const WS_URL = `wss://ozai.ngrok.app/ws`;

const App = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState({
    cargoSeekingTransport: [],
    transportSeekingCargo: []
  });
  const [wsConnected, setWsConnected] = useState(false);
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    const connectWebSocket = () => {
      if (ws.current?.readyState === WebSocket.OPEN) return;

      console.log('Attempting WebSocket connection to:', WS_URL);
      
      ws.current = new WebSocket(WS_URL);
      
      ws.current.onopen = () => {
        console.log('WebSocket Connected Successfully');
        setWsConnected(true);
        reconnectAttempts.current = 0;
        
        // Send heartbeat every 30 seconds
        const heartbeat = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send('ping');
          }
        }, 30000);
        
        return () => clearInterval(heartbeat);
      };

      ws.current.onmessage = (event) => {
        console.log('Received WebSocket message:', event.data);
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_classification') {
            processAIResponse(data.data);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket Disconnected:', event.code, event.reason);
        setWsConnected(false);
        
        // Attempt to reconnect with exponential backoff
        const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        console.log(`Reconnecting in ${timeout/1000} seconds...`);
        setTimeout(connectWebSocket, timeout);
        reconnectAttempts.current++;
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket Error:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const processAIResponse = useCallback((response) => {
    try {
      console.log('Processing response:', response);
      
      // Get the classification text and remove markdown formatting
      const classificationText = response.classification.replace(/\*\*/g, '');
      
      // Create an object to store the parsed values
      const parsedData = {};
      
      // Split into lines and process each line
      const lines = classificationText.split('\n')
        .filter(line => line.trim() && line.includes(':'))
        .map(line => {
          // Remove numbers and clean up the line
          const cleanLine = line.replace(/^\d+\.\s*/, '').trim();
          const [key, ...valueParts] = cleanLine.split(':');
          const value = valueParts.join(':').trim();
          return { key: key.trim(), value };
        });

      // Map the parsed lines to our entry structure
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
        contact: lines.find(l => l.key === 'İletişim')?.value?.replace(/☎️/g, '') || 'BELİRTİLMEMİŞ',
        extraInfo: lines.find(l => l.key === 'Ekstra Bilgi')?.value || 'BELİRTİLMEMİŞ'
      };

      console.log('Created entry:', entry);

      // Update appropriate list based on message type
      setEntries(prevEntries => {
        if (entry.messageType === 'CARGO_SEEKING_TRANSPORT') {
          const newEntries = {
            ...prevEntries,
            cargoSeekingTransport: [entry, ...prevEntries.cargoSeekingTransport]
          };
          console.log('Updated entries:', newEntries);
          return newEntries;
        } else if (entry.messageType === 'TRANSPORT_SEEKING_CARGO') {
          const newEntries = {
            ...prevEntries,
            transportSeekingCargo: [entry, ...prevEntries.transportSeekingCargo]
          };
          console.log('Updated entries:', newEntries);
          return newEntries;
        }
        return prevEntries;
      });

    } catch (error) {
      console.error('Error processing AI response:', error);
    }
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
        </header>
        
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
      </div>
    </div>
  );
};

export default App;
