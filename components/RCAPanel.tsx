
import React, { useState, useEffect } from 'react';
import { TradeRequest, UserProfile } from '../types';
import { getRequestsByUser } from '../services/tradeService';
import { RequestWizard } from './RequestWizard';
import { ExecutionView } from './ExecutionView';
import { PlusCircle, FileText, CheckCircle, AlertCircle, Clock, XCircle, Search, History, Ban, Calendar, Store, DollarSign, FileSpreadsheet, Check, Eye } from 'lucide-react';

interface Props {
  user: UserProfile;
}

export const RCAPanel: React.FC<Props> = ({ user }) => {
  const [requests, setRequests] = useState<TradeRequest[]>([]);
  const [mode, setMode] = useState<'list' | 'new' | 'execution'>('list');
  const [selectedRequest, setSelectedRequest] = useState<TradeRequest | null>(null);
  
  const [searchEmail, setSearchEmail] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('junco_rca_email');
    if (savedEmail) {
      setSearchEmail(savedEmail);
    }
  }, []);

  const fetchRequests = async (email: string) => {
    if (!email) return;
    localStorage.setItem('junco_rca_email', email.trim());
    const data = await getRequestsByUser(email);
    setRequests(data.sort((a, b) => b.createdAt - a.createdAt));
    setSearched(true);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchRequests(searchEmail);
  };

  const handleOpenExecution = (req: TradeRequest) => {
    setSelectedRequest(req);
    setMode('execution');
  };

  if (mode === 'new') {
    return <RequestWizard 
        user={user} 
        onCancel={() => setMode('list')} 
        onSuccess={(email) => {
            setMode('list');
            setSearchEmail(email);
            fetchRequests(email);
        }} 
    />;
  }

  if (mode === 'execution' && selectedRequest) {
    return <ExecutionView request={selectedRequest} onBack={() => setMode('list')} />;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-brand-red to-red-800 rounded-2xl p-8 text-white shadow-xl mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Painel de Ações</h1>
          <p className="text-red-100 opacity-90">Crie novas solicitações de trade marketing ou acompanhe seus pedidos.</p>
        </div>
        <button 
          onClick={() => setMode('new')}
          className="bg-white text-brand-red px-8 py-4 rounded-xl flex items-center gap-3 hover:bg-gray-100 transition shadow-lg transform hover:-translate-y-1 font-bold text-lg"
        >
          <PlusCircle size={24} />
          NOVA SOLICITAÇÃO
        </button>
      </div>

      {/* History Search Section */}
      <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4 text-gray-700">
           <History className="text-brand-red" />
           <h2 className="text-lg font-bold">Consultar Histórico</h2>
        </div>
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
          <input 
            type="email" 
            placeholder="Digite o e-mail usado na solicitação..."
            className="flex-1 border p-3 rounded-lg focus:ring-2 focus:ring-brand-red outline-none"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
          />
          <button type="submit" className="bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-black transition font-bold flex items-center justify-center gap-2">
            <Search size={20} /> BUSCAR
          </button>
        </form>
        {searched && requests.length > 0 && (
             <p className="text-xs text-gray-400 mt-2 ml-1">Mostrando resultados para: {searchEmail}</p>
        )}
      </div>

      <div className="grid gap-4">
        {!searched ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
             <p className="text-gray-400">Utilize a busca acima para encontrar solicitações anteriores.</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-300 mb-4">
              <Clock size={48} className="mx-auto" />
            </div>
            <p className="text-gray-500 font-medium">Nenhuma solicitação encontrada para <span className="text-gray-800 font-bold">{searchEmail}</span>.</p>
          </div>
        ) : (
          requests.map(req => (
            <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-brand-red/30 transition-all duration-200 group relative overflow-hidden">
               {/* Status Color Strip */}
               <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                 req.status === 'paid' ? 'bg-emerald-500' :
                 req.status === 'approved' ? 'bg-blue-500' :
                 req.status === 'rejected' ? 'bg-red-500' :
                 req.status === 'completed' ? 'bg-purple-500' :
                 req.status === 'blocked_volume' ? 'bg-gray-400' :
                 'bg-yellow-400'
               }`}></div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pl-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                     <span className="font-bold text-gray-800 text-lg">
                      {req.partnerCode}
                     </span>
                     <span className="text-gray-400 text-sm font-medium bg-gray-50 px-2 py-0.5 rounded">{req.region}</span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1.5" title="Data Prevista da Ação">
                      <Clock size={14} className="text-gray-400"/>
                      <span className="text-gray-700">{new Date(req.dateOfAction).toLocaleDateString()}</span>
                    </div>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-1.5">
                      <span>{req.days} dia(s) de ação</span>
                    </div>
                    {req.orderDate && (
                      <>
                        <span className="text-gray-300">•</span>
                        <div className="flex items-center gap-1.5" title="Data do Pedido">
                           <FileSpreadsheet size={14} className="text-gray-400"/>
                           <span className="text-gray-700">Pedido: {new Date(req.orderDate).toLocaleDateString()}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {req.rejectionReason && (
                    <div className="mt-2 flex items-start gap-2 bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-100 max-w-lg">
                      <AlertCircle size={14} className="mt-0.5 shrink-0"/>
                      <span><strong>Motivo:</strong> {req.rejectionReason}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-end gap-3 min-w-[140px]">
                  <StatusBadge status={req.status} />

                  {(req.status === 'approved' || req.status === 'completed') && (
                    <button 
                      onClick={() => handleOpenExecution(req)}
                      className={`text-sm px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm w-full justify-center font-bold ${req.status === 'approved' ? 'bg-brand-red text-white hover:bg-red-800' : 'bg-gray-800 text-white hover:bg-black'}`}
                    >
                      {req.status === 'approved' ? (
                          <><FileText size={16} /> Relatórios</>
                      ) : (
                          <><Eye size={16} /> Ver Detalhes</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-100',
    approved: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100',
    rejected: 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100',
    completed: 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-100',
    paid: 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-1 ring-emerald-600',
    blocked_volume: 'bg-gray-100 text-gray-600 border-gray-200 ring-1 ring-gray-100'
  };

  const labels: Record<string, any> = {
    pending: <><Clock size={14}/> Aguardando Aprovação</>,
    approved: <><CheckCircle size={14}/> Aprovado</>,
    rejected: <><XCircle size={14}/> Recusado</>,
    completed: <><FileText size={14}/> Aguardando Pagamento</>,
    paid: <><Check size={16} strokeWidth={3} /> PAGO</>,
    blocked_volume: <><Ban size={14}/> Bloqueado</>,
  };

  return (
    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${styles[status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {labels[status] || status}
    </span>
  );
};
