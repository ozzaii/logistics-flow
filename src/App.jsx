import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import LogisticsDashboard from './components/LogisticsDashboard';

const App = () => {
  // Initialize state first
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState({
    cargoSeekingTransport: [],
    transportSeekingCargo: []
  });

  // WebSocket connection in useMemo
  const ws = useMemo(() => {
    if (typeof window !== 'undefined') {
      return new WebSocket('ws://localhost:3030');
    }
    return null;
  }, []);

  // Process AI response
  const processAIResponse = useCallback((response) => {
    if (!response) return;

    try {
      console.log("Processing response:", response);
      
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
        if (entry['Mesaj Tipi']?.toLowerCase().includes('cargo_seeking_transport')) {
          return {
            ...prev,
            cargoSeekingTransport: [newEntry, ...prev.cargoSeekingTransport]
          };
        } else if (entry['Mesaj Tipi']?.toLowerCase().includes('transport_seeking_cargo')) {
          return {
            ...prev,
            transportSeekingCargo: [newEntry, ...prev.transportSeekingCargo]
          };
        }
        return prev;
      });

    } catch (error) {
      console.error('Error processing AI response:', error);
      console.error('Raw response was:', response);
    }
  }, []);

  // WebSocket setup
  useEffect(() => {
    if (!ws) return;

    ws.onopen = () => {
      console.log('Connected to WhatsApp listener');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_classification') {
          processAIResponse(data.data.classification);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from WhatsApp listener');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [ws, processAIResponse]);

  const handleSubmit = async () => {
    if (!inputMessage.trim()) return;
    
    setIsLoading(true);
    try {
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
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          Lojistik Mesaj İşlemcisi
        </h1>
        
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
