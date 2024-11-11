import React, { useState } from 'react';
import { Search } from 'lucide-react';

const LogisticsDashboard = ({ cargoSeekingTransport, transportSeekingCargo }) => {
  const [activeTab, setActiveTab] = useState('transport');
  const [selectedEntry, setSelectedEntry] = useState(null);

  const DetailModal = ({ entry, onClose }) => {
    if (!entry) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Detaylı Bilgi</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Yükleme Yeri</h4>
              <p className="text-gray-600">{entry.loadingLocation}</p>
            </div>
            <div>
              <h4 className="font-medium">İndirme Yeri</h4>
              <p className="text-gray-600">{entry.unloadingLocation}</p>
            </div>
            <div>
              <h4 className="font-medium">Yük Tipi</h4>
              <p className="text-gray-600">{entry.cargoType}</p>
            </div>
            <div>
              <h4 className="font-medium">Araç Tipi</h4>
              <p className="text-gray-600">{entry.vehicleType}</p>
            </div>
            <div>
              <h4 className="font-medium">Miktar</h4>
              <p className="text-gray-600">{entry.amount}</p>
            </div>
            <div>
              <h4 className="font-medium">İletişim</h4>
              <p className="text-gray-600">{entry.contact}</p>
            </div>
            <div>
              <h4 className="font-medium">Ek Bilgi</h4>
              <p className="text-gray-600">{entry.extraInfo}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TableView = ({ data }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Yükleme
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Boşaltma
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Araç Tipi
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Miktar
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((entry) => (
            <tr 
              key={entry.id} 
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelectedEntry(entry)}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {entry.loadingLocation}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {entry.unloadingLocation}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {entry.vehicleType}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {entry.amount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('transport')}
                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'transport'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Araç Arayanlar
              </button>
              <button
                onClick={() => setActiveTab('cargo')}
                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'cargo'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Yük Arayanlar
              </button>
            </nav>
          </div>
        </div>
        
        {/* Content */}
        <div className="mt-6">
          {activeTab === 'transport' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Araç Arayanlar</h2>
              <TableView data={cargoSeekingTransport} />
            </div>
          )}
          
          {activeTab === 'cargo' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Yük Arayanlar</h2>
              <TableView data={transportSeekingCargo} />
            </div>
          )}
        </div>
      </div>

      {selectedEntry && (
        <DetailModal 
          entry={selectedEntry} 
          onClose={() => setSelectedEntry(null)} 
        />
      )}
    </div>
  );
};

export default LogisticsDashboard;
