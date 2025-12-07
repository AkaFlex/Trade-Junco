
import React, { useState, useMemo } from 'react';
import { getRequestsByPartner } from '../services/tradeService';
import { TradeRequest, PRODUCTS_LIST, SalesReport, ProductCount } from '../types';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Search, Store, Calendar, Save, CheckCircle, ArrowLeft, AlertCircle, Lock } from 'lucide-react';

export const PromoterPanel: React.FC = () => {
  const [partnerCode, setPartnerCode] = useState('');
  const [requests, setRequests] = useState<TradeRequest[]>([]);
  const [searched, setSearched] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TradeRequest | null>(null);

  // Form State
  const [storeName, setStoreName] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [counts, setCounts] = useState<ProductCount[]>(PRODUCTS_LIST.map(p => ({ name: p, qty: 0 })));

  // Helper to check date string (YYYY-MM-DD)
  const isReportedToday = (req: TradeRequest) => {
      if (!req.salesReports || req.salesReports.length === 0) return false;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      return req.salesReports.some(r => {
          // Handle both ISO strings and potential YYYY-MM-DD strings
          const reportDate = r.date.includes('T') ? r.date.split('T')[0] : r.date;
          return reportDate === today;
      });
  };

  // Check if a report has already been submitted today for this request (Detail View)
  const hasReportedToday = useMemo(() => {
      if (!selectedRequest) return false;
      return isReportedToday(selectedRequest);
  }, [selectedRequest]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerCode) return;
    const data = await getRequestsByPartner(partnerCode);
    setRequests(data);
    setSearched(true);
    setSelectedRequest(null);
  };

  const handleQtyChange = (idx: number, delta: number) => {
    const newCounts = [...counts];
    newCounts[idx].qty = Math.max(0, newCounts[idx].qty + delta);
    setCounts(newCounts);
  };

  const submitReport = async () => {
    if (!selectedRequest) return;
    if (!storeName) return alert("Informe o nome da loja.");
    if (!sellerName) return alert("Informe o nome do vendedor.");
    
    // Safety check again
    if (hasReportedToday) return alert("Relatório já enviado hoje.");

    const newReport: SalesReport = {
      date: new Date().toISOString(),
      storeName: storeName,
      sellerName: sellerName,
      products: counts.filter(c => c.qty > 0)
    };

    try {
      const refDoc = doc(db, "requests", selectedRequest.id);
      await updateDoc(refDoc, {
        salesReports: arrayUnion(newReport)
      });
      
      alert(`✅ Relatório salvo com sucesso!`);
      
      // Update local state to show it immediately (locking the form)
      const updatedReq = { 
          ...selectedRequest, 
          salesReports: [...(selectedRequest.salesReports || []), newReport] 
      };
      
      // Update both the selected request and the list of requests
      setSelectedRequest(updatedReq);
      setRequests(prev => prev.map(r => r.id === updatedReq.id ? updatedReq : r));
      
      // Reset form
      setStoreName('');
      setSellerName('');
      setCounts(PRODUCTS_LIST.map(p => ({ name: p, qty: 0 })));

    } catch (e) {
      console.error(e);
      alert("Erro ao salvar relatório.");
    }
  };

  if (selectedRequest) {
      return (
          <div className="max-w-3xl mx-auto p-4 md:p-8">
              <button onClick={() => setSelectedRequest(null)} className="flex items-center gap-2 text-gray-500 hover:text-pink-600 mb-6 font-bold">
                  <ArrowLeft size={20}/> Voltar para Lista
              </button>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Relatório de Sell-Out</h2>
                  <p className="text-gray-500">Preencha os dados da ação realizada no parceiro <strong>{selectedRequest.partnerCode}</strong>.</p>
                  
                  <div className="mt-4 flex gap-4 text-sm bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-pink-500"/>
                          <span className="font-bold text-gray-700">Data Ação: {new Date(selectedRequest.dateOfAction).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <Store size={16} className="text-pink-500"/>
                          <span className="font-bold text-gray-700">Região: {selectedRequest.region}</span>
                      </div>
                  </div>
              </div>

              {/* DUPLICATE REPORT CHECK */}
              {hasReportedToday ? (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center mb-8 shadow-sm">
                      <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle size={32} className="text-green-600"/>
                      </div>
                      <h3 className="text-xl font-bold text-green-800 mb-2">Relatório do Dia Enviado</h3>
                      <p className="text-green-700 mb-6">Você já preencheu o relatório de Sell-Out para esta ação hoje.</p>
                      <button disabled className="bg-gray-200 text-gray-500 px-6 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto cursor-not-allowed">
                          <Lock size={18}/> Concluído
                      </button>
                  </div>
              ) : (
                  <div className="bg-white rounded-2xl shadow-lg border border-pink-100 overflow-hidden">
                      <div className="bg-pink-600 p-4 text-white font-bold text-lg flex items-center gap-2">
                          <Save size={20}/> Novo Relatório
                      </div>
                      <div className="p-6">
                          <div className="grid md:grid-cols-2 gap-4 mb-6">
                              <div>
                                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome da Loja</label>
                                  <input 
                                    className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                                    value={storeName}
                                    onChange={e => setStoreName(e.target.value)}
                                    placeholder="Ex: Supermercado X"
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Vendedor</label>
                                  <input 
                                    className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                                    value={sellerName}
                                    onChange={e => setSellerName(e.target.value)}
                                    placeholder="Nome Completo"
                                  />
                              </div>
                          </div>

                          <div className="mb-8">
                              <h4 className="text-sm font-bold text-gray-600 mb-3 uppercase border-b pb-2">Vendas do Dia (Unidades)</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {counts.map((item, idx) => (
                                      <div key={item.name} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 hover:border-pink-200 transition">
                                          <span className="text-sm font-bold text-gray-700">{item.name}</span>
                                          <div className="flex items-center gap-3">
                                              <button 
                                                onClick={() => handleQtyChange(idx, -1)}
                                                className="w-8 h-8 bg-white border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100 font-bold shadow-sm"
                                              >-</button>
                                              <span className="w-8 text-center text-lg font-bold text-pink-700">{item.qty}</span>
                                              <button 
                                                onClick={() => handleQtyChange(idx, 1)}
                                                className="w-8 h-8 bg-pink-600 text-white rounded-full hover:bg-pink-700 font-bold shadow-md"
                                              >+</button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>

                          <button 
                            onClick={submitReport}
                            className="w-full bg-pink-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-pink-700 transition transform hover:-translate-y-1"
                          >
                              SALVAR RELATÓRIO
                          </button>
                      </div>
                  </div>
              )}
              
              {/* History */}
              {selectedRequest.salesReports && selectedRequest.salesReports.length > 0 && (
                  <div className="mt-8">
                      <h3 className="font-bold text-gray-500 uppercase text-sm mb-4">Histórico de Envios</h3>
                      <div className="space-y-3">
                        {selectedRequest.salesReports.map((r, i) => (
                            <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-gray-800">{r.storeName}</div>
                                    <div className="text-xs text-gray-500">Vendedor: {r.sellerName} • {new Date(r.date).toLocaleDateString()}</div>
                                </div>
                                <div className="text-green-600 flex items-center gap-1 font-bold text-sm">
                                    <CheckCircle size={16}/> Enviado
                                </div>
                            </div>
                        ))}
                      </div>
                  </div>
              )}
          </div>
      );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="bg-pink-600 text-white p-8 rounded-3xl shadow-xl mb-8 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
         <h1 className="text-3xl font-extrabold mb-2 relative z-10">Painel da Degustadora</h1>
         <p className="text-pink-100 relative z-10">Busque pela loja para preencher seus relatórios de venda.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <form onSubmit={handleSearch} className="flex gap-4">
            <input 
                className="flex-1 border-2 border-gray-100 bg-gray-50 p-4 rounded-xl font-bold text-lg text-gray-700 placeholder-gray-400 focus:border-pink-500 focus:bg-white outline-none transition"
                placeholder="Digite o Código do Parceiro..."
                value={partnerCode}
                onChange={e => setPartnerCode(e.target.value)}
            />
            <button className="bg-gray-900 text-white px-8 rounded-xl font-bold hover:bg-black transition flex items-center gap-2">
                <Search size={20}/> BUSCAR
            </button>
        </form>
      </div>

      {searched && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="font-bold text-gray-400 uppercase text-xs tracking-wider">Ações Encontradas</h3>
              {requests.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-gray-400">
                      Nenhuma solicitação aprovada encontrada para este parceiro.
                  </div>
              ) : (
                  requests.map(req => {
                      const alreadyReported = isReportedToday(req);
                      return (
                          <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group hover:border-pink-200 transition">
                              <div>
                                  <div className="font-bold text-xl text-gray-800 mb-1">{req.region}</div>
                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                      <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(req.dateOfAction).toLocaleDateString()}</span>
                                      <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold text-gray-600">{req.days} dia(s)</span>
                                  </div>
                                  <div className="text-xs text-pink-600 mt-2 font-medium">RCA: {req.rcaName}</div>
                              </div>
                              {alreadyReported ? (
                                  <button disabled className="bg-green-100 text-green-700 px-6 py-3 rounded-xl font-bold cursor-not-allowed flex items-center gap-2">
                                      <CheckCircle size={18}/> JÁ ENVIADO
                                  </button>
                              ) : (
                                  <button 
                                    onClick={() => setSelectedRequest(req)}
                                    className="bg-pink-50 text-pink-600 px-6 py-3 rounded-xl font-bold hover:bg-pink-600 hover:text-white transition shadow-sm"
                                  >
                                      PREENCHER
                                  </button>
                              )}
                          </div>
                      );
                  })
              )}
          </div>
      )}
    </div>
  );
};
