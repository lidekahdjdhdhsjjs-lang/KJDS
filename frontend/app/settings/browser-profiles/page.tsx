'use client';

import { useState, useEffect } from 'react';
import {
  Globe,
  Monitor,
  Lock,
  Unlock,
  Trash2,
  Play,
  Square,
  RefreshCw,
  Plus,
  Activity,
  Server
} from 'lucide-react';

interface BrowserProfile {
  id: string;
  name: string;
  region: string;
  store_id: string | null;
  user_agent: string;
  viewport_width: number;
  viewport_height: number;
  timezone: string;
  language: string;
  webgl_vendor: string;
  webgl_renderer: string;
  proxy_host: string | null;
  proxy_port: number | null;
  proxy_type: string;
  is_active: boolean;
  is_locked: boolean;
  last_used_at: string | null;
  total_uses: number;
  created_at: string;
}

interface ProxyInfo {
  id: string;
  host: string;
  port: number;
  proxy_type: string;
  country: string;
  region: string | null;
  city: string | null;
  is_active: boolean;
  health_score: number;
  success_count: number;
  failure_count: number;
  avg_response_time_ms: number;
}

const REGIONS = [
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
];

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1';

// 简单样式组件
const styles = {
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
    border: '1px solid #e2e8f0',
  },
  button: {
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    fontSize: 14,
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    backgroundColor: '#fff',
  },
  badge: (color: string) => ({
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 6,
    backgroundColor: color,
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
  }),
};

