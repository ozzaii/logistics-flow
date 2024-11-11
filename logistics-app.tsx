import React, { useState } from 'react';
import { Search } from 'lucide-react';

const LogisticsApp = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState({
    cargoSeekingTransport: [],
    transportSeekingCargo: []
  });

  // Function to process AI response and update tables
  const processAIResponse = (response) => {
    const lines = response.split('\n');
    const entry = {};
    
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':').map(s => s.trim());
        entry[key] = value;
      }
    });

    if (entry['Mesaj Tipi']?.includes('CARGO_SEEKING_TRANSPORT')) {
      setEntries(prev => ({
        ...prev,
        cargoSeekingTransport: [...prev.cargoSeekingTransport, {
          id: Date.now(),
          loadingLocation: entry['Yükleme Yeri'] || 'BELİRTİLMEMİŞ',
          unloadingLocation: entry['İndirme Yeri/Yerleri'] || 'BELİRTİLMEMİŞ',
          cargoType: entry['Yük Tipi'] || 'BELİRTİLMEMİŞ',
          vehicleType: entry['Araç Tipi'] || 'BELİRTİLMEMİŞ',
          amount: entry['Tonaj/Miktar'] || 'BELİRTİLMEMİŞ',
          contact: entry['İletişim'] || 'BELİRTİLMEMİŞ',
          extraInfo: entry['Ekstra Bilgi'] || 'BELİRTİLMEMİŞ',
          timestamp: new Date().toISOString()
        }]
      }));
    } else {
      setEntries(prev => ({
        ...prev,
        transportSeekingCargo: [...prev.transportSeekingCargo, {
          id: Date.now(),
          loadingLocation: entry['Yükleme Yeri'] || 'BELİRTİLMEMİŞ',
          unloadingLocation: entry['İndirme Yeri/Yerleri'] || 'BELİRTİLMEMİŞ',
          cargoType: entry['Yük Tipi'] || 'BELİRTİLMEMİŞ',
          vehicleType: entry['Araç Tipi'] || 'BELİRTİLMEMİŞ',
          amount: entry['Tonaj/Miktar'] || 'BELİRTİLMEMİŞ',
          contact: entry['İletişim'] || 'BELİRTİLMEMİŞ',
          extraInfo: entry['Ekstra Bilgi'] || 'BELİRTİLMEMİŞ',
          timestamp: new Date().toISOString()
        }]
      }));
    }
  };

  // Function to submit message to Gradio interface
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('YOUR_COLAB_NGROK_URL', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: [inputMessage] })
      });
      
      const result = await response.json();
      processAIResponse(result.data[0]);
      setInputMessage('');
    } catch (error) {
      console.error('Error:', error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold text-center mb-8">Lojistik Mesaj İşlemcisi</h1>
        
        {/* Input Area */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Lojistik mesajını buraya yapıştırın..."
            className="w-full h-32 p-4 border rounded-lg mb-4 resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-lg text-white font-medium ${
              isLoading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isLoading ? 'İşleniyor...' : 'Mesajı İşle'}
          </button>
        </div>

        {/* Dashboard Component */}
        <LogisticsDashboard 
          cargoSeekingTransport={entries.cargoSeekingTransport}
          transportSeekingCargo={entries.transportSeekingCargo}
        />
      </div>
    </div>
  );
};

export default LogisticsApp;