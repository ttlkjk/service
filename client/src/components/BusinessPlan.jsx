import React, { useState, useEffect, useMemo } from 'react';
import { loadData, saveData, getHospitals, subscribeToData } from '../supabase';

const GANTT_PALETTE = [
  'linear-gradient(90deg, #6366f1, #0ea5e9)',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6d28d9',
  '#a855f7',
  '#ec4899'
];

const BusinessPlan = () => {
  const [projects, setProjects] = useState([]);
  const [activeScale, setActiveScale] = useState('daily');
  const [weekOffset, setWeekOffset] = useState(0);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('erp-theme') || 'light');

  // Modal State
  const [modalType, setModalType] = useState(null); // 'project' | 'schedule'
  const [isNew, setIsNew] = useState(false);
  const [editData, setEditData] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [projData, hospData] = await Promise.all([
        loadData('projects'),
        getHospitals()
      ]);

      if (projData) setProjects(projData);
      else {
        setProjects([
          {
            id: 1,
            name: '신규 프로젝트 예시',
            description: '프로젝트 설명을 입력하세요.',
            equipment: '장비명 예시',
            hospitalId: null,
            hospitalName: '',
            team: '서비스팀',
            progress: 50,
            schedules: [
              { id: 101, content: '초기 기획', startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], color: GANTT_PALETTE[0], desc: '상세 일정 설명' }
            ]
          }
        ]);
      }
      if (hospData) setHospitals(hospData);
      setLoading(false);
    };
    fetchData();

    // Subscribe to real-time updates for multi-device sync
    const subscription = subscribeToData('projects', (newData) => {
      if (newData) setProjects(newData);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const handleSaveProjects = async (newProjects) => {
    setProjects(newProjects);
    setSaving(true);
    const success = await saveData('projects', newProjects);
    setSaving(false);
    if (!success) {
      alert('서버 저장에 실패했습니다. 네트워크 연결을 확인해 주세요.');
    }
  };

  // --- Gantt Logic ---
  const normalizeDate = (d) => {
    const nd = new Date(d);
    nd.setHours(0, 0, 0, 0);
    return nd;
  };

  const ganttData = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = normalizeDate(todayStr);
    const headers = [];
    const dateMap = [];
    const colCount = activeScale === 'monthly' ? 12 : activeScale === 'weekly' ? 8 : 7;

    if (activeScale === 'daily') {
      const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
      const Monday = new Date(today);
      Monday.setDate(today.getDate() - (dayOfWeek - 1) + (weekOffset * 7));
      const days = ['월', '화', '수', '목', '금', '토', '일'];
      for (let i = 0; i < 7; i++) {
        const d = new Date(Monday);
        d.setDate(Monday.getDate() + i);
        const isToday = normalizeDate(d).getTime() === today.getTime();
        headers.push({ label: `${days[i]}(${d.getDate()})`, isToday });
        dateMap.push({ start: normalizeDate(d), end: normalizeDate(d) });
      }
    } else if (activeScale === 'weekly') {
      const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
      const Monday = new Date(today);
      Monday.setDate(today.getDate() - (dayOfWeek - 1) + (weekOffset * 8 * 7));
      for (let i = 0; i < 8; i++) {
        const d = new Date(Monday);
        d.setDate(Monday.getDate() + (i * 7));
        const month = d.getMonth() + 1;
        const weekNum = Math.ceil(d.getDate() / 7);
        headers.push({ label: `${month}월 ${weekNum}주`, isToday: false });
        const weekEnd = new Date(d);
        weekEnd.setDate(d.getDate() + 6);
        dateMap.push({ start: normalizeDate(d), end: normalizeDate(weekEnd) });
      }
    } else {
      const months = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
      const targetYear = today.getFullYear() + weekOffset;
      for (let i = 0; i < 12; i++) {
        headers.push({ label: months[i], isToday: false });
        dateMap.push({
          start: normalizeDate(new Date(targetYear, i, 1)),
          end: normalizeDate(new Date(targetYear, i + 1, 0))
        });
      }
    }

    return { headers, dateMap, colCount };
  }, [activeScale, weekOffset]);

  const getWeekLabel = () => {
    const now = new Date();
    const dow = now.getDay() === 0 ? 7 : now.getDay();
    const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`;

    if (activeScale === 'daily') {
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dow - 1) + (weekOffset * 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      if (weekOffset === 0) return `이번 주 (${fmt(monday)}~${fmt(sunday)})`;
      return `${weekOffset > 0 ? '+' : ''}${weekOffset}주 (${fmt(monday)}~${fmt(sunday)})`;
    } else if (activeScale === 'weekly') {
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dow - 1) + (weekOffset * 8 * 7));
      const end = new Date(monday);
      end.setDate(monday.getDate() + 55);
      return `${weekOffset > 0 ? '+' : ''}${weekOffset}기간 (${fmt(monday)}~${fmt(end)})`;
    } else {
      const year = now.getFullYear() + weekOffset;
      return `${year}년`;
    }
  };

  // --- Modal Handlers ---
  const openProjectModal = (p = null) => {
    setDeleteConfirm(false);
    if (p) {
      setIsNew(false);
      setEditData({ ...p });
    } else {
      setIsNew(true);
      setEditData({
        name: '',
        description: '',
        equipment: '',
        hospitalId: null,
        hospitalName: '',
        team: '서비스팀',
        progress: 0,
        schedules: []
      });
    }
    setModalType('project');
  };

  const openScheduleModal = (pid, sid = null, startDate = null) => {
    setDeleteConfirm(false);
    const p = projects.find(x => x.id === pid);
    if (sid) {
      const s = p.schedules.find(x => x.id === sid);
      setIsNew(false);
      setEditData({ ...s, projectId: pid });
    } else {
      setIsNew(true);
      setEditData({
        projectId: pid,
        content: '',
        desc: '',
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: startDate || new Date().toISOString().split('T')[0],
        color: GANTT_PALETTE[0]
      });
    }
    setModalType('schedule');
  };

  const handleSaveModal = () => {
    let newProjects = [...projects];
    if (modalType === 'project') {
      if (isNew) {
        newProjects.push({ ...editData, id: Date.now(), schedules: editData.schedules || [] });
      } else {
        newProjects = newProjects.map(p => p.id === editData.id ? editData : p);
      }
    } else if (modalType === 'schedule') {
        const pIdx = newProjects.findIndex(x => x.id === editData.projectId);
        if (pIdx !== -1) {
            let p = { ...newProjects[pIdx] };
            if (isNew) {
                p.schedules = [...p.schedules, { ...editData, id: Date.now() }];
            } else {
                p.schedules = p.schedules.map(s => s.id === editData.id ? editData : s);
            }
            newProjects[pIdx] = p;
        }
    }
    handleSaveProjects(newProjects);
    setModalType(null);
  };

  const handleDelete = () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    let newProjects = [...projects];
    if (modalType === 'project') {
      newProjects = newProjects.filter(p => p.id !== editData.id);
    } else {
      const pIdx = newProjects.findIndex(x => x.id === editData.projectId);
      if (pIdx !== -1) {
        let p = { ...newProjects[pIdx] };
        p.schedules = p.schedules.filter(s => s.id !== editData.id);
        newProjects[pIdx] = p;
      }
    }
    handleSaveProjects(newProjects);
    setModalType(null);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('erp-theme', newTheme);
  };

  if (loading) return <div className="erp-container">Loading...</div>;

  return (
    <div className={`erp-container animate-fade ${theme === 'dark' ? 'dark-theme' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0 }}>업무 계획 및 로드맵</h1>
            <p style={{ color: 'var(--erp-text-muted)', marginTop: '0.25rem' }}>연간 프로젝트 타임라인 및 마일스톤을 관리합니다.</p>
          </div>
          <button 
            onClick={toggleTheme}
            className="scale-btn"
            style={{ fontSize: '1.2rem', padding: '0.5rem', borderRadius: '50%', background: 'var(--erp-glass-bg)', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
          >
            <i className={`fa-solid ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`} style={{ color: theme === 'light' ? '#4f46e5' : '#fbbf24' }}></i>
          </button>
        </div>
        <button 
          onClick={() => openProjectModal()}
          style={{ background: 'var(--erp-secondary)', color: '#fff', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
        >
          <i className="fa-solid fa-folder-plus" style={{ marginRight: '0.5rem' }}></i> 신규 프로젝트
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>프로젝트 로드맵</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="scale-btn" onClick={() => setWeekOffset(v => v - 1)}><i className="fa-solid fa-chevron-left"></i></button>
            <span style={{ fontSize: '0.82rem', color: 'var(--erp-text-muted)', minWidth: '120px', textAlign: 'center', fontWeight: 500 }}>{getWeekLabel()}</span>
            <button className="scale-btn" onClick={() => setWeekOffset(v => v + 1)}><i className="fa-solid fa-chevron-right"></i></button>
          </div>
          <div className="glass-card" style={{ display: 'flex', padding: '4px', borderRadius: '8px', gap: '4px' }}>
            {['daily', 'weekly', 'monthly'].map(s => (
              <button 
                key={s}
                className={`scale-btn ${activeScale === s ? 'active' : ''}`}
                onClick={() => { setActiveScale(s); setWeekOffset(0); }}
              >
                {s === 'daily' ? '일별' : s === 'weekly' ? '주별' : '월별'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `200px repeat(${ganttData.colCount}, 1fr)`, gap: '1px', background: 'var(--erp-glass-border)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--erp-glass-border)' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--erp-text-muted)' }}>프로젝트명</div>
          {ganttData.headers.map((h, i) => (
            <div key={i} style={h.isToday ? { background: 'rgba(14, 165, 233, 0.1)', color: 'var(--erp-secondary)', fontWeight: 700, padding: '1rem', textAlign: 'center', fontSize: '0.85rem', borderBottom: '2px solid var(--erp-secondary)' } : { background: 'rgba(255,255,255,0.02)', padding: '1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem', color: 'var(--erp-text-muted)' }}>
              {h.label}
            </div>
          ))}

          {projects.map(project => {
            const schedulePositions = project.schedules.map(s => {
              const sStart = normalizeDate(s.startDate);
              const sEnd = normalizeDate(s.endDate);
              let gridStart = -1, gridSpan = 0;
              for (let i = 0; i < ganttData.dateMap.length; i++) {
                const colStart = ganttData.dateMap[i].start;
                const colEnd = ganttData.dateMap[i].end;
                if (sStart <= colEnd && sEnd >= colStart) {
                  if (gridStart === -1) gridStart = i + 2;
                  gridSpan++;
                }
              }
              return { ...s, gridStart, gridSpan };
            }).filter(sp => sp.gridStart !== -1);

            const tracks = [];
            const sorted = [...schedulePositions].sort((a,b) => a.gridStart - b.gridStart);
            sorted.forEach(s => {
              let placed = false;
              for (let i = 0; i < tracks.length; i++) {
                const last = tracks[i][tracks[i].length - 1];
                if (s.gridStart >= (last.gridStart + last.gridSpan)) {
                  tracks[i].push(s); placed = true; break;
                }
              }
              if (!placed) tracks.push([s]);
            });
            if (tracks.length === 0) tracks.push([]);

            return (
              <React.Fragment key={project.id}>
                <div 
                  onClick={() => openProjectModal(project)}
                  style={{ background: 'var(--erp-bg)', padding: '1rem', fontWeight: 600, fontSize: '0.9rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: 'pointer', borderRight: '1px solid var(--erp-glass-border)', gridRow: `span ${tracks.length}`, minHeight: '50px' }}
                >
                  <span style={{ fontSize: '0.7rem', color: 'var(--erp-secondary)', fontWeight: 700, marginBottom: '2px' }}>{project.hospitalName || '병원 미지정'}</span>
                  <span>{project.name}</span>
                  {project.equipment && <span style={{ fontSize: '0.75rem', color: 'var(--erp-text-muted)', fontWeight: 400 }}>{project.equipment}</span>}
                </div>
                {tracks.map((track, tIdx) => (
                  <React.Fragment key={tIdx}>
                    {Array.from({ length: ganttData.colCount }).map((_, i) => {
                      const colIdx = i + 2;
                      const s = track.find(x => x.gridStart === colIdx);
                      if (s) {
                        return (
                          <div key={i} className="gantt-cell" style={{ background: 'var(--erp-bg)', gridColumn: `${colIdx} / span ${s.gridSpan}`, padding: '4px 0' }}>
                            <div 
                              className="edit-target" 
                              onClick={(e) => { e.stopPropagation(); openScheduleModal(project.id, s.id); }}
                              title={s.desc}
                              style={{ width: '100%', background: s.color, color: 'white', padding: '0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', cursor: 'pointer', margin: '0 4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                            >
                              {s.content}
                            </div>
                          </div>
                        );
                      }
                      const isCovered = track.some(ts => colIdx > ts.gridStart && colIdx < ts.gridStart + ts.gridSpan);
                      if (isCovered) return null;
                      const d = ganttData.dateMap[i].start;
                      const cellDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                      return (
                        <div 
                          key={i} 
                          className="gantt-cell" 
                          onClick={() => openScheduleModal(project.id, null, cellDate)}
                          style={{ background: 'var(--erp-bg)', height: '40px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                        ></div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {modalType && (
        <div className="erp-modal-overlay" onClick={() => setModalType(null)}>
          <div className="erp-modal animate-fade" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
              {modalType === 'project' ? (isNew ? '신규 프로젝트 생성' : '프로젝트 수정') : (isNew ? '새 일정 추가' : '일정 내용 수정')}
            </h3>

            {modalType === 'project' && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="text-sm font-bold">프로젝트명</label>
                  <input className="erp-input" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="text-sm font-bold">진행 병원</label>
                  <select 
                    className="erp-input" 
                    value={editData.hospitalId || ''} 
                    onChange={e => {
                      const h = hospitals.find(x => x.id === parseInt(e.target.value));
                      setEditData({ ...editData, hospitalId: h ? h.id : null, hospitalName: h ? h.name : '' });
                    }}
                  >
                    <option value="">병원 선택 안함</option>
                    {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="text-sm font-bold">상세 설명</label>
                  <textarea className="erp-input" rows="2" value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="text-sm font-bold">장비명</label>
                  <input className="erp-input" value={editData.equipment} onChange={e => setEditData({ ...editData, equipment: e.target.value })} />
                </div>
              </>
            )}

            {modalType === 'schedule' && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="text-sm font-bold">일정 내용</label>
                  <input className="erp-input" value={editData.content} onChange={e => setEditData({ ...editData, content: e.target.value })} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="text-sm font-bold">일정 상세 내용</label>
                  <textarea className="erp-input" rows="2" value={editData.desc} onChange={e => setEditData({ ...editData, desc: e.target.value })} />
                </div>
              </>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label className="text-sm font-bold">진행률 (%)</label>
                <input type="number" className="erp-input" value={editData.progress} onChange={e => setEditData({ ...editData, progress: parseInt(e.target.value) || 0 })} />
              </div>
              {modalType === 'project' && (
                <div>
                  <label className="text-sm font-bold">담당 팀</label>
                  <select className="erp-input" value={editData.team} onChange={e => setEditData({ ...editData, team: e.target.value })}>
                    <option value="서비스팀">서비스팀</option>
                    <option value="영업팀">영업팀</option>
                    <option value="총무지원팀">총무지원팀</option>
                  </select>
                </div>
              )}
              {modalType === 'schedule' && (
                <>
                  <div>
                    <label className="text-sm font-bold">색상 테마</label>
                    <select className="erp-input" value={editData.color} onChange={e => setEditData({ ...editData, color: e.target.value })}>
                      <option value={GANTT_PALETTE[0]}>블루 그라데이션</option>
                      <option value="#0ea5e9">라이트 블루</option>
                      <option value="#10b981">그린</option>
                      <option value="#f59e0b">오렌지</option>
                      <option value="#ef4444">레드</option>
                      <option value="#6d28d9">퍼플</option>
                      <option value="#a855f7">라이트 퍼플</option>
                      <option value="#ec4899">핑크</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-bold">시작일</label>
                    <input type="date" className="erp-input" value={editData.startDate} onChange={e => setEditData({ ...editData, startDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-bold">종료일</label>
                    <input type="date" className="erp-input" value={editData.endDate} onChange={e => setEditData({ ...editData, endDate: e.target.value })} />
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between' }}>
              {!isNew ? (
                <button 
                  onClick={handleDelete}
                  style={{ background: deleteConfirm ? '#ef4444' : 'rgba(239, 68, 68, 0.05)', border: '1px solid #ef4444', color: deleteConfirm ? '#fff' : '#ef4444', padding: '0.75rem 1.25rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 500 }}
                >
                  {deleteConfirm ? '정말 삭제?' : '삭제'}
                </button>
              ) : <div></div>}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setModalType(null)} className="btn btn-secondary" disabled={saving}>취소</button>
                <button onClick={handleSaveModal} className="btn btn-primary" disabled={saving}>
                  {saving ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessPlan;
