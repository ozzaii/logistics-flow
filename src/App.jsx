import React, { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import LogisticsDashboard from './components/LogisticsDashboard';

// Updated API configuration
const BASE_URL = "https://ef9c-34-126-184-39.ngrok-free.app";
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
      
      // Extract the assistant's response content
      let analysisText;
      if (Array.isArray(response)) {
        // Find the assistant's message in the array
        const assistantMessage = response.find(msg => msg.role === 'assistant');
        analysisText = assistantMessage?.content || '';
      } else {
        analysisText = response;
      }

      // Parse the analysis text into an object
      const entry = {};
      const lines = analysisText.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':').map(s => s.trim());
          if (key && value) {
            // Remove the numbering from the key
            const cleanKey = key.replace(/^\d+\.\s*/, '');
            entry[cleanKey] = value;
          }
        }
      });

      // Create new entry with the parsed data
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

      // Update entries based on message type
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

    } catch (error) {
      console.error('Error processing AI response:', error);
      console.error('Raw response was:', response);
      alert('AI yanıtı işlenirken hata oluştu! Lütfen konsolu kontrol edin.');
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
        />
      </div>
    </div>
  );
};

export default App;