export default function BrowserProfilesPage() {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [proxies, setProxies] = useState<ProxyInfo[]>([]);
  const [activeSessions, setActiveSessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profiles' | 'proxies' | 'sessions'>('profiles');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProxyModal, setShowProxyModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  const [newProfile, setNewProfile] = useState({
    name: '',
    region: 'SG',
    store_id: '',
    proxy_host: '',
    proxy_port: '',
    proxy_type: 'http',
  });

  const [newProxy, setNewProxy] = useState({
    host: '',
    port: '',
    proxy_type: 'http',
    country: 'SG',
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [profilesRes, proxiesRes, sessionsRes] = await Promise.all([
        fetch(`${API_BASE}/browser/profiles`).catch(() => ({ ok: false, json: async () => [] })),
        fetch(`${API_BASE}/browser/proxies`).catch(() => ({ ok: false, json: async () => [] })),
        fetch(`${API_BASE}/browser/sessions`).catch(() => ({ ok: false, json: async () => [] })),
      ]);

      if (profilesRes.ok) setProfiles(await profilesRes.json());
      if (proxiesRes.ok) setProxies(await proxiesRes.json());
      if (sessionsRes.ok) setActiveSessions(await sessionsRes.json());
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/browser/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProfile,
          proxy_port: newProfile.proxy_port ? parseInt(newProfile.proxy_port) : null,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        loadData();
        setNewProfile({ name: '', region: 'SG', store_id: '', proxy_host: '', proxy_port: '', proxy_type: 'http' });
      }
    } catch (error) {
      console.error('Failed to create profile:', error);
    }
  };

  const createProxy = async () => {
    try {
      const res = await fetch(`${API_BASE}/browser/proxies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProxy,
          port: parseInt(newProxy.port),
        }),
      });
      if (res.ok) {
        setShowProxyModal(false);
        loadData();
        setNewProxy({ host: '', port: '', proxy_type: 'http', country: 'SG' });
      }
    } catch (error) {
      console.error('Failed to create proxy:', error);
    }
  };

  const toggleLock = async (profileId: string, isLocked: boolean) => {
    try {
      await fetch(`${API_BASE}/browser/profiles/${profileId}/${isLocked ? 'unlock' : 'lock'}`, { method: 'POST' });
      loadData();
    } catch (error) {
      console.error('Failed to toggle lock:', error);
    }
  };

  const deleteProfile = async (profileId: string) => {
    if (!confirm('确定要删除此配置吗？')) return;
    try {
      await fetch(`${API_BASE}/browser/profiles/${profileId}`, { method: 'DELETE' });
      loadData();
    } catch (error) {
      console.error('Failed to delete profile:', error);
    }
  };

  const closeSession = async (sessionId: string) => {
    try {
      await fetch(`${API_BASE}/browser/sessions/${sessionId}/close`, { method: 'POST' });
      loadData();
    } catch (error) {
      console.error('Failed to close session:', error);
    }
  };

  const getRegionInfo = (code: string) => REGIONS.find(r => r.code === code);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>指纹浏览器池</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>管理独立浏览器配置，用于多账号、市场调研和自动化采集</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            style={{ ...styles.button, backgroundColor: '#f1f5f9', color: '#475569' }}
            onClick={() => setShowProxyModal(true)}
          >
            <Server size={16} /> 添加代理
          </button>
          <button
            style={{ ...styles.button, backgroundColor: '#2563eb', color: '#fff' }}
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} /> 新建配置
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>活跃配置</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{profiles.filter(p => p.is_active).length}</div>
            </div>
            <Monitor className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>运行中会话</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{activeSessions.length}</div>
            </div>
            <Play className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>可用代理</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{proxies.filter(p => p.is_active && p.health_score > 0.5).length}</div>
            </div>
            <Globe className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>覆盖地区</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{new Set(profiles.map(p => p.region)).size}</div>
            </div>
            <Activity className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
        {(['profiles', 'proxies', 'sessions'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: activeTab === tab ? '#2563eb' : 'transparent',
              color: activeTab === tab ? '#fff' : '#64748b',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {tab === 'profiles' ? `浏览器配置 (${profiles.length})` : tab === 'proxies' ? `代理池 (${proxies.length})` : `活跃会话 (${activeSessions.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'profiles' && (
        <div>
          {/* Filter */}
          <div style={{ marginBottom: 16 }}>
            <select
              style={{ ...styles.select, width: 200 }}
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
            >
              <option value="">所有地区</option>
              {REGIONS.map(r => (
                <option key={r.code} value={r.code}>{r.flag} {r.name}</option>
              ))}
            </select>
          </div>

          {/* Profiles Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {profiles
              .filter(p => !selectedRegion || p.region === selectedRegion)
              .map(profile => {
                const regionInfo = getRegionInfo(profile.region);
                return (
                  <div key={profile.id} style={{ ...styles.card, opacity: profile.is_active ? 1 : 0.6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>{profile.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <span style={{ fontSize: 20 }}>{regionInfo?.flag}</span>
                          <span style={{ fontSize: 12, color: '#64748b' }}>{regionInfo?.name}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {profile.is_locked ? <Lock size={16} className="text-yellow-500" /> : <Unlock size={16} className="text-green-500" />}
                        <span style={styles.badge(profile.is_active ? '#22c55e' : '#94a3b8')}>
                          {profile.is_active ? '活跃' : '禁用'}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.user_agent.substring(0, 40)}...</div>
                      <div>分辨率: {profile.viewport_width}x{profile.viewport_height}</div>
                      <div>时区: {profile.timezone}</div>
                      {profile.proxy_host && <div style={{ color: '#2563eb' }}>代理: {profile.proxy_host}:{profile.proxy_port}</div>}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                      <span>使用: {profile.total_uses}次</span>
                      {profile.last_used_at && <span>{new Date(profile.last_used_at).toLocaleDateString()}</span>}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button
                        style={{ ...styles.button, backgroundColor: '#f1f5f9', color: '#475569', padding: '6px 12px', fontSize: 12 }}
                        onClick={() => toggleLock(profile.id, profile.is_locked)}
                      >
                        {profile.is_locked ? <><Unlock size={14} /> 解锁</> : <><Lock size={14} /> 锁定</>}
                      </button>
                      <button
                        style={{ ...styles.button, backgroundColor: '#fef2f2', color: '#dc2626', padding: '6px 12px', fontSize: 12 }}
                        onClick={() => deleteProfile(profile.id)}
                        disabled={profile.is_locked}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {activeTab === 'proxies' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {proxies.map(proxy => (
            <div key={proxy.id} style={{ ...styles.card, opacity: proxy.is_active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{proxy.host}:{proxy.port}</div>
                <span style={styles.badge(proxy.proxy_type === 'socks5' ? '#8b5cf6' : '#64748b')}>{proxy.proxy_type.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                {proxy.city && `${proxy.city}, `}{proxy.country}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: proxy.health_score >= 0.8 ? '#22c55e' : proxy.health_score >= 0.5 ? '#eab308' : '#ef4444' }}>
                  {(proxy.health_score * 100).toFixed(0)}%
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>{proxy.avg_response_time_ms}ms</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 12 }}>
                <span style={{ color: '#22c55e' }}>成功: {proxy.success_count}</span>
                <span style={{ color: '#ef4444' }}>失败: {proxy.failure_count}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div style={styles.card}>
          {activeSessions.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>暂无活跃会话</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeSessions.map(sessionId => (
                <div key={sessionId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 8, height: 8, backgroundColor: '#22c55e', borderRadius: '50%' }} />
                    <code style={{ fontSize: 12 }}>{sessionId}</code>
                  </div>
                  <button
                    style={{ ...styles.button, backgroundColor: '#fef2f2', color: '#dc2626', padding: '6px 12px', fontSize: 12 }}
                    onClick={() => closeSession(sessionId)}
                  >
                    <Square size={14} /> 关闭
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Profile Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 480, maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20 }}>创建浏览器配置</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>配置名称</label>
                <input
                  style={styles.input}
                  value={newProfile.name}
                  onChange={e => setNewProfile(p => ({ ...p, name: e.target.value }))}
                  placeholder="例如：越南店-竞品分析"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>目标地区</label>
                <select
                  style={styles.select}
                  value={newProfile.region}
                  onChange={e => setNewProfile(p => ({ ...p, region: e.target.value }))}
                >
                  {REGIONS.map(r => <option key={r.code} value={r.code}>{r.flag} {r.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>关联店铺ID (可选)</label>
                <input style={styles.input} value={newProfile.store_id} onChange={e => setNewProfile(p => ({ ...p, store_id: e.target.value }))} />
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>代理配置 (可选)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>代理类型</label>
                    <select style={styles.select} value={newProfile.proxy_type} onChange={e => setNewProfile(p => ({ ...p, proxy_type: e.target.value }))}>
                      <option value="http">HTTP</option>
                      <option value="socks5">SOCKS5</option>
                    </select>
                  </div>
                  <div></div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>代理地址</label>
                    <input style={styles.input} value={newProfile.proxy_host} onChange={e => setNewProfile(p => ({ ...p, proxy_host: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>端口</label>
                    <input style={styles.input} value={newProfile.proxy_port} onChange={e => setNewProfile(p => ({ ...p, proxy_port: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button style={{ ...styles.button, flex: 1, backgroundColor: '#f1f5f9', color: '#475569' }} onClick={() => setShowCreateModal(false)}>取消</button>
                <button style={{ ...styles.button, flex: 1, backgroundColor: '#2563eb', color: '#fff' }} onClick={createProfile} disabled={!newProfile.name}>创建</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Proxy Modal */}
      {showProxyModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 400 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20 }}>添加代理</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>代理地址</label>
                  <input style={styles.input} value={newProxy.host} onChange={e => setNewProxy(p => ({ ...p, host: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>端口</label>
                  <input style={styles.input} value={newProxy.port} onChange={e => setNewProxy(p => ({ ...p, port: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>类型</label>
                  <select style={styles.select} value={newProxy.proxy_type} onChange={e => setNewProxy(p => ({ ...p, proxy_type: e.target.value }))}>
                    <option value="http">HTTP</option>
                    <option value="socks5">SOCKS5</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>国家</label>
                  <select style={styles.select} value={newProxy.country} onChange={e => setNewProxy(p => ({ ...p, country: e.target.value }))}>
                    {REGIONS.map(r => <option key={r.code} value={r.code}>{r.flag} {r.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button style={{ ...styles.button, flex: 1, backgroundColor: '#f1f5f9', color: '#475569' }} onClick={() => setShowProxyModal(false)}>取消</button>
                <button style={{ ...styles.button, flex: 1, backgroundColor: '#2563eb', color: '#fff' }} onClick={createProxy} disabled={!newProxy.host || !newProxy.port}>添加</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
