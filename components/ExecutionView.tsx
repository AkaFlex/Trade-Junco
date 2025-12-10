
import React, { useState, useEffect } from 'react';
import { TradeRequest } from '../types';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Camera, ArrowLeft, UploadCloud, CheckCircle, Clock, Image as ImageIcon, Lock, Wallet, User, AlertTriangle } from 'lucide-react';

interface Props {
  request: TradeRequest;
  onBack: () => void;
}

export const ExecutionView: React.FC<Props> = ({ request: initialRequest, onBack }) => {
  const [request, setRequest] = useState<TradeRequest>(initialRequest);
  
  const [pixData, setPixData] = useState({ 
      key: initialRequest.pixKey || '', 
      holder: initialRequest.pixHolder || '', 
      cpf: initialRequest.pixCpf || '' 
  });
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(initialRequest.photoUrls || (initialRequest.photoUrl ? [initialRequest.photoUrl] : []));
  const [uploadedReceipts, setUploadedReceipts] = useState<string[]>(initialRequest.receiptUrls || (initialRequest.receiptUrl ? [initialRequest.receiptUrl] : []));

  const isReadOnly = request.status === 'completed' || request.status === 'paid';

  useEffect(() => {
    const fetchLatest = async () => {
        try {
            const docRef = doc(db, "requests", initialRequest.id);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = { id: snap.id, ...snap.data() } as TradeRequest;
                setRequest(data);
                
                const photos = data.photoUrls || (data.photoUrl ? [data.photoUrl] : []);
                const receipts = data.receiptUrls || (data.receiptUrl ? [data.receiptUrl] : []);
                
                setUploadedPhotos(photos);
                setUploadedReceipts(receipts);

                if(data.pixKey) setPixData(p => ({...p, key: data.pixKey!}));
                if(data.pixHolder) setPixData(p => ({...p, holder: data.pixHolder!}));
                if(data.pixCpf) setPixData(p => ({...p, cpf: data.pixCpf!}));
            }
        } catch (e) {
            console.error("Erro ao atualizar dados da solicitação", e);
        }
    };
    fetchLatest();
  }, [initialRequest.id]);

  const currentReports = request.salesReports || [];
  
  // NEW LOGIC: Lock until ALL days are reported
  const requiredDays = request.days || 1;
  const submittedReportsCount = currentReports.length;
  const isWorkFinished = submittedReportsCount >= requiredDays;
  
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    
    if (v.length > 9) {
      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (v.length > 6) {
      v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (v.length > 3) {
      v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    
    setPixData({...pixData, cpf: v});
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'receipt') => {
    if (isReadOnly) return;
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    setUploadProgress(0);

    const files: File[] = Array.from(e.target.files);
    let completed = 0;
    const total = files.length;
    const uploadedUrls: string[] = [];

    files.forEach(file => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('key', 'c761300e7b06cd74bcb411a077aa2abe'); 

        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://api.imgbb.com/1/upload');

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && total === 1) {
                const p = (event.loaded / event.total) * 100;
                setUploadProgress(p);
            }
        };

        xhr.onload = async () => {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    const url = response.data.url;
                    uploadedUrls.push(url);
                    
                    const field = type === 'photo' ? 'photoUrls' : 'receiptUrls';
                    await updateDoc(doc(db, "requests", request.id), { 
                        [field]: arrayUnion(url) 
                    });

                    completed++;
                    setUploadProgress((completed / total) * 100);

                    if (completed === total) {
                         if (type === 'photo') {
                             setUploadedPhotos(prev => [...prev, ...uploadedUrls]);
                         } else {
                             setUploadedReceipts(prev => [...prev, ...uploadedUrls]);
                         }
                         setUploading(false);
                         alert(`${total} arquivo(s) enviado(s) com sucesso!`);
                    }

                } catch (err: any) {
                    console.error("Erro processamento", err);
                }
            } else {
                console.error("Erro upload", xhr.responseText);
                completed++;
                if (completed === total) setUploading(false);
            }
        };

        xhr.onerror = () => {
            alert("Erro de conexão.");
            completed++;
            if (completed === total) setUploading(false);
        };

        xhr.send(formData);
    });
  };

  const finishRequest = async () => {
    const hasPhoto = uploadedPhotos.length > 0;
    const hasReceipt = uploadedReceipts.length > 0;

    if (!hasPhoto) return alert("Erro: Pelo menos uma Foto da Ação é obrigatória.");
    if (!hasReceipt) return alert("Erro: Pelo menos um Comprovante/Nota Fiscal é obrigatório.");
    if (!pixData.key) return alert("Preencha a chave PIX.");
    if (!pixData.holder) return alert("Preencha o titular do PIX.");
    if (!pixData.cpf) return alert("Preencha o CPF do titular.");

    try {
        await updateDoc(doc(db, "requests", request.id), {
            pixKey: pixData.key,
            pixHolder: pixData.holder,
            pixCpf: pixData.cpf,
            status: 'completed'
        });
        alert("Solicitação finalizada! Aguardando pagamento pelo setor financeiro.");
        onBack();
    } catch (e) {
        alert("Erro ao finalizar solicitação.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition">
          <ArrowLeft size={24} className="text-gray-700"/>
        </button>
        <div>
           <div className="flex flex-wrap items-center gap-2">
             <h1 className="text-xl md:text-2xl font-bold text-white bg-brand-red px-4 py-1 rounded-lg inline-block">Execução da Ação</h1>
             {isReadOnly && (
                 <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                     <Lock size={12}/> Travado
                 </span>
             )}
           </div>
           <p className="text-gray-500 text-sm mt-1">Parceiro: {request.partnerCode} | Região: {request.region}</p>
        </div>
      </div>

      {isReadOnly && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-yellow-600 shrink-0" size={24} />
              <div>
                <p className="text-yellow-800 font-bold">Solicitação Finalizada</p>
                <p className="text-yellow-700 text-sm">
                    Você já enviou todos os dados. O processo está agora aguardando pagamento pelo setor financeiro.
                </p>
              </div>
            </div>
          </div>
      )}

      {/* LOCK SCREEN: WAITING FOR PROMOTER */}
      {!isReadOnly && !isWorkFinished && (
          <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-8 text-center animate-in fade-in">
              <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <User size={40} className="text-red-500"/>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Aguardando Degustadora</h2>
              <p className="text-gray-500 max-w-lg mx-auto mb-6">
                  Esta ação foi solicitada para <strong>{requiredDays} dias</strong>. <br/>
                  A degustadora precisa enviar os relatórios de todos os dias para liberar o seu financeiro.
              </p>
              
              {/* PROGRESS BAR */}
              <div className="max-w-xs mx-auto mb-6">
                 <div className="flex justify-between text-xs font-bold text-gray-400 mb-1">
                     <span>Progresso</span>
                     <span>{submittedReportsCount} / {requiredDays} dias</span>
                 </div>
                 <div className="w-full bg-gray-100 rounded-full h-3">
                     <div className="bg-red-500 h-3 rounded-full transition-all duration-500" style={{width: `${Math.min((submittedReportsCount/requiredDays)*100, 100)}%`}}></div>
                 </div>
              </div>

              <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg text-gray-600 text-sm font-bold">
                  <Lock size={16}/> Financeiro Bloqueado
              </div>
          </div>
      )}

      {/* FINANCE & EVIDENCE VIEW */}
      {(isWorkFinished || isReadOnly) && (
      <div className="animate-in fade-in space-y-6">
          
          {/* Read Only view of Sell-Out Reports */}
          {currentReports.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h4 className="font-bold text-gray-700 mb-3 border-b pb-2 flex items-center gap-2">
                      <CheckCircle size={18} className="text-green-600"/>
                      Relatórios de Sell-Out ({submittedReportsCount}/{requiredDays} dias)
                  </h4>
                  <div className="space-y-3">
                      {currentReports.map((r, i) => (
                          <div key={i} className="flex flex-col md:flex-row justify-between items-start md:items-center text-sm bg-gray-50 p-3 rounded-lg gap-2">
                              <div>
                                  <div className="font-bold text-gray-800">{r.storeName}</div>
                                  <div className="text-xs text-gray-500">{new Date(r.date).toLocaleDateString()} • Vendedor: {r.sellerName}</div>
                              </div>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold shrink-0">Enviado</span>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0"><Clock size={20}/></div>
              <div>
                  <p className="text-blue-800 text-sm font-medium leading-relaxed">
                     Preencha os dados PIX para reembolso e anexe as fotos (JPG/PNG). 
                     Você pode selecionar várias fotos de uma vez.
                  </p>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 uppercase text-sm flex items-center gap-2">
                  <Wallet size={16}/> Dados Bancários (Para Reembolso)
              </h3>
              <div className="space-y-4">
                  <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">Chave PIX</label>
                      <input 
                        className="w-full border p-3 rounded-lg mt-1 focus:ring-2 focus:ring-brand-red outline-none disabled:bg-gray-100 disabled:text-gray-500"
                        value={pixData.key}
                        onChange={e => setPixData({...pixData, key: e.target.value})}
                        disabled={isReadOnly}
                      />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="text-xs font-bold text-gray-400 uppercase">Nome Titular</label>
                          <input 
                            className="w-full border p-3 rounded-lg mt-1 focus:ring-2 focus:ring-brand-red outline-none disabled:bg-gray-100 disabled:text-gray-500"
                            value={pixData.holder}
                            onChange={e => setPixData({...pixData, holder: e.target.value})}
                            disabled={isReadOnly}
                          />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-400 uppercase">CPF Titular</label>
                          <input 
                            className="w-full border p-3 rounded-lg mt-1 focus:ring-2 focus:ring-brand-red outline-none disabled:bg-gray-100 disabled:text-gray-500"
                            value={pixData.cpf}
                            onChange={handleCpfChange}
                            maxLength={14}
                            disabled={isReadOnly}
                          />
                      </div>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* PHOTOS UPLOAD */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-dashed relative">
                  <div className="text-center">
                      <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-500">
                          <Camera size={24} />
                      </div>
                      <h4 className="font-bold text-gray-700">Foto da Ação</h4>
                      <p className="text-xs text-gray-400 mb-4">Selecione todas as fotos da ação</p>
                      
                      {!isReadOnly && (
                          <label className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold cursor-pointer transition text-sm inline-block w-full">
                              Selecionar Fotos
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                multiple
                                onChange={(e) => handleFileUpload(e, 'photo')}
                              />
                          </label>
                      )}

                      {uploadedPhotos.length > 0 && (
                          <div className="mt-4 text-left space-y-2 max-h-40 overflow-y-auto">
                              <p className="text-xs font-bold text-green-600 mb-1 flex items-center gap-1">
                                  <CheckCircle size={12}/> {uploadedPhotos.length} fotos enviadas
                              </p>
                              {uploadedPhotos.map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block text-xs text-blue-500 hover:underline truncate">
                                      <ImageIcon size={10} className="inline mr-1"/> Foto {i + 1}
                                  </a>
                              ))}
                          </div>
                      )}
                  </div>
              </div>

              {/* RECEIPTS UPLOAD */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-dashed relative">
                  <div className="text-center">
                      <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-500">
                          <UploadCloud size={24} />
                      </div>
                      <h4 className="font-bold text-gray-700">Comprovante</h4>
                      <p className="text-xs text-gray-400 mb-4">Notas Fiscais de custos</p>
                      
                      {!isReadOnly && (
                          <label className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold cursor-pointer transition text-sm inline-block w-full">
                              Selecionar Arquivos
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                multiple
                                onChange={(e) => handleFileUpload(e, 'receipt')}
                              />
                          </label>
                      )}

                      {uploadedReceipts.length > 0 && (
                          <div className="mt-4 text-left space-y-2 max-h-40 overflow-y-auto">
                              <p className="text-xs font-bold text-green-600 mb-1 flex items-center gap-1">
                                  <CheckCircle size={12}/> {uploadedReceipts.length} arquivos enviados
                              </p>
                              {uploadedReceipts.map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block text-xs text-blue-500 hover:underline truncate">
                                      <ImageIcon size={10} className="inline mr-1"/> Comp. {i + 1}
                                  </a>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {uploading && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                      <span>Enviando arquivos...</span>
                      <span>{uploadProgress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-brand-red h-2 rounded-full transition-all" style={{width: `${uploadProgress}%`}}></div>
                  </div>
              </div>
          )}

          {isReadOnly ? (
              <div className="w-full bg-green-50 text-green-700 py-4 rounded-xl font-bold text-lg text-center border border-green-200">
                  SOLICITAÇÃO ENVIADA COM SUCESSO
              </div>
          ) : (
              <button 
                onClick={finishRequest}
                disabled={uploading}
                className="w-full bg-brand-red text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-red-800 transition transform hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0"
              >
                  FINALIZAR E PEDIR PAGAMENTO
              </button>
          )}
      </div>
      )}
    </div>
  );
};
