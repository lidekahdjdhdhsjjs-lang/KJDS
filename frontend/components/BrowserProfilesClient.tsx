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
  Server,
} from 'lucide-react';
import {
  colors,
  borderRadius,
  shadows,
  typography,
  spacing,
} from '@/lib/design-system';

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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1';

// Design-system backed styles
const s = {
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[5],
    boxShadow: shadows.sm,
    border: `1px solid ${colors.border}`,
  },
  button: {
    padding: `${spacing[2]} ${spacing[5]}`,
    borderRadius: borderRadius.base,
    border: 'none',
    cursor: 'pointer',
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  input: {
    width: '100%',
    padding: `${spacing[2]} ${spacing[3]}`,
    borderRadius: borderRadius.base,
    border: `1px solid ${colors.border}`,
    fontSize: typography.fontSize.sm,
  },
  select: {
    width: '100%',
    padding: `${spacing[2]} ${spacing[3]}`,
    borderRadius: borderRadius.base,
    border: `1px solid ${colors.border}`,
    fontSize: typography.fontSize.sm,
    backgroundColor: colors.surface,
  },
  badge: (color: string) => ({
    display: 'inline-block',
    padding: `${spacing[1]} ${spacing[3]}`,
    borderRadius: borderRadius.sm,
    backgroundColor: color,
    color: colors.surface,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  }),
};

interface BrowserProfilesClientProps {
  initialProfiles?: BrowserProfile[];
  initialProxies?: ProxyInfo[];
  initialSessions?: string[];
}

