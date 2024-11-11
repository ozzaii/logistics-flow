import React from 'react';
import { Truck, Package, Calendar, MapPin, Info, Weight } from 'lucide-react';

const EntryCard = ({ entry }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-blue-50/30 cursor-pointer border border-transparent hover:border-blue-200">
      <div className="flex flex-col gap-4">
        {/* Message Type Badge */}
        <div className="flex justify-between items-center">
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${
            entry.messageType?.includes('CARGO_SEEKING_TRANSPORT')
              ? 'bg-purple-100 text-purple-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {entry.messageType?.includes('CARGO_SEEKING_TRANSPORT') ? 'Yük İlanı' : 'Araç İlanı'}
          </span>
          <div className="flex items-center text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
            <Calendar className="w-4 h-4 mr-1.5" />
            {new Date(entry.timestamp).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        {/* Location Info */}
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Güzergah</p>
            <p className="font-semibold text-gray-800">
              {entry.loadingLocation}
              <span className="mx-2 text-blue-500">→</span>
              {entry.unloadingLocation}
            </p>
          </div>
        </div>

        {/* Cargo/Vehicle Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Yük Tipi</p>
              <p className="font-medium text-gray-800">{entry.cargoType || 'BELİRTİLMEMİŞ'}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Truck className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Araç Tipi</p>
              <p className="font-medium text-gray-800">{entry.vehicleType || 'BELİRTİLMEMİŞ'}</p>
            </div>
          </div>
        </div>

        {/* Amount/Tonnage Info */}
        <div className="flex items-start gap-3">
          <Weight className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Tonaj/Miktar</p>
            <p className="font-medium text-gray-800">{entry.amount || 'BELİRTİLMEMİŞ'}</p>
          </div>
        </div>

        {/* Contact Info */}
        {entry.contact && (
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">İletişim</p>
              <p className="font-medium text-gray-800">{entry.contact}</p>
            </div>
          </div>
        )}

        {/* Extra Info */}
        {entry.extraInfo && (
          <div className="mt-2 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-600 leading-relaxed">{entry.extraInfo}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const LogisticsDashboard = ({ cargoSeekingTransport, transportSeekingCargo }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Cargo Seeking Transport */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-semibold">Yük İlanları</h2>
          <span className="ml-auto bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
            {cargoSeekingTransport.length}
          </span>
        </div>
        <div className="space-y-4">
          {cargoSeekingTransport.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      </div>

      {/* Transport Seeking Cargo */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-semibold">Araç Arayanlar</h2>
          <span className="ml-auto bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
            {transportSeekingCargo.length}
          </span>
        </div>
        <div className="space-y-4">
          {transportSeekingCargo.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LogisticsDashboard;
