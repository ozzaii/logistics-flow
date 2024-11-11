import React, { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import LogisticsDashboard from './components/LogisticsDashboard';

const COLAB_URL = "https://12e9-34-143-163-90.ngrok-free.app/run/predict"; // Replace with your actual ngrok URL

const App = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState({
    cargoSeekingTransport: [],
    transportSeekingCargo: []
  });

  const processAIResponse = useCallback((response) => {
    const lines = response.split('\n');
    const entry = {};
    
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':').map(s => s.trim());
        entry[key] = value;
      }
    });

    // Add unique ID and timestamp
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      loadingLocation: entry['Yükleme Yeri'] || 'BELİRTİLMEMİŞ',
      unloadingLocation: entry['İndirme Yeri/Yerleri'] || 'BELİRTİLMEMİŞ',
      cargoType: entry['Yük Tipi'] || 'BELİRTİLMEMİŞ',
      vehicleType: entry['Araç Tipi'] || 'BELİRTİLMEMİŞ',
      amount: entry['Tonaj/Miktar'] || 'BELİRTİLMEMİŞ',
      contact: entry['İletişim'] || 'BELİRTİLMEMİŞ',
      extraInfo: entry['Ekstra Bilgi'] || 'BELİRTİLMEMİŞ'
    };

    setEntries(prev => {
      if (entry['Mesaj Tipi']?.includes('CARGO_SEEKING_TRANSPORT')) {
        return {
          ...prev,
          cargoSeekingTransport: [newEntry, ...prev.cargoSeekingTransport]
        };
      } else {
        return {
          ...prev,
          transportSeekingCargo: [newEntry, ...prev.transportSeekingCargo]
        };
      }
    });
  }, []);

  const handleSubmit = async () => {
    if (!inputMessage.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(COLAB_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: [inputMessage] })
      });
      
      const result = await response.json();
      
      if (result.data && result.data[0]) {
        processAIResponse(result.data[0]);
      }
      
      setInputMessage('');
    } catch (error) {
      console.error('Error:', error);
      alert('Bağlantı hatası! Lütfen tekrar deneyin.');
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
