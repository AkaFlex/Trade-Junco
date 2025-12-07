
import React, { useState, useEffect, useMemo } from 'react';
import { TradeRequest, REGIONS, ProductCount, RegionalBudget } from '../types';
import { getAllRequests, updateRequestStatus, saveBudget, checkBudgetAvailability, getAllBudgets } from '../services/tradeService';
import { Check, X, Ban, PieChart as PieIcon, LayoutDashboard, Wallet, ListChecks, AlertTriangle, User, TrendingUp, Loader2, Eye, FileText, Camera, DollarSign, Calendar, Archive, Download, PlayCircle, Clock, MessageCircle, FileSpreadsheet, Pencil, Save as SaveIcon, CheckCircle, XCircle, Shield, ChevronLeft, ChevronRight, BarChart3, GripHorizontal } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { getDoc, doc, updateDoc } from 'firebase/firestore'; 
import { db } from '../firebaseConfig';

// --- HELPER COMPONENTS ---

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-100',
    approved: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100',
    rejected: 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100',
    completed: 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-100',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100',
    blocked_volume: 'bg-gray-100 text-gray-600 border-gray-200 ring-1 ring-gray-100'
  };

  const labels: Record<string, any> = {
    pending: <><Clock size={14} className="mr-1.5"/> Aguardando Aprovação</>,
    approved: <><PlayCircle size={14} className="mr-1.5"/> Em Execução</>,
    rejected: <><XCircle size={14} className="mr-1.5"/> Recusado</>,
    completed: <><FileText size={14} className="mr-1.5"/> Aguardando Pagamento</>,
    paid: <><CheckCircle size={14} className="mr-1.5"/> Pago / Finalizado</>,
    blocked_volume: <><Ban size={14} className="mr-1.5"/> Bloqueado (Volume)</>,
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${styles[status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {labels[status] || status}
    </span>
  );
};

const KPICard = ({ title, value, icon, color }: any) => (
    <div className={`p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between bg-white hover:shadow-md hover:-translate-y-1 transition-all duration-300`}>
        <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-3xl font-extrabold text-gray-800">{value}</h3>
        </div>
        <div className={`p-4 rounded-xl ${color} bg-opacity-20 backdrop-blur-sm`}>
            {icon}
        </div>
    </div>
);

const NavButton = ({ active, onClick, icon, label, count }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition font-medium text-sm border ${active ? 'bg-brand-purple text-white border-brand-purple shadow-lg shadow-purple-200' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50 hover:border-gray-200'}`}
  >
    {icon}
    {label}
    {count !== undefined && count > 0 && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${active ? 'bg-white text-brand-purple' : 'bg-gray-100 text-gray-600'}`}>
            {count}
        </span>
    )}
  </button>
);

export const AdminPanel: React.FC = () => {
  const [requests, setRequests] = useState<TradeRequest[]>([]);
  const [view, setView] = useState<'dashboard' | 'approvals' | 'execution' | 'history' | 'finance' | 'budgets' | 'blocked'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<TradeRequest | null>(null); 
  
  // Rejection Modal State
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Budget States
  const [monthlyBudgets, setMonthlyBudgets] = useState<Record<string, number>>({});
  const [annualBudgets, setAnnualBudgets] = useState<Record<string, number>>({});
  
  // Edit Value State
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const [payingId, setPayingId] = useState<string | null>(null);
  
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [budgetForm, setBudgetForm] = useState({ region: REGIONS[0], month: currentMonthStr, limit: 5000 });
  const [editingBudgetRegion, setEditingBudgetRegion] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadBudgets(currentMonthStr);
  }, []);

  // Reload budgets when month changes in the form
  useEffect(() => {
    if (view === 'budgets') {
        loadBudgets(budgetForm.month);
    }
  }, [budgetForm.month, view]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllRequests();
      setRequests(data.sort((a, b) => b.createdAt - a.createdAt));
    } catch (e) {
      console.error("Erro ao carregar dados", e);
    } finally {
      setLoading(false);
    }
  };

  const loadBudgets = async (month: string) => {
    // 1. Load Monthly Budgets
    const newMonthlyBudgets: Record<string, number> = {};
    for (const r of REGIONS) {
      const safeR = r.trim();
      const safeM = month.trim();
      try {
        const snap = await getDoc(doc(db, "budgets", `${safeR}_${safeM}`));
        newMonthlyBudgets[r] = snap.exists() ? snap.data().limit : 0;
      } catch (e) { console.warn("Erro ao ler orçamento", e); }
    }
    setMonthlyBudgets(newMonthlyBudgets);

    // 2. Load Annual Budgets
    try {
        const year = month.split('-')[0];
        const allBudgets = await getAllBudgets();
        const newAnnualBudgets: Record<string, number> = {};
        
        allBudgets.forEach(b => {
            if (b.month && b.month.startsWith(year)) {
                newAnnualBudgets[b.region] = (newAnnualBudgets[b.region] || 0) + Number(b.limit);
            }
        });
        setAnnualBudgets(newAnnualBudgets);
    } catch (e) {
        console.error("Erro ao calcular orçamentos anuais", e);
    }
  };

  const startEditingValue = (req: TradeRequest) => {
      setEditingValueId(req.id);
      setEditValue(req.totalValue.toString());
  };

  const cancelEditingValue = () => {
      setEditingValueId(null);
      setEditValue('');
  };

  const saveEditingValue = async (req: TradeRequest) => {
      const newValue = Number(editValue);
      if (isNaN(newValue) || newValue < 0) {
          alert("Valor inválido");
          return;
      }

      try {
          const reqRef = doc(db, "requests", req.id);
          await updateDoc(reqRef, { totalValue: newValue });
          
          setRequests(prev => prev.map(r => r.id === req.id ? {...r, totalValue: newValue} : r));
          setEditingValueId(null);
      } catch (e) {
          console.error("Erro ao atualizar valor", e);
          alert("Erro ao salvar novo valor.");
      }
  };

  const handleApprove = async (req: TradeRequest) => {
    if (!req || !req.id) return alert("Erro: ID inválido.");
    
    setApprovingId(req.id);
    
    try {
        console.log("Iniciando aprovação para:", req.id);
        const month = req.dateOfAction && req.dateOfAction.length >= 7 ? req.dateOfAction.slice(0, 7) : currentMonthStr;
        
        let budgetCheck = { allowed: true, message: "" };
        try {
            if (req.dateOfAction) {
                budgetCheck = await checkBudgetAvailability(req.region, month, Number(req.totalValue));
            }
        } catch (err) {
            console.error("Budget Check Falhou (Ignorando):", err);
        }

        if (!budgetCheck.allowed) {
            // alert(`ATENÇÃO: ${budgetCheck.message}`);
             const confirmOverride = window.confirm(`ATENÇÃO: ${budgetCheck.message}\n\nDeseja forçar a aprovação mesmo sem orçamento?`);
             if (!confirmOverride) {
                 setApprovingId(null);
                 return;
             }
        }
        
        await updateRequestStatus(req.id, 'approved');
        setRequests(prev => prev.map(r => r.id === req.id ? {...r, status: 'approved'} : r));
        // alert("✅ Solicitação aprovada com sucesso!");

    } catch (error: any) {
        console.error("ERRO FATAL AO APROVAR:", error);
        alert(`Erro ao salvar no banco de dados: ${error.message}`);
    } finally {
        setApprovingId(null);
    }
  };

  const openRejectModal = (req: TradeRequest) => {
      setRejectingId(req.id);
      setRejectionReason('');
  };

  const confirmReject = async () => {
    if (!rejectingId || !rejectionReason.trim()) return;
    
    setApprovingId(rejectingId); // Reuse loader state
    try {
      await updateRequestStatus(rejectingId, 'rejected', rejectionReason);
      setRequests(prev => prev.map(r => r.id === rejectingId ? {...r, status: 'rejected'} : r));
      setRejectingId(null);
    } catch (e) {
      alert("Erro ao recusar.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleMarkAsPaid = async (req: TradeRequest) => {
    setPayingId(req.id);
    try {
        console.log("Processando pagamento para:", req.id);
        
        // 1. First update the database status (Priority)
        await updateRequestStatus(req.id, 'paid');
        setRequests(prev => prev.map(r => r.id === req.id ? {...r, status: 'paid'} : r));
        
        // 2. Success Feedback
        // alert("✅ Pagamento registrado com sucesso!");

    } catch (e: any) {
        console.error("Erro crítico no pagamento:", e);
        alert(`Erro ao salvar status de pagamento: ${e.message}`);
    } finally {
        setPayingId(null);
    }
  };

  const handleSaveBudget = async (region: string) => {
    try {
        await saveBudget(region as any, budgetForm.month, Number(budgetForm.limit));
        // alert("✅ Orçamento atualizado!");
        loadBudgets(budgetForm.month);
        setEditingBudgetRegion(null);
    } catch (e) {
        alert("Erro ao salvar orçamento.");
    }
  };

  // MEMOIZED LISTS & STATS
  const { 
    pendingRequests, inExecutionRequests, financeRequests, 
    approvedRequests, paidRequests, blockedRequests,
    regionStats, productData 
  } = useMemo(() => {
      const pending = requests.filter(r => r.status === 'pending');
      const inExec = requests.filter(r => r.status === 'approved');
      const finance = requests.filter(r => r.status === 'completed');
      const approved = requests.filter(r => r.status === 'approved' || r.status === 'completed' || r.status === 'paid');
      const paid = requests.filter(r => r.status === 'paid');
      const blocked = requests.filter(r => r.status === 'blocked_volume');

      const stats = REGIONS.map(region => {
        const spent = approved
            .filter(r => r.region === region)
            .reduce((sum, r) => sum + (Number(r.totalValue) || 0), 0);
        return { 
            name: region, 
            spent, 
            limit: monthlyBudgets[region] || 0 
        };
      });

      const counts: Record<string, number> = {};
      approved.forEach(req => {
        if (req.salesReports) {
            req.salesReports.forEach(report => {
                report.products.forEach(prod => {
                    counts[prod.name] = (counts[prod.name] || 0) + prod.qty;
                });
            });
        }
      });
      const pData = Object.entries(counts)
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty);

      return {
          pendingRequests: pending,
          inExecutionRequests: inExec,
          financeRequests: finance,
          approvedRequests: approved,
          paidRequests: paid,
          blockedRequests: blocked,
          regionStats: stats,
          productData: pData
      };
  }, [requests, monthlyBudgets]);

  const handleExport = () => {
    let content = `
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th { background-color: #6B21A8; color: white; padding: 10px; text-align: left; border: 1px solid #ddd; }
          td { padding: 8px; border: 1px solid #ddd; color: #333; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .title { font-size: 18px; font-weight: bold; margin-bottom: 20px; color: #6B21A8; }
          .section { margin-top: 30px; margin-bottom: 10px; font-weight: bold; font-size: 16px; background: #eee; padding: 5px; }
        </style>
      </head>
      <body>
    `;

    if (view === 'dashboard') {
        content += `
          <div class="title">Relatório Gerencial - Junco Trade</div>
          
          <div class="section">1. Resumo Geral</div>
          <table>
            <tr>
               <th>KPI</th>
               <th>Valor</th>
            </tr>
            <tr><td>Total Investido</td><td>R$ ${approvedRequests.reduce((acc, r) => acc + Number(r.totalValue), 0).toFixed(2)}</td></tr>
            <tr><td>Solicitações Pendentes</td><td>${pendingRequests.length}</td></tr>
            <tr><td>Solicitações Aprovadas</td><td>${approvedRequests.length}</td></tr>
          </table>

          <div class="section">2. Orçamento vs Realizado</div>
          <table>
            <tr>
              <th>Região</th>
              <th>Limite (R$)</th>
              <th>Gasto (R$)</th>
              <th>Disponível (R$)</th>
              <th>% Uso</th>
            </tr>
            ${regionStats.map(s => `
              <tr>
                <td>${s.name}</td>
                <td>${s.limit.toFixed(2)}</td>
                <td>${s.spent.toFixed(2)}</td>
                <td>${(s.limit - s.spent).toFixed(2)}</td>
                <td>${s.limit > 0 ? ((s.spent/s.limit)*100).toFixed(1) : 0}%</td>
              </tr>
            `).join('')}
          </table>

          <div class="section">3. Performance de Produtos (Sell-Out)</div>
          <table>
            <tr>
              <th>Produto</th>
              <th>Qtd Vendida</th>
            </tr>
            ${productData.map(p => `
              <tr>
                <td>${p.name}</td>
                <td>${p.qty}</td>
              </tr>
            `).join('')}
          </table>
        `;
    } else {
        const getList = () => {
            switch(view) {
                case 'approvals': return pendingRequests;
                case 'execution': return inExecutionRequests;
                case 'finance': return financeRequests;
                case 'history': return paidRequests;
                case 'blocked': return blockedRequests;
                default: return requests;
            }
        };
        const list = getList();
        const titleMap: any = {
            approvals: 'Solicitações Pendentes de Aprovação',
            execution: 'Solicitações em Execução (Aprovadas)',
            finance: 'Solicitações Aguardando Pagamento',
            history: 'Histórico de Solicitações Pagas',
            blocked: 'Solicitações Bloqueadas'
        };

        content += `<div class="title">${titleMap[view] || 'Relatório de Solicitações'}</div>`;
        content += `
          <table>
            <thead>
              <tr>
                <th>Data Pedido</th>
                <th>Data Ação</th>
                <th>RCA</th>
                <th>Parceiro</th>
                <th>Região</th>
                <th>Valor (R$)</th>
                <th>Status</th>
                <th>PIX Key</th>
                <th>Banco/Titular</th>
                <th>Evidências</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(r => `
                <tr>
                  <td>${r.orderDate ? new Date(r.orderDate).toLocaleDateString() : '-'}</td>
                  <td>${new Date(r.dateOfAction).toLocaleDateString()}</td>
                  <td>${r.rcaName} (${r.rcaEmail})</td>
                  <td>${r.partnerCode}</td>
                  <td>${r.region}</td>
                  <td>${Number(r.totalValue).toFixed(2)}</td>
                  <td>${r.status}</td>
                  <td>${r.pixKey || '-'}</td>
                  <td>${r.pixHolder || '-'}</td>
                  <td>
                    ${(r.photoUrls || []).map(u => `<a href="${u}">Foto</a>`).join(', ')} 
                    ${(r.receiptUrls || []).map(u => `<a href="${u}">Comp</a>`).join(', ')}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
    }

    content += `</body></html>`;

    const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_Junco_${view}_${new Date().toISOString().slice(0,10)}.xls`;
    a.click();
  };

  const COLORS = ['#FF8042', '#00C49F', '#FFBB28', '#0088FE', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
             <Shield className="text-brand-purple" size={32}/> Painel de Gestão
           </h1>
           <p className="text-gray-500 font-medium">Administração de Verbas e Aprovações</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleExport}
                className="bg-green-700 text-white px-5 py-2.5 rounded-xl hover:bg-green-800 transition shadow-lg hover:shadow-green-200 flex items-center gap-2 font-bold text-sm"
            >
                <FileSpreadsheet size={18} /> Exportar Excel
            </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap gap-3 mb-8 bg-white p-2.5 rounded-2xl shadow-sm border border-gray-100 sticky top-0 z-10 backdrop-blur-md bg-white/90">
        <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={18} />} label="Visão Geral" />
        <NavButton active={view === 'approvals'} onClick={() => setView('approvals')} icon={<ListChecks size={18} />} label="Aprovações" count={pendingRequests.length} />
        <NavButton active={view === 'execution'} onClick={() => setView('execution')} icon={<PlayCircle size={18} />} label="Em Execução" count={inExecutionRequests.length} />
        <NavButton active={view === 'finance'} onClick={() => setView('finance')} icon={<Wallet size={18} />} label="Financeiro" count={financeRequests.length} />
        <NavButton active={view === 'history'} onClick={() => setView('history')} icon={<Archive size={18} />} label="Histórico" />
        <NavButton active={view === 'budgets'} onClick={() => setView('budgets')} icon={<DollarSign size={18} />} label="Orçamentos" />
        <NavButton active={view === 'blocked'} onClick={() => setView('blocked')} icon={<Ban size={18} />} label="Bloqueios" count={blockedRequests.length} />
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-brand-purple" size={48} />
        </div>
      )}

      {!loading && view === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KPICard title="Total Investido" value={`R$ ${approvedRequests.reduce((acc, r) => acc + Number(r.totalValue), 0).toLocaleString('pt-BR')}`} icon={<TrendingUp size={28} className="text-purple-600"/>} color="bg-purple-50" />
            <KPICard title="Pendentes" value={pendingRequests.length} icon={<Clock size={28} className="text-yellow-600"/>} color="bg-yellow-50" />
            <KPICard title="Em Execução" value={inExecutionRequests.length} icon={<PlayCircle size={28} className="text-blue-600"/>} color="bg-blue-50" />
            <KPICard title="Finalizados" value={paidRequests.length} icon={<CheckCircle size={28} className="text-green-600"/>} color="bg-green-50" />
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
             {/* Chart: Budget vs Spent */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-w-0">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Investimento por Região</h3>
                <div className="h-72 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionStats}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                        <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                        <Tooltip 
                            cursor={{ fill: '#f9fafb' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                        />
                        <Bar dataKey="spent" name="Gasto" fill="#6B21A8" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="limit" name="Limite" fill="#E5E7EB" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                    </ResponsiveContainer>
                </div>
             </div>

             {/* Chart: Product Mix */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-w-0">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Mix de Solicitações (Região)</h3>
                <div className="h-72 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={regionStats.filter(r => r.spent > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="spent"
                        >
                            {regionStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                    </ResponsiveContainer>
                </div>
             </div>
          </div>

          {/* New Chart: Product Sell-Out Performance */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-w-0">
             <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Archive className="text-brand-purple" size={20}/> Performance de Produtos (Sell-Out)
             </h3>
             <p className="text-sm text-gray-500 mb-4">Quantidade total vendida reportada nas ações.</p>
             <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={productData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={120} fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: '#f3f4f6' }} />
                      <Bar dataKey="qty" fill="#B91C1C" radius={[0, 4, 4, 0]} barSize={20}>
                        {productData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index < 3 ? '#B91C1C' : '#6B21A8'} />
                        ))}
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      )}

      {/* APPROVALS VIEW */}
      {!loading && view === 'approvals' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <ListChecks className="text-brand-purple" /> Solicitações Pendentes
            </h2>
            <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full border border-yellow-200">{pendingRequests.length} pendentes</span>
          </div>
          
          {pendingRequests.length === 0 ? (
            <div className="p-16 text-center text-gray-400">
                <CheckCircle size={64} className="mx-auto mb-4 text-gray-200" />
                <p className="text-lg font-medium">Nenhuma solicitação pendente.</p>
                <p className="text-sm opacity-70">Bom trabalho!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs tracking-wider border-b border-gray-200">
                        <tr>
                            <th className="p-4 pl-6">RCA / Solicitante</th>
                            <th className="p-4">Detalhes Ação</th>
                            <th className="p-4">Parceiro</th>
                            <th className="p-4">Região</th>
                            <th className="p-4">Valor</th>
                            <th className="p-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {pendingRequests.map(req => (
                            <tr key={req.id} className="hover:bg-purple-50/20 transition group">
                                <td className="p-4 pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                                            {req.rcaName.substring(0,2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800">{req.rcaName}</div>
                                            <div className="text-xs text-gray-500">{req.rcaEmail}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="font-medium text-gray-900 flex items-center gap-1.5">
                                        <Calendar size={14} className="text-gray-400"/> {new Date(req.dateOfAction).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">{req.days} dia(s) • {req.justification || 'Sem justificativa'}</div>
                                </td>
                                <td className="p-4 font-bold text-gray-600">{req.partnerCode}</td>
                                <td className="p-4">
                                    <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded text-xs font-bold border border-gray-200">{req.region}</span>
                                </td>
                                <td className="p-4 font-bold text-gray-800">
                                    {editingValueId === req.id ? (
                                        <div className="flex items-center gap-1 bg-white border rounded p-1 shadow-sm">
                                            <input 
                                                type="number" 
                                                className="w-20 outline-none text-sm"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                autoFocus
                                            />
                                            <button onClick={() => saveEditingValue(req)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={14}/></button>
                                            <button onClick={cancelEditingValue} className="text-red-600 hover:bg-red-50 p-1 rounded"><X size={14}/></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => startEditingValue(req)}>
                                            <span>R$ {Number(req.totalValue).toLocaleString('pt-BR')}</span>
                                            <Pencil size={12} className="opacity-0 group-hover:opacity-100 text-gray-400"/>
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button 
                                            onClick={() => setSelectedRequest(req)}
                                            className="text-gray-400 hover:text-brand-purple hover:bg-purple-50 p-2 rounded-lg transition"
                                            title="Ver Detalhes"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleApprove(req)}
                                            disabled={approvingId === req.id}
                                            className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition shadow-sm font-bold flex items-center gap-1.5 text-xs disabled:opacity-50"
                                        >
                                            {approvingId === req.id ? <Loader2 className="animate-spin" size={14}/> : <Check size={14} />} 
                                            Aprovar
                                        </button>
                                        <button 
                                            onClick={() => openRejectModal(req)}
                                            disabled={approvingId === req.id}
                                            className="bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition font-bold text-xs"
                                        >
                                            Recusar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          )}
        </div>
      )}

      {/* EXECUTION VIEW (APPROVED) */}
      {!loading && view === 'execution' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
           <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <PlayCircle className="text-brand-purple" /> Em Execução (Aguardando RCA)
            </h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">{inExecutionRequests.length} ações</span>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs tracking-wider border-b border-gray-200">
                    <tr>
                        <th className="p-4 pl-6">Solicitação</th>
                        <th className="p-4">Parceiro</th>
                        <th className="p-4">Região</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {inExecutionRequests.map(req => (
                        <tr key={req.id} className="hover:bg-gray-50 transition">
                            <td className="p-4 pl-6">
                                <div className="font-bold text-gray-800">{new Date(req.dateOfAction).toLocaleDateString()}</div>
                                <div className="text-xs text-gray-400">RCA: {req.rcaName}</div>
                            </td>
                            <td className="p-4 font-bold text-gray-600">{req.partnerCode}</td>
                            <td className="p-4">{req.region}</td>
                            <td className="p-4"><StatusBadge status={req.status}/></td>
                            <td className="p-4 text-center">
                                <button 
                                    onClick={() => setSelectedRequest(req)}
                                    className="text-gray-400 hover:text-brand-purple p-2 rounded-lg hover:bg-purple-50 transition"
                                >
                                    <Eye size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
             </table>
           </div>
        </div>
      )}

      {/* FINANCE VIEW (COMPLETED) */}
      {!loading && view === 'finance' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Wallet className="text-brand-purple" /> Financeiro (A Pagar)
            </h2>
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full">{financeRequests.length} a pagar</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs tracking-wider border-b border-gray-200">
                    <tr>
                        <th className="p-4 pl-6">RCA</th>
                        <th className="p-4">Chave PIX</th>
                        <th className="p-4">Titular/CPF</th>
                        <th className="p-4 text-center">Valor</th>
                        <th className="p-4 text-center">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {financeRequests.map(req => (
                        <tr key={req.id} className="hover:bg-gray-50 transition">
                            <td className="p-4 pl-6">
                                <div className="font-bold text-gray-800">{req.rcaName}</div>
                                <div className="text-xs text-gray-400">{req.rcaEmail}</div>
                            </td>
                            <td className="p-4 font-mono text-purple-700 bg-purple-50 px-2 py-1 rounded w-fit select-all text-xs">
                                {req.pixKey}
                            </td>
                            <td className="p-4">
                                <div className="font-medium text-gray-800">{req.pixHolder}</div>
                                <div className="text-xs text-gray-400">{req.pixCpf}</div>
                            </td>
                            <td className="p-4 text-center font-bold text-lg text-gray-800">
                                R$ {Number(req.totalValue).toLocaleString('pt-BR')}
                            </td>
                            <td className="p-4 text-center">
                                <div className="flex justify-center gap-2">
                                    <button 
                                        onClick={() => setSelectedRequest(req)}
                                        className="text-gray-400 hover:text-brand-purple p-2 rounded-lg hover:bg-purple-50 transition"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleMarkAsPaid(req)}
                                        disabled={payingId === req.id}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-sm font-bold flex items-center gap-2 disabled:opacity-50 text-xs"
                                    >
                                        {payingId === req.id ? <Loader2 className="animate-spin" size={14}/> : <DollarSign size={14} />}
                                        PAGAR
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HISTORY VIEW */}
      {!loading && view === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
           <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Archive className="text-brand-purple" /> Histórico de Pagamentos
            </h2>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs tracking-wider border-b border-gray-200">
                    <tr>
                        <th className="p-4 pl-6">Data Ação</th>
                        <th className="p-4">RCA</th>
                        <th className="p-4">Parceiro</th>
                        <th className="p-4">Região</th>
                        <th className="p-4">Valor</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-center">Detalhes</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {paidRequests.map(req => (
                        <tr key={req.id} className="hover:bg-gray-50 transition">
                            <td className="p-4 pl-6 text-gray-600">{new Date(req.dateOfAction).toLocaleDateString()}</td>
                            <td className="p-4 font-bold text-gray-800">{req.rcaName}</td>
                            <td className="p-4 text-gray-600">{req.partnerCode}</td>
                            <td className="p-4">{req.region}</td>
                            <td className="p-4 font-bold text-green-700">R$ {Number(req.totalValue).toFixed(2)}</td>
                            <td className="p-4"><StatusBadge status={req.status}/></td>
                            <td className="p-4 text-center">
                                <button 
                                    onClick={() => setSelectedRequest(req)}
                                    className="text-gray-400 hover:text-brand-purple p-2 rounded-lg hover:bg-purple-50 transition"
                                >
                                    <Eye size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
             </table>
           </div>
        </div>
      )}

      {/* BUDGETS VIEW */}
      {!loading && view === 'budgets' && (
        <div className="space-y-6 animate-in fade-in">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <DollarSign className="text-brand-purple" /> Gestão de Orçamentos
                    </h2>
                    <p className="text-sm text-gray-500">Defina os limites mensais por região.</p>
                 </div>
                 <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-xl border border-gray-200">
                    <button className="p-2 hover:bg-white rounded-lg transition" onClick={() => {
                        const d = new Date(budgetForm.month + '-01');
                        d.setMonth(d.getMonth() - 1);
                        setBudgetForm({...budgetForm, month: d.toISOString().slice(0, 7)});
                    }}><ChevronLeft size={20}/></button>
                    <input 
                        type="month" 
                        className="bg-transparent font-bold text-gray-800 outline-none cursor-pointer"
                        value={budgetForm.month}
                        onChange={(e) => setBudgetForm({...budgetForm, month: e.target.value})}
                    />
                    <button className="p-2 hover:bg-white rounded-lg transition" onClick={() => {
                        const d = new Date(budgetForm.month + '-01');
                        d.setMonth(d.getMonth() + 1);
                        setBudgetForm({...budgetForm, month: d.toISOString().slice(0, 7)});
                    }}><ChevronRight size={20}/></button>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {regionStats.map((stat, idx) => {
                    const annualLimit = annualBudgets[stat.name] || 0;
                    const percentUsed = stat.limit > 0 ? (stat.spent / stat.limit) * 100 : 0;
                    const isEditing = editingBudgetRegion === stat.name;

                    return (
                        <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition group relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1 h-full ${percentUsed > 100 ? 'bg-red-500' : percentUsed > 80 ? 'bg-yellow-500' : 'bg-brand-purple'}`}></div>
                            
                            <div className="flex justify-between items-start mb-4 pl-3">
                                <h3 className="font-bold text-gray-800 text-lg">{stat.name}</h3>
                                <button 
                                    onClick={() => {
                                        setEditingBudgetRegion(stat.name);
                                        setBudgetForm(prev => ({...prev, limit: stat.limit}));
                                    }}
                                    className="text-gray-300 hover:text-brand-purple transition"
                                >
                                    <Pencil size={16}/>
                                </button>
                            </div>

                            <div className="pl-3 space-y-4">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Mensal ({budgetForm.month})</p>
                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number"
                                                className="w-full border rounded p-1 text-sm"
                                                value={budgetForm.limit}
                                                onChange={(e) => setBudgetForm({...budgetForm, limit: Number(e.target.value)})}
                                                autoFocus
                                            />
                                            <button onClick={() => handleSaveBudget(stat.name)} className="text-green-600 bg-green-50 p-1 rounded"><Check size={16}/></button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-end">
                                            <span className="text-2xl font-bold text-gray-800">R$ {stat.limit.toLocaleString('pt-BR')}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1 font-medium">
                                        <span className={percentUsed > 100 ? 'text-red-600' : 'text-gray-600'}>
                                            Gasto: R$ {stat.spent.toLocaleString('pt-BR')}
                                        </span>
                                        <span className={percentUsed > 100 ? 'text-red-600 font-bold' : 'text-gray-400'}>
                                            {percentUsed.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${percentUsed > 100 ? 'bg-red-500' : percentUsed > 80 ? 'bg-yellow-400' : 'bg-brand-purple'}`} 
                                            style={{ width: `${Math.min(percentUsed, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-50">
                                    <p className="text-xs text-gray-400 flex justify-between">
                                        <span>Orçamento Anual</span>
                                        <span className="font-bold text-gray-600">R$ {annualLimit.toLocaleString('pt-BR')}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
             </div>
        </div>
      )}

      {/* BLOCKED VIEW */}
      {!loading && view === 'blocked' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
           <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Ban className="text-brand-purple" /> Solicitações Bloqueadas
            </h2>
            <span className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">{blockedRequests.length} bloqueios</span>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs tracking-wider border-b border-gray-200">
                    <tr>
                        <th className="p-4 pl-6">Data Tentativa</th>
                        <th className="p-4">RCA</th>
                        <th className="p-4">Motivo Bloqueio</th>
                        <th className="p-4 text-center">Detalhes</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {blockedRequests.map(req => (
                        <tr key={req.id} className="hover:bg-gray-50 transition">
                            <td className="p-4 pl-6 text-gray-600">{new Date(req.dateOfAction).toLocaleDateString()}</td>
                            <td className="p-4 font-bold text-gray-800">{req.rcaName} ({req.rcaEmail})</td>
                            <td className="p-4 text-red-600 font-medium bg-red-50/50">{req.rejectionReason}</td>
                            <td className="p-4 text-center">
                                <button 
                                    onClick={() => setSelectedRequest(req)}
                                    className="text-gray-400 hover:text-brand-purple p-2 rounded-lg hover:bg-purple-50 transition"
                                >
                                    <Eye size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
             </table>
           </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="text-red-500"/> Recusar Solicitação
                    </h3>
                    <button onClick={() => setRejectingId(null)} className="text-gray-400 hover:text-gray-600"><X/></button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                    Por favor, informe o motivo da recusa para que o RCA possa corrigir.
                </p>
                <textarea 
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none mb-4"
                    rows={4}
                    placeholder="Ex: Valor incorreto, Data indisponível..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    autoFocus
                ></textarea>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setRejectingId(null)} className="px-4 py-2 text-gray-600 font-bold text-sm hover:bg-gray-100 rounded-lg">Cancelar</button>
                    <button 
                        onClick={confirmReject}
                        disabled={!rejectionReason.trim()}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                        Confirmar Recusa
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* FULL DETAILS MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="bg-brand-purple p-4 flex justify-between items-center text-white sticky top-0 z-10">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <FileText size={20}/> Detalhes da Solicitação
                    </h3>
                    <button onClick={() => setSelectedRequest(null)} className="hover:bg-white/20 p-1 rounded"><X/></button>
                </div>
                
                <div className="p-6 space-y-8">
                    {/* Header Info */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Parceiro: {selectedRequest.partnerCode}</h2>
                            <p className="text-gray-500">{selectedRequest.region}</p>
                            <div className="mt-2 flex gap-2">
                                <StatusBadge status={selectedRequest.status} />
                                {selectedRequest.days > 0 && (
                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">{selectedRequest.days} dia(s) de ação</span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-xs text-gray-400 uppercase font-bold">Valor Aprovado</div>
                             <div className="text-3xl font-bold text-brand-purple">R$ {Number(selectedRequest.totalValue).toLocaleString('pt-BR')}</div>
                        </div>
                    </div>

                    {/* RCA Info */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><User size={16}/> Dados do RCA</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="block text-gray-400 text-xs uppercase">Nome</span>
                                <span className="font-medium">{selectedRequest.rcaName}</span>
                            </div>
                            <div>
                                <span className="block text-gray-400 text-xs uppercase">Email</span>
                                <span className="font-medium">{selectedRequest.rcaEmail}</span>
                            </div>
                            <div>
                                <span className="block text-gray-400 text-xs uppercase">WhatsApp</span>
                                <span className="font-medium">{selectedRequest.rcaPhone}</span>
                            </div>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                         <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                             <span className="block text-blue-400 text-xs uppercase font-bold mb-1">Data do Pedido (Lançamento)</span>
                             <span className="text-lg font-bold text-blue-800">
                                 {selectedRequest.orderDate ? new Date(selectedRequest.orderDate).toLocaleDateString() : 'N/A'}
                             </span>
                         </div>
                         <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                             <span className="block text-purple-400 text-xs uppercase font-bold mb-1">Data da Ação (Execução)</span>
                             <span className="text-lg font-bold text-purple-800">
                                 {new Date(selectedRequest.dateOfAction).toLocaleDateString()}
                             </span>
                         </div>
                    </div>

                    {/* Finance Data */}
                    {(selectedRequest.status === 'completed' || selectedRequest.status === 'paid') && (
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                             <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2"><Wallet size={16}/> Dados Bancários (PIX)</h4>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="block text-green-600 text-xs uppercase">Chave PIX</span>
                                    <span className="font-bold text-green-900 font-mono select-all">{selectedRequest.pixKey}</span>
                                </div>
                                <div>
                                    <span className="block text-green-600 text-xs uppercase">Titular</span>
                                    <span className="font-medium text-green-900">{selectedRequest.pixHolder}</span>
                                </div>
                                <div>
                                    <span className="block text-green-600 text-xs uppercase">CPF</span>
                                    <span className="font-medium text-green-900">{selectedRequest.pixCpf}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Evidence Links */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Camera size={16}/> Fotos da Ação</h4>
                            <div className="flex flex-wrap gap-2">
                                {(selectedRequest.photoUrls && selectedRequest.photoUrls.length > 0) ? (
                                    selectedRequest.photoUrls.map((url, i) => (
                                        <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm text-blue-600 border border-gray-200">
                                            <Eye size={14}/> Ver Foto {i+1}
                                        </a>
                                    ))
                                ) : selectedRequest.photoUrl ? (
                                    <a href={selectedRequest.photoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm text-blue-600 border border-gray-200">
                                        <Eye size={14}/> Ver Foto
                                    </a>
                                ) : <span className="text-gray-400 text-sm italic">Nenhuma foto enviada.</span>}
                            </div>
                        </div>
                        <div>
                             <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><FileText size={16}/> Comprovantes</h4>
                             <div className="flex flex-wrap gap-2">
                                {(selectedRequest.receiptUrls && selectedRequest.receiptUrls.length > 0) ? (
                                    selectedRequest.receiptUrls.map((url, i) => (
                                        <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm text-blue-600 border border-gray-200">
                                            <Eye size={14}/> Ver Nota {i+1}
                                        </a>
                                    ))
                                ) : selectedRequest.receiptUrl ? (
                                    <a href={selectedRequest.receiptUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm text-blue-600 border border-gray-200">
                                        <Eye size={14}/> Ver Nota
                                    </a>
                                ) : <span className="text-gray-400 text-sm italic">Nenhum comprovante.</span>}
                             </div>
                        </div>
                    </div>

                    {/* Sales Reports Table */}
                    {selectedRequest.salesReports && selectedRequest.salesReports.length > 0 && (
                        <div>
                            <h4 className="font-bold text-gray-700 mb-3 border-b pb-2">Relatórios de Execução (Sell-Out)</h4>
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 uppercase font-bold">
                                        <tr>
                                            <th className="p-3">Data</th>
                                            <th className="p-3">Loja</th>
                                            <th className="p-3">Nome Vendedor</th>
                                            <th className="p-3">Produtos Vendidos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {selectedRequest.salesReports.map((rep, idx) => (
                                            <tr key={idx}>
                                                <td className="p-3">{new Date(rep.date).toLocaleDateString()}</td>
                                                <td className="p-3 font-medium">{rep.storeName}</td>
                                                <td className="p-3">{rep.sellerName}</td>
                                                <td className="p-3">
                                                    <ul className="list-disc ml-4 text-xs text-gray-600">
                                                        {rep.products.filter(p => p.qty > 0).map(p => (
                                                            <li key={p.name}><strong>{p.qty}x</strong> {p.name}</li>
                                                        ))}
                                                    </ul>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t rounded-b-2xl flex justify-end">
                    <button onClick={() => setSelectedRequest(null)} className="bg-gray-800 text-white px-6 py-2 rounded hover:bg-black font-bold">FECHAR</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
