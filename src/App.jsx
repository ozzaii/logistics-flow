import React, { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import LogisticsDashboard from './components/LogisticsDashboard';

// Updated API configuration
const BASE_URL = "https://fba2-34-126-184-39.ngrok-free.app";
const API_URL = `${BASE_URL}/predict`;

const App = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState({
    cargoSeekingTransport: [],
    transportSeekingCargo: []
  });

  const processAIResponse = useCallback((response) => {
    try {
      console.log("Processing response:", response);
      
      // Extract just the numbered list part using regex
      const listMatch = response.match(/1\.\s*Mesaj Tipi:[\s\S]*?(?=\n\n|$)/);
      if (!listMatch) {
        console.warn('No numbered list found in response');
        alert('AI yanıtı analiz edilemedi. Lütfen mesajınızı tekrar gönderin.');
        return;
      }

      const listText = listMatch[0];
      
      // Parse each numbered line
      const entry = {};
      const lines = listText.split('\n');
      
      lines.forEach(line => {
        // Match lines like "1. Mesaj Tipi: CARGO_SEEKING_TRANSPORT"
        const match = line.match(/\d+\.\s*([^:]+):\s*(.+)/);
        if (match) {
          const [, key, value] = match;
          entry[key.trim()] = value.trim();
        }
      });

      console.log("Parsed entry:", entry);

      // Create new entry with the parsed data
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

      // Update entries based on message type
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
        } else {
          console.warn('Unknown message type:', entry['Mesaj Tipi']);
          alert('Geçersiz mesaj tipi. Lütfen mesajınızı tekrar gönderin.');
          return prev;
        }
      });

    } catch (error) {
      console.error('Error processing AI response:', error);
      console.error('Raw response was:', response);
      alert('AI yanıtı işlenirken hata oluştu! Lütfen mesajınızı tekrar gönderin.');
    }
  }, []);

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
