
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  setDoc,
  getDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { TradeRequest, RegionalBudget, Region } from "../types";

export const createRequest = async (request: Omit<TradeRequest, 'id'>) => {
  return await addDoc(collection(db, "requests"), request);
};

export const getRequestsByUser = async (rcaEmail: string) => {
  if (!rcaEmail) return [];
  const emailLower = rcaEmail.toLowerCase().trim();
  const q = query(collection(db, "requests"), where("rcaEmail", "==", emailLower));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TradeRequest));
};

export const getRequestsByPartner = async (partnerCode: string) => {
  if (!partnerCode) return [];
  // Busca solicitações aprovadas para aquele parceiro
  const q = query(
    collection(db, "requests"), 
    where("partnerCode", "==", partnerCode),
    where("status", "==", "approved")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TradeRequest));
};

export const getAllRequests = async () => {
  const snapshot = await getDocs(collection(db, "requests"));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TradeRequest));
};

export const updateRequestStatus = async (id: string, status: string, reason?: string) => {
  if (!id) throw new Error("ID inválido para atualização");
  
  console.log(`[SERVICE] Atualizando Doc ${id} para status: ${status}`);
  const ref = doc(db, "requests", id);
  await updateDoc(ref, { status, rejectionReason: reason || null });
  console.log(`[SERVICE] Sucesso na atualização de ${id}`);
};

export const saveBudget = async (region: Region, month: string, limit: number) => {
  // Normalização de chaves para evitar erros de espaços
  const safeRegion = region.trim();
  const safeMonth = month.trim();
  const id = `${safeRegion}_${safeMonth}`;
  
  await setDoc(doc(db, "budgets", id), {
    region: safeRegion,
    month: safeMonth,
    limit: Number(limit)
  });
};

export const getAllBudgets = async () => {
  const snapshot = await getDocs(collection(db, "budgets"));
  return snapshot.docs.map(d => d.data() as RegionalBudget);
};

// Automatic Expiration Logic
// Checks for 'approved' requests where dateOfAction is in a previous month relative to now.
export const checkAndExpireRequests = async () => {
  try {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM

    // Query all APPROVED requests
    // We cannot query by dateOfAction range easily without composite indexes, so we filter in memory
    const q = query(collection(db, "requests"), where("status", "==", "approved"));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    let count = 0;

    snapshot.docs.forEach((d) => {
      const data = d.data() as TradeRequest;
      // If dateOfAction exists and is less than current month (string comparison works for ISO YYYY-MM)
      if (data.dateOfAction && data.dateOfAction.slice(0, 7) < currentMonth) {
        const ref = doc(db, "requests", d.id);
        batch.update(ref, { 
          status: 'expired',
          rejectionReason: 'Vencimento Automático: Ação não realizada dentro do mês de competência.'
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`[AUTO-EXPIRE] ${count} solicitações vencidas foram atualizadas.`);
    }
  } catch (e) {
    console.error("[AUTO-EXPIRE] Erro ao verificar vencimentos:", e);
  }
};

// FUNÇÃO ULTRA-BLINDADA CONTRA FALHAS
export const checkBudgetAvailability = async (region: Region, month: string, requestValue: number): Promise<{allowed: boolean, message: string}> => {
  try {
    if (!month) return { allowed: true, message: "Data indefinida, aprovação livre." };
    if (!region) return { allowed: true, message: "Região indefinida, aprovação livre." };

    const safeRegion = region.trim();
    const safeMonth = month.trim(); // YYYY-MM
    const budgetId = `${safeRegion}_${safeMonth}`;
    
    console.log(`Verificando orçamento para: ${budgetId}`); // Debug

    const budgetSnap = await getDoc(doc(db, "budgets", budgetId));
    
    // Se não existe documento de orçamento, assumimos que não foi configurado (ou é livre, dependendo da regra).
    // Aqui assumirei que se não tem teto, é livre, para não travar a operação.
    if (!budgetSnap.exists()) {
        return { allowed: true, message: `Sem orçamento configurado para ${safeRegion} em ${safeMonth}.` };
    }
    
    const limit = Number(budgetSnap.data().limit) || 0;
    
    // Busca gastos JÁ APROVADOS nesta região
    const q = query(
      collection(db, "requests"), 
      where("region", "==", safeRegion), 
      where("status", "==", "approved")
    );
    
    const snap = await getDocs(q);
    
    let used = 0;
    
    // Iteração segura: se um registro estiver corrompido, não quebra o loop
    snap.docs.forEach(d => {
      try {
        const data = d.data() as TradeRequest;
        // Verifica se pertence ao mês correto (string comparison 'YYYY-MM')
        // OBS: Itens 'expired' não entram aqui pois o status não é 'approved'
        if (data.dateOfAction && typeof data.dateOfAction === 'string' && data.dateOfAction.startsWith(safeMonth)) {
          used += Number(data.totalValue) || 0;
        }
      } catch (innerError) {
        console.warn("Ignorando registro corrompido no cálculo de orçamento", innerError);
      }
    });

    const safeRequestValue = Number(requestValue) || 0;
    const remaining = limit - used;
    
    console.log(`Orçamento: Limite=${limit}, Usado=${used}, Restante=${remaining}, Solicitado=${safeRequestValue}`);

    if (safeRequestValue <= remaining) {
      return { allowed: true, message: "Orçamento disponível." };
    } else {
      return { 
        allowed: false, 
        message: `Estouro de Orçamento! Teto: R$${limit} | Usado: R$${used} | Solicitado: R$${safeRequestValue}` 
      };
    }
  } catch (error: any) {
    console.error("Erro CRÍTICO no cálculo de orçamento:", error);
    // Retornamos allowed=false mas com mensagem de erro técnico
    // O frontend deve permitir "Forçar" mesmo assim
    return { allowed: false, message: `Erro técnico no cálculo: ${error.message}` };
  }
};