export function BrowserProfilesClient({ initialProfiles = [], initialProxies = [], initialSessions = [] }: BrowserProfilesClientProps) {
  const [profiles, setProfiles] = useState<BrowserProfile[]>(initialProfiles);
  const [proxies, setProxies] = useState<ProxyInfo[]>(initialProxies);
  const [activeSessions, setActiveSessions] = useState<string[]>(initialSessions);
  const [loading, setLoading] = useState(!initialProfiles.length && !initialProxies.length);
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

  const loadData = async () => {
    try {
      const [profilesRes, proxiesRes, sessionsRes] = await Promise.all([
        fetch(`${API_BASE}/browser/profiles`).catch(() => ({ ok: false, json: async () => [] as BrowserProfile[] })),
        fetch(`${API_BASE}/browser/proxies`).catch(() => ({ ok: false, json: async () => [] as ProxyInfo[] })),
        fetch(`${API_BASE}/browser/sessions`).catch(() => ({ ok: false, json: async () => [] as string[] })),
      ]);
      if (profilesRes.ok) setProfiles(await profilesRes.json());
      if (proxiesRes.ok) setProxies(await proxiesRes.json());
      if (sessionsRes.ok) setActiveSessions(await sessionsRes.json());
    } catch {
      // gracefully handle load errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialProfiles.length > 0 || initialProxies.length > 0) {
      setLoading(false);
    }
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

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
    } catch {
      // gracefully handle create errors
    }
  };

  const createProxy = async () => {
    try {
      const res = await fetch(`${API_BASE}/browser/proxies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProxy, port: parseInt(newProxy.port) }),
      });
      if (res.ok) {
        setShowProxyModal(false);
        loadData();
        setNewProxy({ host: '', port: '', proxy_type: 'http', country: 'SG' });
      }
    } catch {
      // gracefully handle create errors
    }
  };

  const toggleLock = async (profileId: string, isLocked: boolean) => {
    try {
      await fetch(`${API_BASE}/browser/profiles/${profileId}/${isLocked ? 'unlock' : 'lock'}`, { method: 'POST' });
      loadData();
    } catch {
      // gracefully handle toggle errors
    }
  };

  const deleteProfile = async (profileId: string) => {
    if (!confirm('确定要删除此配置吗？')) return;
    try {
      await fetch(`${API_BASE}/browser/profiles/${profileId}`, { method: 'DELETE' });
      loadData();
    } catch {
      // gracefully handle delete errors
    }
  };

  const closeSession = async (sessionId: string) => {
    try {
      await fetch(`${API_BASE}/browser/sessions/${sessionId}/close`, { method: 'POST' });
      loadData();
    } catch {
      // gracefully handle close errors
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
    <div style={{ padding: spacing[6], maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[6] }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>指纹浏览器池</h1>
          <p style={{ color: colors.textSecondary, marginTop: spacing[1] }}>管理独立浏览器配置，用于多账号、市场调研和自动化采集</p>
        </div>
        <div style={{ display: 'flex', gap: spacing[3] }}>
          <button
            style={{ ...s.button, backgroundColor: colors.background, color: colors.textSecondary }}
            onClick={() => setShowProxyModal(true)}
          >
            <Server size={16} /> 添加代理
          </button>
          <button
            style={{ ...s.button, backgroundColor: colors.primary, color: colors.surface }}
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} /> 新建配置
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing[4], marginBottom: spacing[6] }}>
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: colors.textSecondary }}>活跃配置</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{profiles.filter(p => p.is_active).length}</div>
            </div>
            <Monitor className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: colors.textSecondary }}>运行中会话</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{activeSessions.length}</div>
            </div>
            <Play className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: colors.textSecondary }}>可用代理</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{proxies.filter(p => p.is_active && p.health_score > 0.5).length}</div>
            </div>
            <Globe className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: colors.textSecondary }}>覆盖地区</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{new Set(profiles.map(p => p.region)).size}</div>
            </div>
            <Activity className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: spacing[1], marginBottom: spacing[4], borderBottom: '1px solid ' + colors.border, paddingBottom: spacing[3] }}>
        {(['profiles', 'proxies', 'sessions'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              borderRadius: borderRadius.base,
              border: 'none',
              backgroundColor: activeTab === tab ? colors.primary : 'transparent',
              color: activeTab === tab ? colors.surface : colors.textSecondary,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {tab === 'profiles' ? `浏览器配置 (${profiles.length})` : tab === 'proxies' ? `代理池 (${proxies.length})` : `活跃会话 (${activeSessions.length})`}
          </button>
        ))}
      </div>

      {/* Profiles Tab */}
      {activeTab === 'profiles' && (
        <div>
          <div style={{ marginBottom: spacing[4] }}>
            <select
              style={{ ...s.select, width: 200 }}
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
            >
              <option value="">所有地区</option>
              {REGIONS.map(r => (
                <option key={r.code} value={r.code}>{r.flag} {r.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing[4] }}>
            {profiles
              .filter(p => !selectedRegion || p.region === selectedRegion)
              .map(profile => {
                const regionInfo = getRegionInfo(profile.region);
                return (
                  <div key={profile.id} style={{ ...s.card, opacity: profile.is_active ? 1 : 0.6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: spacing[3] }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>{profile.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginTop: spacing[1] }}>
                          <span style={{ fontSize: 20 }}>{regionInfo?.flag}</span>
                          <span style={{ fontSize: 12, color: colors.textSecondary }}>{regionInfo?.name}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                        {profile.is_locked ? <Lock size={16} className="text-yellow-500" /> : <Unlock size={16} className="text-green-500" />}
                        <span style={s.badge(profile.is_active ? colors.success : colors.textMuted)}>
                          {profile.is_active ? '活跃' : '禁用'}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[3] }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.user_agent.substring(0, 40)}...</div>
                      <div>分辨率: {profile.viewport_width}x{profile.viewport_height}</div>
                      <div>时区: {profile.timezone}</div>
                      {profile.proxy_host && <div style={{ color: colors.primary }}>代理: {profile.proxy_host}:{profile.proxy_port}</div>}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: colors.textSecondary, marginBottom: spacing[3] }}>
                      <span>使用: {profile.total_uses}次</span>
                      {profile.last_used_at && <span>{new Date(profile.last_used_at).toLocaleDateString()}</span>}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button
                        style={{ ...s.button, backgroundColor: colors.primaryLight, color: colors.textSecondary, padding: '6px 12px', fontSize: 12 }}
                        onClick={() => toggleLock(profile.id, profile.is_locked)}
                      >
                        {profile.is_locked ? <><Unlock size={14} /> 解锁</> : <><Lock size={14} /> 锁定</>}
                      </button>
                      <button
                        style={{ ...s.button, backgroundColor: colors.errorLight, color: colors.error, padding: '6px 12px', fontSize: 12 }}
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

      {/* Proxies Tab */}
      {activeTab === 'proxies' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing[4] }}>
          {proxies.map(proxy => (
            <div key={proxy.id} style={{ ...s.card, opacity: proxy.is_active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                <div style={{ fontWeight: 600 }}>{proxy.host}:{proxy.port}</div>
                <span style={s.badge(proxy.proxy_type === 'socks5' ? '#8b5cf6' : colors.textSecondary)}>{proxy.proxy_type.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[3] }}>
                {proxy.city && `${proxy.city}, `}{proxy.country}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
                <span style={{ fontWeight: 700, color: proxy.health_score >= 0.8 ? colors.success : proxy.health_score >= 0.5 ? colors.warning : colors.error }}>
                  {(proxy.health_score * 100).toFixed(0)}%
                </span>
                <span style={{ fontSize: 12, color: colors.textSecondary }}>{proxy.avg_response_time_ms}ms</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: spacing[3] }}>
                <span style={{ color: colors.success }}>成功: {proxy.success_count}</span>
                <span style={{ color: colors.error }}>失败: {proxy.failure_count}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div style={s.card}>
          {activeSessions.length === 0 ? (
            <div style={{ textAlign: 'center', color: colors.textSecondary, padding: spacing[10] }}>暂无活跃会话</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {activeSessions.map(sessionId => (
                <div key={sessionId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing[3], backgroundColor: colors.background, borderRadius: borderRadius.base }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
                    <div style={{ width: 8, height: 8, backgroundColor: colors.success, borderRadius: '50%' }} />
                    <code style={{ fontSize: 12 }}>{sessionId}</code>
                  </div>
                  <button
                    style={{ ...s.button, backgroundColor: colors.errorLight, color: colors.error, padding: '6px 12px', fontSize: 12 }}
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
          <div style={{ backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing[6], width: 480, maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ margin: `0 0 ${spacing[5]}`, fontSize: 20 }}>创建浏览器配置</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: spacing[1] + 2 }}>配置名称</label>
                <input style={s.input} value={newProfile.name} onChange={e => setNewProfile(p => ({ ...p, name: e.target.value }))} placeholder="例如：越南店-竞品分析" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: spacing[1] + 2 }}>目标地区</label>
                <select style={s.select} value={newProfile.region} onChange={e => setNewProfile(p => ({ ...p, region: e.target.value }))}>
                  {REGIONS.map(r => <option key={r.code} value={r.code}>{r.flag} {r.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: spacing[1] + 2 }}>关联店铺ID (可选)</label>
                <input style={s.input} value={newProfile.store_id} onChange={e => setNewProfile(p => ({ ...p, store_id: e.target.value }))} />
              </div>
              <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: spacing[4] }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: spacing[3] }}>代理配置 (可选)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: spacing[1] }}>代理类型</label>
                    <select style={s.select} value={newProfile.proxy_type} onChange={e => setNewProfile(p => ({ ...p, proxy_type: e.target.value }))}>
                      <option value="http">HTTP</option>
                      <option value="socks5">SOCKS5</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: spacing[1] }}>代理地址</label>
                    <input style={s.input} value={newProfile.proxy_host} onChange={e => setNewProfile(p => ({ ...p, proxy_host: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: spacing[1] }}>端口</label>
                    <input style={s.input} value={newProfile.proxy_port} onChange={e => setNewProfile(p => ({ ...p, proxy_port: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: spacing[3], marginTop: spacing[2] }}>
                <button style={{ ...s.button, flex: 1, backgroundColor: colors.primaryLight, color: colors.textSecondary }} onClick={() => setShowCreateModal(false)}>取消</button>
                <button style={{ ...s.button, flex: 1, backgroundColor: colors.primary, color: colors.surface }} onClick={createProfile} disabled={!newProfile.name}>创建</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Proxy Modal */}
      {showProxyModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing[6], width: 400 }}>
            <h2 style={{ margin: `0 0 ${spacing[5]}`, fontSize: 20 }}>添加代理</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: spacing[1] + 2 }}>代理地址</label>
                  <input style={s.input} value={newProxy.host} onChange={e => setNewProxy(p => ({ ...p, host: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: spacing[1] + 2 }}>端口</label>
                  <input style={s.input} value={newProxy.port} onChange={e => setNewProxy(p => ({ ...p, port: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: spacing[1] + 2 }}>类型</label>
                  <select style={s.select} value={newProxy.proxy_type} onChange={e => setNewProxy(p => ({ ...p, proxy_type: e.target.value }))}>
                    <option value="http">HTTP</option>
                    <option value="socks5">SOCKS5</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: spacing[1] + 2 }}>国家</label>
                  <select style={s.select} value={newProxy.country} onChange={e => setNewProxy(p => ({ ...p, country: e.target.value }))}>
                    {REGIONS.map(r => <option key={r.code} value={r.code}>{r.flag} {r.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: spacing[3], marginTop: spacing[2] }}>
                <button style={{ ...s.button, flex: 1, backgroundColor: colors.primaryLight, color: colors.textSecondary }} onClick={() => setShowProxyModal(false)}>取消</button>
                <button style={{ ...s.button, flex: 1, backgroundColor: colors.primary, color: colors.surface }} onClick={createProxy} disabled={!newProxy.host || !newProxy.port}>添加</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
