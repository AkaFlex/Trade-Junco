
import React, { useState } from 'react';
import { UserProfile, REGIONS } from '../types';
import { createRequest } from '../services/tradeService';
import { AlertTriangle, Ban, AlertCircle, User, Phone, Mail, Calendar, Clock, Store, FileSpreadsheet } from 'lucide-react';

interface Props {
  user: UserProfile;
  onCancel: () => void;
  onSuccess: (email: string) => void;
}

export const RequestWizard: React.FC<Props> = ({ user, onCancel, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [materialStatus, setMaterialStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [volumeStatus, setVolumeStatus] = useState<'pending' | 'success' | 'failed'>('pending');

  const [formData, setFormData] = useState({
    rcaName: '',
    rcaEmail: '',
    rcaPhone: '',
    partnerCode: '',
    orderDate: '', // Data do Pedido
    date: '',      // Data da Ação
    region: REGIONS[0],
    days: 1,
    justification: '',
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    setFormData({ ...formData, rcaPhone: value });
  };

  // SILENT BLOCKING LOGIC
  const triggerSilentBlock = async () => {
    if (!formData.rcaName || !formData.rcaEmail) {
        alert("Por favor, preencha seus dados de contato antes de responder.");
        return;
    }

    const date = new Date().toISOString().split('T')[0];
    const partner = "Não Informado"; // Bloqueio na etapa inicial
    const region = formData.region; // Default region

    try {
      setLoading(true);
      await createRequest({
       uid: user.uid,
       rcaName: formData.rcaName,
       rcaEmail: formData.rcaEmail,
       rcaPhone: formData.rcaPhone,
       createdAt: Date.now(),
       partnerCode: partner,
       region: region,
       dateOfAction: date,
       days: 0,
       totalValue: 0,
       status: 'blocked_volume',
       rejectionReason: 'Volume de Doceria abaixo de R$ 5.000 (Auto-bloqueio inicial)'
      });
      setVolumeStatus('failed');
    } catch (err) {
      console.error("Silent block failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    // 1. STRICT VALIDATION
    if (!formData.rcaName.trim()) return alert("Nome do RCA é obrigatório.");
    if (!formData.rcaEmail.trim()) return alert("E-mail do RCA é obrigatório.");
    if (!formData.rcaPhone.trim()) return alert("Telefone do RCA é obrigatório.");
    
    if (!formData.partnerCode.trim()) return alert("Código do Parceiro é obrigatório.");
    if (!formData.region) return alert("Região é obrigatória.");
    
    if (!formData.orderDate) return alert("Data do Pedido é obrigatória.");
    if (!formData.date) return alert("Data da Ação é obrigatória.");
    
    if (formData.days < 1) return alert("Quantidade de dias inválida.");
    
    // Justification Check
    if (formData.days > 1 && !formData.justification.trim()) {
        return alert("Para ações com mais de 1 dia, a justificativa é obrigatória.");
    }

    // 2. 5-DAY LOCK CHECK
    const actionDate = new Date(formData.date);
    const today = new Date();
    // Reset hours to compare only dates
    today.setHours(0,0,0,0);
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 5);

    if (actionDate < minDate) {
        alert("A Data da Ação deve ser solicitada com no mínimo 5 dias de antecedência.");
        return;
    }

    setLoading(true);
    try {
      const req = {
        uid: user.uid,
        rcaName: formData.rcaName,
        rcaEmail: formData.rcaEmail,
        rcaPhone: formData.rcaPhone,
        createdAt: Date.now(),
        partnerCode: formData.partnerCode,
        region: formData.region,
        orderDate: formData.orderDate, // Data do Pedido
        dateOfAction: formData.date,   // Data da Ação
        days: formData.days,
        justification: formData.justification,
        totalValue: formData.days * 150, // Calculated but hidden from RCA
        status: 'pending' as const,
      };

      await createRequest(req);
      alert("Solicitação enviada com sucesso!");
      onSuccess(formData.rcaEmail);
    } catch (e) {
      console.error(e);
      alert("Erro ao criar solicitação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl max-w-3xl mx-auto overflow-hidden my-4">
      <div className="bg-brand-red p-4 text-white flex justify-between items-center">
        <h2 className="font-bold text-lg">Nova Solicitação de Ação</h2>
        <button onClick={onCancel} className="text-white/80 hover:text-white">Fechar</button>
      </div>

      <div className="p-6 md:p-8">
        
        {/* STEP 1: MATERIAL CHECK */}
        {step === 1 && (
          <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-gray-800">Verificação de Material</h2>
            <p className="text-lg text-gray-600">Você possui a <span className="font-bold text-brand-red">Bandeja</span> e o <span className="font-bold text-brand-red">Avental</span> oficiais?</p>
            
            {materialStatus === 'failed' && (
              <div className="bg-red-50 border-l-4 border-red-500 p-6 text-left rounded shadow-sm my-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-red-600 shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-red-800 mb-2">Solicitação Necessária</h4>
                    <p className="text-red-700 text-sm leading-relaxed mb-2">
                      Para solicitar a bandeja e avental para a degustação é necessário solicitar no sistema <strong>Vidya</strong>.
                    </p>
                    <p className="text-red-700 text-sm leading-relaxed">
                      Vincule <strong>CONCESSÃO PROMOÇÃO (TOP. 241)</strong> no pedido:
                    </p>
                    <ul className="list-disc ml-5 mt-2 text-red-800 font-bold text-sm">
                      <li>Cod 199307 - AVENTAL DEGUSTACAO</li>
                      <li>Cod 291765 - BANDEJA DEGUSTACAO</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4 pt-4">
              <button 
                onClick={() => setMaterialStatus('failed')}
                className={`px-8 py-4 rounded-xl font-bold transition text-lg w-32 ${materialStatus === 'failed' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                NÃO
              </button>
              <button 
                onClick={() => { setMaterialStatus('success'); setStep(2); }}
                className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-green-700 shadow-lg text-lg w-32"
              >
                SIM
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DETAILS & VOLUME CHECK */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            
            {/* If blocked, show this and nothing else */}
            {volumeStatus === 'failed' ? (
               <div className="text-center py-10">
                  <div className="inline-flex bg-red-100 p-6 rounded-full text-red-600 mb-4">
                    <Ban size={48} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Ação Indisponível</h2>
                  <p className="text-gray-500 max-w-md mx-auto">
                    O volume de compras em Doceria é insuficiente para realizar ações de Trade Marketing neste momento.
                  </p>
                  <button onClick={onCancel} className="mt-8 text-gray-400 underline hover:text-gray-600">Fechar</button>
               </div>
            ) : (
              <>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-2">
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                        <User size={16}/> Dados do Solicitante
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Completo *</label>
                            <input 
                                className="w-full bg-white border border-gray-200 p-2 rounded focus:ring-2 focus:ring-brand-red outline-none"
                                value={formData.rcaName}
                                onChange={e => setFormData({...formData, rcaName: e.target.value})}
                                placeholder="Seu nome"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">E-mail *</label>
                            <input 
                                type="email"
                                className="w-full bg-white border border-gray-200 p-2 rounded focus:ring-2 focus:ring-brand-red outline-none"
                                value={formData.rcaEmail}
                                onChange={e => setFormData({...formData, rcaEmail: e.target.value})}
                                placeholder="seu.email@junco.com.br"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">WhatsApp *</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-3 top-3 text-gray-400"/>
                                <input 
                                    className="w-full bg-white border border-gray-200 p-2 pl-10 rounded focus:ring-2 focus:ring-brand-red outline-none"
                                    value={formData.rcaPhone}
                                    onChange={handlePhoneChange}
                                    placeholder="(XX) XXXXX-XXXX"
                                    maxLength={15}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* THE GATEKEEPER QUESTION - NOW COMES FIRST */}
                <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl">
                  <h3 className="font-bold text-yellow-900 text-lg mb-2 flex items-center gap-2">
                    <AlertCircle size={20}/> Validação de Volume
                  </h3>
                  <p className="text-yellow-800 mb-6 text-sm">
                    Este parceiro comprou <strong>R$ 5.000,00</strong> ou mais em produtos da categoria <strong>DOCERIA</strong> no mês da ação?
                  </p>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={triggerSilentBlock}
                      className="flex-1 py-4 rounded-lg font-bold border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 transition"
                    >
                      NÃO
                    </button>
                    <button 
                      onClick={() => setVolumeStatus('success')}
                      className={`flex-1 py-4 rounded-lg font-bold border transition shadow-md ${volumeStatus === 'success' ? 'bg-green-700 text-white border-green-700 ring-2 ring-green-400' : 'bg-green-600 text-white border-green-600 hover:bg-green-700'}`}
                    >
                      SIM
                    </button>
                  </div>
                </div>

                {/* FIELDS THAT APPEAR ONLY AFTER VALIDATION */}
                {volumeStatus === 'success' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 pt-4 mt-6">
                    
                    {/* PARTNER AND REGION */}
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código do Parceiro *</label>
                        <div className="relative">
                            <Store size={16} className="absolute left-3 top-3.5 text-gray-400"/>
                            <input 
                              className="w-full bg-gray-50 border border-gray-200 p-3 pl-10 rounded-lg focus:ring-2 focus:ring-brand-red outline-none text-lg font-bold text-gray-800"
                              value={formData.partnerCode}
                              onChange={e => setFormData({...formData, partnerCode: e.target.value})}
                              placeholder="000000"
                              required
                            />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Região *</label>
                        <select 
                          className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-brand-red outline-none"
                          value={formData.region}
                          onChange={e => setFormData({...formData, region: e.target.value as any})}
                          required
                        >
                          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Calendar size={18} className="text-brand-red" /> Detalhes da Ação
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data do Pedido de Doces *</label>
                                <div className="relative">
                                  <FileSpreadsheet size={16} className="absolute left-3 top-3.5 text-gray-400"/>
                                  <input 
                                    type="date"
                                    className="w-full bg-white border border-gray-200 p-3 pl-10 rounded-lg focus:ring-2 focus:ring-brand-red outline-none"
                                    value={formData.orderDate}
                                    onChange={e => setFormData({...formData, orderDate: e.target.value})}
                                    required
                                  />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Prevista da Ação *</label>
                                <div className="relative">
                                  <Clock size={16} className="absolute left-3 top-3.5 text-gray-400"/>
                                  <input 
                                    type="date"
                                    className="w-full bg-white border border-gray-200 p-3 pl-10 rounded-lg focus:ring-2 focus:ring-brand-red outline-none"
                                    value={formData.date}
                                    onChange={e => setFormData({...formData, date: e.target.value})}
                                    required
                                  />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">*Mínimo 5 dias de antecedência</p>
                            </div>
                        </div>

                        <div className="mb-4">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dias de Ação *</label>
                                <input 
                                type="number"
                                min="1" max="5"
                                className="w-full bg-white border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-brand-red outline-none"
                                value={formData.days}
                                onChange={e => setFormData({...formData, days: Number(e.target.value)})}
                                required
                                />
                        </div>

                        {formData.days > 1 && (
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 text-blue-600">Justificativa Obrigatória (Mais de 1 dia) *</label>
                            <textarea 
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                rows={3}
                                placeholder="Descreva o motivo da ação estendida..."
                                value={formData.justification}
                                onChange={e => setFormData({...formData, justification: e.target.value})}
                                required={formData.days > 1}
                            ></textarea>
                        </div>
                        )}

                        <button 
                        onClick={handleCreate}
                        disabled={loading}
                        className="w-full bg-brand-red text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-red-800 transition transform hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0"
                        >
                        {loading ? "Processando..." : "FINALIZAR SOLICITAÇÃO"}
                        </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
