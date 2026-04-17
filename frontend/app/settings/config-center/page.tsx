'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchConfigStatus,
  fetchLLMProviders,
  saveLLMConfig,
  saveShopeeCredentials,
  startShopeeAuthorization,
  disconnectShopee,
  save1688Credentials,
  start1688Authorization,
  disconnect1688,
  saveSystemApiKey,
  type ConfigStatus,
  type LLMProviderInfo,
} from '@/lib/api';
import { colors, borderRadius, spacing, shadows, commonStyles } from '@/lib/design-system';

type Feedback = { tone: 'success' | 'error'; text: string };

export default function ConfigCenterPage() {
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [providers, setProviders] = useState<Record<string, LLMProviderInfo>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [llmProvider, setLlmProvider] = useState('openai');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmApiBase, setLlmApiBase] = useState('');
  const [llmModel, setLlmModel] = useState('');

  const [shopeeClientId, setShopeeClientId] = useState('');
  const [shopeeClientSecret, setShopeeClientSecret] = useState('');

  const [alibaba1688ClientId, setAlibaba1688ClientId] = useState('');
  const [alibaba1688ClientSecret, setAlibaba1688ClientSecret] = useState('');

  const [systemApiKey, setSystemApiKey] = useState('');

  const loadConfig = useCallback(async () => {
    try {
      const [status, provs] = await Promise.all([fetchConfigStatus(), fetchLLMProviders()]);
      setConfigStatus(status);
      setProviders(provs);

      if (status.llm) {
        setLlmProvider(status.llm.provider || 'openai');
        setLlmApiBase(status.llm.api_base || '');
        setLlmModel(status.llm.model || '');
      }
    } catch {
      setFeedback({ tone: 'error', text: '加载配置失败，请检查后端服务是否运行' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const showFeedback = (tone: 'success' | 'error', text: string) => {
    setFeedback({ tone, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleSaveLLM = async () => {
    setSaving('llm');
    try {
      const result = await saveLLMConfig({
        provider: llmProvider,
        api_key: llmApiKey,
        api_base: llmApiBase,
        model: llmModel,
      });
      showFeedback('success', `LLM 配置已保存 - ${result.enabled ? '已启用' : '未启用（缺少API Key）'}`);
      loadConfig();
    } catch (e: unknown) {
      showFeedback('error', `保存失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setSaving(null);
    }
  };

  const handleShopeeAuth = async () => {
    setSaving('shopee');
    try {
      await saveShopeeCredentials(shopeeClientId, shopeeClientSecret);
      const result = await startShopeeAuthorization();
      if (result.authorize_url) {
        window.open(result.authorize_url, '_blank', 'width=800,height=600');
        showFeedback('success', '已打开 Shopee 授权页面，请在弹窗中完成授权');
      }
      loadConfig();
    } catch (e: unknown) {
      showFeedback('error', `Shopee 授权失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setSaving(null);
    }
  };

  const handleShopeeDisconnect = async () => {
    setSaving('shopee');
    try {
      await disconnectShopee();
      showFeedback('success', 'Shopee 已断开连接');
      loadConfig();
    } catch (e: unknown) {
      showFeedback('error', `断开失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setSaving(null);
    }
  };

  const handle1688Auth = async () => {
    setSaving('1688');
    try {
      await save1688Credentials(alibaba1688ClientId, alibaba1688ClientSecret);
      const result = await start1688Authorization();
      if (result.authorize_url) {
        window.open(result.authorize_url, '_blank', 'width=800,height=600');
        showFeedback('success', '已打开 1688 授权页面，请在弹窗中完成授权');
      }
      loadConfig();
    } catch (e: unknown) {
      showFeedback('error', `1688 授权失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setSaving(null);
    }
  };

  const handle1688Disconnect = async () => {
    setSaving('1688');
    try {
      await disconnect1688();
      showFeedback('success', '1688 已断开连接');
      loadConfig();
    } catch (e: unknown) {
      showFeedback('error', `断开失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveApiKey = async () => {
    setSaving('apikey');
    try {
      await saveSystemApiKey(systemApiKey);
      showFeedback('success', '系统 API Key 已保存');
      loadConfig();
    } catch (e: unknown) {
      showFeedback('error', `保存失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setSaving(null);
    }
  };

  const currentProviderInfo = providers[llmProvider];
  const availableModels = currentProviderInfo?.models || [];

  if (loading) {
    return (
      <div style={commonStyles.pageContainer}>
        <div style={commonStyles.loadingContainer}>加载配置中...</div>
      </div>
    );
  }

  return (
    <div style={commonStyles.pageContainer}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={commonStyles.pageHeader}>
          <div>
            <h1 style={commonStyles.pageTitle}>⚙️ 系统配置中心</h1>
            <p style={commonStyles.pageDescription}>
              配置 AI 模型、店铺授权和系统密钥，完成配置后即可开始全自动运营
            </p>
          </div>
        </div>

        {feedback && (
          <div
            style={{
              ...commonStyles.card,
              marginBottom: spacing[4],
              backgroundColor: feedback.tone === 'success' ? colors.successLight : colors.errorLight,
              borderColor: feedback.tone === 'success' ? colors.success : colors.error,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ color: feedback.tone === 'success' ? '#166534' : '#991b1b', fontSize: 14 }}>
              {feedback.text}
            </span>
            <button
              onClick={() => setFeedback(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: colors.textSecondary }}
            >
              ✕
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gap: spacing[5] }}>
          {/* ===== 配置状态总览 ===== */}
          <section style={commonStyles.card}>
            <h2 style={{ ...commonStyles.subsectionHeader, display: 'flex', alignItems: 'center', gap: 8 }}>
              📊 配置状态总览
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: spacing[3] }}>
              <StatusCard
                label="AI 模型"
                status={configStatus?.llm?.enabled ? 'ok' : 'pending'}
                detail={configStatus?.llm?.enabled ? `${configStatus.llm.provider} / ${configStatus.llm.model}` : '未配置'}
              />
              <StatusCard
                label="Shopee 店铺"
                status={configStatus?.shopee?.authorized ? 'ok' : 'pending'}
                detail={configStatus?.shopee?.authorized ? configStatus.shopee.shop_name || configStatus.shopee.shop_id || '已连接' : '未授权'}
              />
              <StatusCard
                label="1688 采集"
                status={configStatus?.alibaba_1688?.authorized ? 'ok' : 'pending'}
                detail={configStatus?.alibaba_1688?.authorized ? '已授权' : '未授权'}
              />
              <StatusCard
                label="系统密钥"
                status={configStatus?.system_api_key_set ? 'ok' : 'pending'}
                detail={configStatus?.system_api_key_set ? '已设置' : '未设置'}
              />
            </div>
            {configStatus?.ready_for_production && (
              <div style={{
                marginTop: spacing[3],
                padding: `${spacing[2]}px ${spacing[4]}px`,
                backgroundColor: colors.successLight,
                borderRadius: borderRadius.base,
                color: '#166534',
                fontSize: 14,
                fontWeight: 600,
              }}>
                ✅ 所有配置已完成，系统已就绪！
              </div>
            )}
          </section>

          {/* ===== AI 模型配置 ===== */}
          <section style={commonStyles.card}>
            <h2 style={{ ...commonStyles.subsectionHeader, display: 'flex', alignItems: 'center', gap: 8 }}>
              🤖 AI 模型配置
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: 13, marginBottom: spacing[4] }}>
              选择 AI 服务商并配置 API Key，系统将使用此模型生成商品标题、描述和审核内容
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4] }}>
              <div>
                <label style={commonStyles.label}>AI 服务商</label>
                <select
                  value={llmProvider}
                  onChange={(e) => {
                    const p = e.target.value;
                    setLlmProvider(p);
                    const info = providers[p];
                    if (info) {
                      setLlmApiBase(info.api_base);
                      setLlmModel(info.models[0] || '');
                    }
                  }}
                  style={{
                    ...commonStyles.inputBase,
                    height: 40,
                    cursor: 'pointer',
                  }}
                >
                  {Object.entries(providers).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.name} ({info.protocol === 'anthropic' ? 'Anthropic 协议' : 'OpenAI 协议'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={commonStyles.label}>模型</label>
                <select
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  style={{
                    ...commonStyles.inputBase,
                    height: 40,
                    cursor: 'pointer',
                  }}
                >
                  {availableModels.length > 0 ? (
                    availableModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))
                  ) : (
                    <option value="">自定义模型</option>
                  )}
                </select>
              </div>
            </div>

            <div style={{ marginTop: spacing[3] }}>
              <label style={commonStyles.label}>API Key</label>
              <input
                type="password"
                value={llmApiKey}
                onChange={(e) => setLlmApiKey(e.target.value)}
                placeholder="sk-..."
                style={commonStyles.inputBase}
              />
            </div>

            <div style={{ marginTop: spacing[3] }}>
              <label style={commonStyles.label}>API Base URL {llmProvider === 'custom' && '(必填)'}</label>
              <input
                type="text"
                value={llmApiBase}
                onChange={(e) => setLlmApiBase(e.target.value)}
                placeholder="https://api.openai.com/v1"
                style={commonStyles.inputBase}
              />
            </div>

            <button
              onClick={handleSaveLLM}
              disabled={saving === 'llm'}
              style={{
                ...commonStyles.buttonBase,
                ...commonStyles.primaryButton,
                marginTop: spacing[4],
                opacity: saving === 'llm' ? 0.6 : 1,
              }}
            >
              {saving === 'llm' ? '保存中...' : '💾 保存 AI 模型配置'}
            </button>
          </section>

          {/* ===== Shopee 店铺授权 ===== */}
          <section style={commonStyles.card}>
            <h2 style={{ ...commonStyles.subsectionHeader, display: 'flex', alignItems: 'center', gap: 8 }}>
              🛍️ Shopee 店铺授权
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: 13, marginBottom: spacing[4] }}>
              授权后系统可自动发布商品到 Shopee 店铺，类似妙手ERP的店铺授权流程
            </p>

            {configStatus?.shopee?.authorized ? (
              <div>
                <div style={{
                  padding: `${spacing[3]}px ${spacing[4]}px`,
                  backgroundColor: colors.successLight,
                  borderRadius: borderRadius.base,
                  color: '#166534',
                  marginBottom: spacing[3],
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span>
                    ✅ Shopee 店铺已授权
                    {configStatus.shopee.shop_name && ` - ${configStatus.shopee.shop_name}`}
                    {configStatus.shopee.shop_id && ` (ID: ${configStatus.shopee.shop_id})`}
                  </span>
                  <button
                    onClick={handleShopeeDisconnect}
                    disabled={saving === 'shopee'}
                    style={{
                      ...commonStyles.buttonBase,
                      ...commonStyles.errorButton,
                      fontSize: 12,
                      padding: `${spacing[1]}px ${spacing[2]}px`,
                    }}
                  >
                    断开连接
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4] }}>
                  <div>
                    <label style={commonStyles.label}>Shopee Partner ID (Client ID)</label>
                    <input
                      type="text"
                      value={shopeeClientId}
                      onChange={(e) => setShopeeClientId(e.target.value)}
                      placeholder="输入你的 Shopee Partner ID"
                      style={commonStyles.inputBase}
                    />
                  </div>
                  <div>
                    <label style={commonStyles.label}>Shopee Partner Key (Client Secret)</label>
                    <input
                      type="password"
                      value={shopeeClientSecret}
                      onChange={(e) => setShopeeClientSecret(e.target.value)}
                      placeholder="输入你的 Shopee Partner Key"
                      style={commonStyles.inputBase}
                    />
                  </div>
                </div>

                <div style={{ marginTop: spacing[3], display: 'flex', gap: spacing[3], alignItems: 'center' }}>
                  <button
                    onClick={handleShopeeAuth}
                    disabled={saving === 'shopee' || !shopeeClientId || !shopeeClientSecret}
                    style={{
                      ...commonStyles.buttonBase,
                      backgroundColor: '#EE4D2D',
                      color: '#fff',
                      opacity: saving === 'shopee' || !shopeeClientId || !shopeeClientSecret ? 0.6 : 1,
                    }}
                  >
                    {saving === 'shopee' ? '授权中...' : '🔗 授权 Shopee 店铺'}
                  </button>
                  <span style={{ color: colors.textMuted, fontSize: 12 }}>
                    点击后将跳转到 Shopee 授权页面
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* ===== 1688 采集授权 ===== */}
          <section style={commonStyles.card}>
            <h2 style={{ ...commonStyles.subsectionHeader, display: 'flex', alignItems: 'center', gap: 8 }}>
              🏭 1688 采集授权
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: 13, marginBottom: spacing[4] }}>
              授权后系统可从 1688 自动采集商品数据，实现一键选品
            </p>

            {configStatus?.alibaba_1688?.authorized ? (
              <div style={{
                padding: `${spacing[3]}px ${spacing[4]}px`,
                backgroundColor: colors.successLight,
                borderRadius: borderRadius.base,
                color: '#166534',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>✅ 1688 已授权，可正常采集商品</span>
                <button
                  onClick={handle1688Disconnect}
                  disabled={saving === '1688'}
                  style={{
                    ...commonStyles.buttonBase,
                    ...commonStyles.errorButton,
                    fontSize: 12,
                    padding: `${spacing[1]}px ${spacing[2]}px`,
                  }}
                >
                  断开连接
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4] }}>
                  <div>
                    <label style={commonStyles.label}>1688 App Key</label>
                    <input
                      type="text"
                      value={alibaba1688ClientId}
                      onChange={(e) => setAlibaba1688ClientId(e.target.value)}
                      placeholder="输入 1688 App Key"
                      style={commonStyles.inputBase}
                    />
                  </div>
                  <div>
                    <label style={commonStyles.label}>1688 App Secret</label>
                    <input
                      type="password"
                      value={alibaba1688ClientSecret}
                      onChange={(e) => setAlibaba1688ClientSecret(e.target.value)}
                      placeholder="输入 1688 App Secret"
                      style={commonStyles.inputBase}
                    />
                  </div>
                </div>

                <div style={{ marginTop: spacing[3], display: 'flex', gap: spacing[3], alignItems: 'center' }}>
                  <button
                    onClick={handle1688Auth}
                    disabled={saving === '1688' || !alibaba1688ClientId || !alibaba1688ClientSecret}
                    style={{
                      ...commonStyles.buttonBase,
                      backgroundColor: '#FF5001',
                      color: '#fff',
                      opacity: saving === '1688' || !alibaba1688ClientId || !alibaba1688ClientSecret ? 0.6 : 1,
                    }}
                  >
                    {saving === '1688' ? '授权中...' : '🔗 授权 1688 账号'}
                  </button>
                  <span style={{ color: colors.textMuted, fontSize: 12 }}>
                    点击后将跳转到 1688 授权页面
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* ===== 系统 API Key ===== */}
          <section style={commonStyles.card}>
            <h2 style={{ ...commonStyles.subsectionHeader, display: 'flex', alignItems: 'center', gap: 8 }}>
              🔐 系统 API Key
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: 13, marginBottom: spacing[4] }}>
              设置系统访问密钥，用于保护 API 接口安全（生产环境必填）
            </p>

            <div>
              <label style={commonStyles.label}>API Key</label>
              <input
                type="password"
                value={systemApiKey}
                onChange={(e) => setSystemApiKey(e.target.value)}
                placeholder={configStatus?.system_api_key_set ? '已设置，输入新值可替换' : '输入 API Key'}
                style={commonStyles.inputBase}
              />
            </div>

            <button
              onClick={handleSaveApiKey}
              disabled={saving === 'apikey' || !systemApiKey}
              style={{
                ...commonStyles.buttonBase,
                ...commonStyles.primaryButton,
                marginTop: spacing[4],
                opacity: saving === 'apikey' || !systemApiKey ? 0.6 : 1,
              }}
            >
              {saving === 'apikey' ? '保存中...' : '💾 保存 API Key'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, status, detail }: { label: string; status: 'ok' | 'pending'; detail: string }) {
  return (
    <div
      style={{
        padding: spacing[4],
        borderRadius: borderRadius.md,
        backgroundColor: status === 'ok' ? colors.successLight : colors.warningLight,
        border: `1px solid ${status === 'ok' ? colors.success : colors.warning}`,
        boxShadow: shadows.sm,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4 }}>
        {status === 'ok' ? '✅' : '⏳'} {label}
      </div>
      <div style={{ fontSize: 12, color: colors.textSecondary }}>{detail}</div>
    </div>
  );
}
