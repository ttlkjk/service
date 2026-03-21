import { createClient } from '@supabase/supabase-js';

// Service Report 전용 Supabase 프로젝트
const SUPABASE_URL = 'https://nxmevwhmlsyvohgpgmix.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bWV2d2htbHN5dm9oZ3BnbWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjYzNTMsImV4cCI6MjA4OTY0MjM1M30.iU6gGv3YqvuiV7r8cLODG0vFYpvFQ2tAwEv9mm6IsSw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Hospitals ───────────────────────────────────────────────────────────────

/**
 * 병원 목록 조회 (선택적으로 이름 검색)
 */
export async function getHospitals(query = '') {
  console.log('getHospitals called with query:', query);
  let req = supabase.from('hospitals').select('*').order('name');
  if (query && query.length >= 2) {
    req = req.ilike('name', `%${query}%`);
  }
  const { data, error } = await req;
  if (error) {
    console.error('getHospitals error:', error);
    throw error;
  }
  return data ?? [];
}

/**
 * 병원 추가
 */
export async function addHospital(hospitalData) {
  const { data, error } = await supabase
    .from('hospitals')
    .insert([hospitalData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * 병원 수정
 */
export async function updateHospital(id, hospitalData) {
  const { error } = await supabase
    .from('hospitals')
    .update(hospitalData)
    .eq('id', id);
  if (error) throw error;
}

/**
 * 병원 삭제
 */
export async function deleteHospital(id) {
  const { error } = await supabase
    .from('hospitals')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Service Reports ─────────────────────────────────────────────────────────

/**
 * 보고서 목록 조회 (날짜/고객/제품 필터 선택적)
 */
export async function getReports({ date, customer, products } = {}) {
  let req = supabase.from('service_reports').select('*').order('created_at', { ascending: false });
  if (date) req = req.eq('service_date', date);
  if (customer) req = req.ilike('hospital_name', `%${customer}%`);
  if (products) req = req.ilike('products', `%${products}%`);
  const { data, error } = await req;
  if (error) throw error;
  return data ?? [];
}

/**
 * 단일 보고서 조회
 */
export async function getReport(id) {
  const { data, error } = await supabase
    .from('service_reports')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * 보고서 생성
 */
export async function createReport(reportData) {
  const { data, error } = await supabase
    .from('service_reports')
    .insert([reportData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * 보고서 수정
 */
export async function updateReport(id, reportData) {
  const { error } = await supabase
    .from('service_reports')
    .update(reportData)
    .eq('id', id);
  if (error) throw error;
}

/**
 * 보고서 삭제
 */
export async function deleteReport(id) {
  const { error } = await supabase
    .from('service_reports')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Generic JSON Storage (WorkList Mirror) ─────────────────────────────────

/**
 * Supabase에서 데이터를 로드합니다. 실패 시 localStorage 폴백.
 */
export async function loadData(key) {
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Row not found (Data missing, but table exists)
        const local = localStorage.getItem(key);
        return local ? JSON.parse(local) : null;
      }
      
      if (error.code === '42P01') { // Table not found
        console.error(`[Supabase] Table "app_data" is missing! Please run the SQL script.`);
        alert('필수 데이터 테이블(app_data)이 없습니다. 가이드에 따라 SQL을 실행해 주세요.');
        return null;
      }

      console.warn(`[Supabase] Load error for "${key}":`, error.message);
      const local = localStorage.getItem(key);
      return local ? JSON.parse(local) : null;
    }

    if (data?.value !== undefined) {
      localStorage.setItem(key, JSON.stringify(data.value));
    }
    return data?.value ?? null;
  } catch (err) {
    console.warn(`[Supabase] Network error for "${key}"`, err);
    const local = localStorage.getItem(key);
    return local ? JSON.parse(local) : null;
  }
}

/**
 * Supabase에 데이터를 저장합니다. localStorage에도 동시 캐시.
 */
export async function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  try {
    const { error } = await supabase
      .from('app_data')
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    
    if (error) {
      if (error.code === '42P01') {
        alert('테이블이 없어 저장에 실패했습니다. 가이드의 SQL을 실행해 주세요.');
      }
      console.warn(`[Supabase] Save error for "${key}":`, error.message);
      return false;
    }
    
    console.log(`[Supabase] Data saved successfully for "${key}"`);
    return true;
  } catch (err) {
    console.warn(`[Supabase] Network error saving "${key}"`, err);
    return false;
  }
}

/**
 * 특정 키의 데이터 변경사항을 실시간으로 구독합니다. (Realtime)
 */
export function subscribeToData(key, onUpdate) {
  return supabase
    .channel(`realtime:${key}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_data', filter: `key=eq.${key}` },
      (payload) => {
        console.log(`[Supabase Realtime] Update for "${key}":`, payload);
        if (payload.new && payload.new.value !== undefined) {
          localStorage.setItem(key, JSON.stringify(payload.new.value));
          onUpdate(payload.new.value);
        }
      }
    )
    .subscribe((status) => {
      console.log(`[Supabase Realtime] Status for "${key}":`, status);
    });
}

/**
 * 앱 시작 시 모든 데이터를 Supabase에서 로드하여 localStorage에 캐시합니다.
 */
export async function syncAllData() {
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('key, value');

    if (error) {
      console.warn('[Supabase] Sync error:', error.message);
      return false;
    }

    if (data && data.length > 0) {
      data.forEach(row => {
        localStorage.setItem(row.key, JSON.stringify(row.value));
      });
      return true;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Network error during sync', err);
    return false;
  }
}
