# 跨境电商 AI 运营 + 选品 + 上架系统 V1 技术规范

## 1. 文档目标

本文档定义当前项目 V1 的产品范围、业务闭环、页面交互、状态机、数据模型、系统架构、风控规范、观测审计、验收标准与演进路线。目标不是产出一个演示型控制台，而是定义一套可落地的内部生产系统规范，使系统能够在真实 Shopee 越南站试点店中完成从机会发现到自动上架、异常治理、训练归档的真实闭环。

本文档默认服务于后续直接进入开发拆解，因此会优先写透：
- 页面交互
- 状态机与流程
- 数据模型
- 技术架构

---

## 2. 产品定义

### 2.1 产品定位

这是一个内部使用的跨境电商 AI 运营系统，第一阶段聚焦 Shopee 越南店铺，目标是构建一个接近全链路自动化的运营中台，覆盖：
- AI 机会发现
- AI 选品决策
- AI 内容改造
- AI 定价裁决
- Shopee 自动发布
- 半自动采购联动
- 异常告警与人工接管
- 审计追踪与训练数据沉淀

### 2.2 当前阶段目标

V1 的核心不是做一个可演示原型，而是做一个可在真实店铺内小范围投入使用的内部系统。系统必须具备以下四个硬交付：
- Shopee 真授权
- 真实自动发布
- 半自动采购单
- 训练数据归档

### 2.3 试点范围

V1 默认试点范围：
- 仅 1 家 Shopee 越南店
- 店铺定位为低风险试验店
- 自动发布仅允许在三重白名单内执行：
  - 店铺白名单
  - 类目白名单
  - 模板白名单

### 2.4 默认设计原则

当系统设计出现“效率 vs 安全”冲突时，V1 采用分层优先原则：
- 发布 / 采购 / 授权 / 风控链路：安全优先
- 选品 / 文案 / 机会发现链路：效率优先

即：前置探索可以更激进，最终执行闸门必须保守。

---

## 3. V1 范围与边界

### 3.1 V1 业务范围（In Scope）

V1 必须包含：
- Shopee OAuth 真授权、续期预警、失效阻断
- Shopee 站内需求信号采集与处理
- 1688 供给侧商品发现、评分与供货校验
- 机会商品体建模
- 候选批次生成与阶段并行工作流
- 类目属性映射
- 标题、卖点、图片改造
- AI 提议 + 规则裁决定价
- 自动质检与预飞检查
- Shopee 真实自动发布
- 发布结果回流
- 异常中心与店铺健康
- 人工接管待办与企业微信通知
- 半自动采购单生成
- 训练归档包输出

### 3.2 V1 明确不做（Out of Scope）

V1 明确不做以下完整闭环：
- 广告自动投放与自动预算调节
- 客服、售后、退款、纠纷、评价回复完整闭环
- 全自动采购下单
- 完整仓配履约链路

说明：
- 虽然 V1 不做自动采购下单，但会做到“创建待确认采购单”。
- 虽然 V1 不做完整仓配履约，但供货可用性、库存风险、MOQ 风险仍要纳入上架与采购前校验。

### 3.3 自动化降级原则

若外部接口或平台能力受限，V1 默认必须定义降级方案，而非只写理想态：
- 能自动执行的模块：自动执行
- 不能稳定自动执行的模块：自动降级为人工确认 / 人工导入 / 人工补位
- 所有降级路径必须可见、可审计、可恢复

---

## 4. 核心业务目标与验收指标

### 4.1 北极星目标

V1 第一优先北极星指标：
- 上架吞吐

但验收不以吞吐单项为准，而采用平衡门槛。

### 4.2 V1 核心验收门槛

连续 7 天满足：
- 日发商品数 >= 50
- 发布成功率 >= 85%
- 人工介入率 <= 30%
- 利润红线零突破

### 4.3 V1 可投入使用判定

必须同时满足：
- 真实 Shopee 店铺已连续跑通真实闭环
- 内部运营已开始日常使用，不依赖临时脚本与人工拼装
- 有可核验的真实运行指标证明系统不是 demo

---

## 5. 用户角色与权限模型

### 5.1 角色定义

V1 最小角色集：
- 管理员：管理授权、规则、模板、白名单、回流审核
- 运营：查看批次、处理异常、复核采购单、查看详情
- 负责人：查看全局、审批关键事项（V1 可与管理员合并）

### 5.2 权限边界

V1 默认权限粒度：
- 店铺级权限

即：
- 按店铺隔离数据与操作范围
- 同一用户只能访问被授权店铺的数据
- 后续要为三类店铺级隔离预留结构：
  - 利润与定价策略
  - 选品范围与黑白名单
  - 发布模板与内容模板

### 5.3 规则治理

V1 默认规则治理策略：
- 管理员直接生效

但系统必须支持：
- 每次规则变更留版本
- 每次规则变更留审计记录
- 后续可扩展为审批、灰度、回滚机制

---

## 6. 核心对象与领域模型

### 6.1 核心主实体：机会商品体

V1 的系统中心实体不是 1688 商品，也不是 Shopee 商品，而是“机会商品体（Opportunity Item）”。

#### 定义
机会商品体是一个中间业务实体，用于汇总并承载：
- Shopee 需求侧证据
- 1688 供给侧证据
- AI 评分与解释
- 类目/属性/变体映射结果
- 内容生成版本
- 定价版本
- 预飞检查结果
- 发布记录
- 采购建议
- 人工修正记录
- 训练反馈

#### 为什么采用机会商品体
- 一个 Shopee 机会可能映射多个 1688 供货源
- 一个商品在不同批次中会有不同策略版本
- 发布前后有多个内容、定价、风控状态版本
- 需要统一承载“决策过程”，而不是仅承载“最终商品”

### 6.2 核心实体列表

V1 最小核心实体：
- Store：店铺
- StoreAuthorization：店铺授权
- OpportunityBatch：候选批次
- OpportunityItem：机会商品体
- DemandSignalSnapshot：需求信号快照
- SupplyCandidate：供货候选
- CategoryMapping：类目属性映射
- ContentVariant：内容改造版本
- PricingDecision：定价决策
- PreflightCheck：预飞检查
- PublishTask：发布任务
- PublishResult：发布结果
- ProcurementDraft：采购单草稿
- Incident：异常事件
- StoreHealthStatus：店铺健康状态
- AgentRun：Agent 执行记录
- DecisionAuditLog：决策审计日志
- FeedbackRecord：人工修正与结果回流
- TrainingArchivePackage：训练归档包

---

## 7. 页面与交互规范

V1 必须定义四个核心页面到交互级别：
- 首页总览
- 批次指挥台
- 机会商品详情
- 异常与店铺健康

### 7.1 首页总览

#### 页面目标
首页不是展示型 BI，而是运营每日进入系统后的第一决策入口。默认采用“总览 + 下钻”结构。

#### 第一屏必须展示
1. 今日全局指标
   - 今日已发布数
   - 发布成功率
   - 当前运行批次数
   - 当前阻塞任务数
   - 当前人工待处理数
   - 利润红线告警数

2. 四类关键入口卡
   - 批次概览
   - 异常告警
   - 新机会数
   - 利润与成本波动

3. 实时状态区
   - 正在运行的批次
   - 最近失败任务
   - 最近店铺健康变化

4. 快速下钻入口
   - 进入批次指挥台
   - 进入异常中心
   - 进入店铺健康页
   - 进入机会商品详情

#### 交互要求
- 第一屏不做深表单操作
- 所有卡片可点击下钻
- 关键异常必须红色高显
- 首页需要近实时刷新
- 首页要优先突出“当前要处理什么”，而不是“历史统计”

### 7.2 批次指挥台

#### 页面目标
承载系统主链路执行控制，是 V1 的主工作台。

#### 页面结构
1. 顶部批次概览
   - 批次名称
   - 触发方式（定时 / 模板 / 信号）
   - 所属店铺
   - 当前阶段
   - 状态分布
   - 开始时间 / 最近更新时间

2. 阶段看板
   - 召回中
   - 评分中
   - 改造中
   - 映射中
   - 定价中
   - 预飞检查中
   - 待发布
   - 发布中
   - 已成功
   - 已拦截
   - 需人工处理

3. 批量操作区
   - 启动/暂停批次
   - 重放失败项
   - 导出批次数据
   - 查看异常项

4. 候选列表区
   - 机会商品体 ID
   - 当前阶段
   - 综合得分
   - 风险标签
   - 供货候选数
   - 当前推荐货源
   - 当前建议售价
   - 是否已通过预飞检查

#### 交互要求
- 阶段数量变化近实时刷新
- 支持按阶段、风险、分数、失败类型过滤
- 支持一键跳转到机会商品详情
- 支持按失败类型筛出一类问题商品
- 支持显示阶段并行下的卡点位置

### 7.3 机会商品详情

#### 页面目标
为运营、管理员提供一条商品从机会发现到最终动作的完整解释界面。

#### 必须包含的区块
1. 基本信息
   - 机会商品体 ID
   - 所属批次
   - 所属店铺
   - 当前状态
   - 风险等级

2. 需求侧证据
   - 命中热词
   - 榜单来源
   - 竞品样本
   - 价格带
   - 差评痛点摘要

3. 供给侧证据
   - 1688 候选货源列表
   - 成本
   - MOQ
   - 发货地
   - 供货稳定性评分
   - 图文质量评分

4. 映射结果
   - 推荐类目
   - 属性映射结果
   - 变体结构
   - 映射置信度
   - 映射依据

5. 内容版本
   - 标题版本历史
   - 卖点版本历史
   - 图片改造前后对比
   - 模板版本

6. 定价版本
   - 成本拆解
   - 平台费率
   - 汇率与缓冲
   - 竞品价带
   - 建议售价
   - 规则裁决结果

7. 决策解释
   - 评分明细
   - 决策时间线
   - 自然语言解释

8. 发布与采购
   - 发布任务状态
   - 发布返回结果
   - 采购草稿状态

9. 人工操作区
   - 查看原因
   - 标记修正
   - 提交人工修正建议
   - 查看审计链路

#### 交互要求
- 必须支持前后版本对比
- 必须支持一键查看完整决策时间线
- 必须支持快速识别“为什么被拦截 / 为什么被选中”

### 7.4 异常与店铺健康

#### 页面目标
这是无人值守能力的安全底座。页面必须实现异常事件、阻塞任务、店铺健康三层联动。

#### 页面结构
1. 异常事件列表
   - 异常等级
   - 异常类型
   - 触发时间
   - 影响范围
   - 当前状态
   - 是否已通知

2. 阻塞任务区
   - 被阻塞批次
   - 被阻塞机会商品体数量
   - 阻塞阶段
   - 是否可恢复

3. 店铺健康区
   - OAuth 状态
   - API 配额状态
   - 最近失败率
   - 风控状态
   - 自动暂停状态

4. 恢复操作区
   - 标记已处理
   - 恢复任务
   - 恢复店铺
   - 查看关联日志

#### 交互要求
- P0 必须高显
- 支持按店铺过滤
- 支持按异常类型聚合
- 支持直接跳转到受影响批次和商品
- 近实时刷新必须覆盖异常中心与店铺健康

---

## 8. 业务流程与状态机

### 8.1 主业务骨架

V1 采用“批次主链路”作为开发主轴，完整流程：

1. 机会发现
2. 候选批次生成
3. 供需证据聚合
4. 机会评分与排序
5. 货源选择
6. 类目属性映射
7. 内容改造
8. 定价裁决
9. 自动复核
10. 预飞检查
11. 自动发布
12. 结果回流
13. 异常处理
14. 半自动采购单生成
15. 训练归档

### 8.2 候选批次状态机

OpportunityBatch.status：
- draft
- queued
- running
- paused
- blocked
- completed
- completed_with_issues
- failed
- archived

#### 状态说明
- draft：已创建未启动
- queued：等待调度
- running：流程执行中
- paused：人工暂停
- blocked：因异常阻塞
- completed：全部完成
- completed_with_issues：主流程完成但仍存在人工项
- failed：批次失败
- archived：已归档

### 8.3 机会商品体状态机

OpportunityItem.status：
- discovered
- shortlisted
- sourcing_scored
- mapping_in_progress
- mapping_confirmed
- content_generating
- pricing_ready
- review_passed
- preflight_passed
- publish_queued
- publishing
- published
- blocked
- rejected
- manual_required
- procurement_draft_ready
- archived

#### 关键硬状态
在“待发布”前，最终硬门为：
- preflight_passed

预飞通过前，不允许进入 publish_queued。

#### 关键说明
- mapping_confirmed 是重要中间硬状态
- pricing_ready 表示价格已完成规则裁决
- review_passed 表示内部自动质检通过
- preflight_passed 表示利润、合规、库存、账号健康最终通过

### 8.4 发布任务状态机

PublishTask.status：
- pending
- ready
- queued
- running
- succeeded
- failed_retryable
- failed_terminal
- blocked
- cancelled

#### 恢复策略
V1 默认采用“按阶段差异化恢复”：
- 采集/生成类任务：可重跑
- 发布/授权/扣费相关任务：必须幂等续跑

### 8.5 采购草稿状态机

ProcurementDraft.status：
- draft
- awaiting_confirmation
- confirmed
- invalidated
- cancelled
- archived

#### 关键规则
- V1 不自动下单
- 系统创建待确认采购单后，人工必须能够看到并修改：
  - 供应商
  - 规格
  - 数量
  - 采购价
- 若价格上涨导致利润线失效：
  - 自动打回重算
  - 状态转 invalidated

### 8.6 异常事件状态机

Incident.status：
- open
- acknowledged
- mitigated
- resolved
- suppressed

StoreHealthStatus.status：
- healthy
- degraded
- warning
- blocked
- paused_by_system

---

## 9. 机会发现与选品策略

### 9.1 机会发现器主路径

第一阶段默认策略：
- 规则召回 + AI 排序

### 9.2 规则召回输入源

Shopee 需求侧：
- 搜索热词
- 榜单趋势
- 竞品销量与价格带
- 评价痛点

1688 供给侧：
- 商品标题
- 类目
- 图片素材
- 成本
- MOQ
- 发货地
- 店铺稳定性

### 9.3 评分原则

AI 排序应综合考虑：
- 需求热度
- 竞品成熟度
- 价格带可切入性
- 供货稳定性
- 图文改造空间
- 利润空间
- 类目映射风险
- 素材风险

### 9.4 解释能力

所有“选中 / 拒绝 / 拦截”都必须支持三种解释形态：
- 评分明细
- 决策时间线
- 自然语言说明

---

## 10. 供给侧策略（1688）

### 10.1 第一阶段能力边界

1688 侧 V1 实际做到：
- 商品发现
- 供货评分
- 成本/库存/供货能力校验
- 创建待确认采购单

### 10.2 供货选择策略

默认策略：
- 按店铺策略切换

店铺策略至少支持：
- 利润优先
- 稳定优先
- 低价优先

### 10.3 供货评分因子

必须纳入评分：
- 采购价
- 起订量
- 发货地
- 发货稳定性
- 店铺可靠性
- 图文质量
- 是否存在质量不稳定风险
- 是否存在供货波动风险

### 10.4 红线过滤

以下全部视为硬红线候选：
- 发货不稳
- 图文质量差
- MOQ 不合适
- 货不对板风险高

若命中硬红线，可直接排除或大幅降权。

---

## 11. 类目与属性映射策略

### 11.1 主路径

第一阶段主路径：
- 竞品反推主导

实现原则：
- 优先参考 Shopee 对标竞品的类目与属性结构
- 高频类目逐步沉淀模板
- 长尾和缺失字段由 AI 补齐并输出置信度

### 11.2 核心风控点

类目属性映射是第一阶段最优先评估的 AI 输出质量项。

原因：
- 错映射会导致审核失败
- 错映射会导致售后风险
- 错映射会放大后续定价、文案、变体结构错误

### 11.3 映射门控

必须输出：
- 推荐类目
- 属性值集合
- 变体结构
- 置信度
- 来源依据

若映射不确定：
- 命中强拦截
- 不允许自动发布

---

## 12. 内容生成与本地化策略

### 12.1 内容策略

第一阶段默认：
- 按类目切换

即：不同类目采用不同的：
- 标题结构
- 卖点表达方式
- 主图模板
- 图片风格
- 文案重心

### 12.2 越南本地化资产

V1 要建设三层本地化资产：
- 越南关键词库
- 类目表达模板
- 价格心理模型

其中第一优先做深：
- 越南关键词库

关键词库应包含：
- 核心搜索词
- 长尾词
- 同义词
- 站点表达
- 禁用词
- 类目词典

### 12.3 翻译与本地化风险

系统最需要防范：
- 机翻生硬
- 属性误译
- 关键词偏差
- 文化不适配

### 12.4 图片处理策略

第一阶段主路径：
- 规则处理 + 生成式混合

#### 规则处理部分
- 抠图
- 裁切
- 翻译替换
- 尺寸规范化
- 模板合成

#### 生成式增强部分
- 卖点图生成
- 场景图增强
- 多图生成

### 12.5 素材处理必须具备的能力

V1 必须内建：
- 翻译改图
- 主图规范化
- 多图生成

### 12.6 合规风险

以下素材风险必须纳入拦截规则：
- 素材侵权
- 水印残留
- 禁词与违规承诺
- 尺寸/主图规范不符

---

## 13. 定价与利润控制

### 13.1 默认机制

最终售价默认机制：
- AI 提议 + 规则裁决

### 13.2 硬约束字段

以下必须入库、可配置、可审计：
- 成本
- 国内运费
- 国际运费
- 包材
- 平台费率
- 税费
- 支付手续费
- 汇率
- 汇损缓冲
- 最低毛利/净利线
- 竞品价格带

### 13.3 价格策略输入

定价时必须综合：
- 成本结构
- 费率结构
- 汇率风险
- 竞品价带
- 类目价格心理区间
- 店铺策略

### 13.4 利润红线

利润不达标是自动发布强拦截条件。

### 13.5 采购阶段重算

若采购草稿阶段价格变化导致利润失效：
- 自动打回定价 / 供货选择阶段重算
- 不允许沿用旧结论继续采购或发布

---

## 14. 自动复核与预飞检查

### 14.1 默认复核策略

V1 不采用人工逐条复核，而采用：
- 规则自动放行

### 14.2 强制拦截条件

以下命中必须拦截：
- 利润不达标
- 映射不确定
- 素材风险
- 账号异常

### 14.3 预飞检查

进入发布前，必须合成最终 preflight gate，检查：
- 利润校验
- 合规校验
- 库存/供货校验
- 账号健康校验

只有 preflight_passed 的机会商品体才能进入 publish_queued。

---

## 15. Shopee 授权与发布架构

### 15.1 授权机制

V1 使用：
- Shopee 平台 OAuth 真授权

### 15.2 授权生命周期策略

默认策略：
- 双保险机制

包括：
- 自动续期优先
- 到期前预警
- 续期失败后阻断高风险动作
- 通知人工重新授权

### 15.3 发布器架构

V1 发布器默认采用：
- 双通道发布器

含义：
- 主通道：官方 API
- 补位通道：人工降级 / 后续可扩展其他方式

同时建议在系统内部做统一发布抽象层，屏蔽未来平台差异。

### 15.4 发布幂等

发布幂等必须采用多层幂等：
- 任务层
- 商品层
- 店铺层

目标：
- 防止服务重启后重复发布
- 防止批次重复触发导致重复铺货
- 防止同一机会商品在同店重复上架

---

## 16. 采购联动设计

### 16.1 V1 范围

V1 的采购闭环为：
- 创建待确认采购单
- 不自动下单

### 16.2 待确认采购单内容

人工确认前必须完整展示并允许修改：
- 供应商
- 规格
- 数量
- 采购价

### 16.3 采购单生成条件

采购草稿只能来源于：
- 已完成供货选择
- 已完成定价裁决
- 已存在可执行的推荐供货方案

### 16.4 采购异常策略

若价格上涨、供货异常、利润线失效：
- 自动打回重算
- 原采购草稿失效
- 必须生成新的决策记录

---

## 17. 异常、风控与店铺保护

### 17.1 异常分级

建议最低支持：
- P0：立即暂停高风险链路
- P1：高优先级人工处理
- P2：一般阻塞
- P3：普通提示

### 17.2 P0 定义

用户已确认的 P0 类型：
- 素材/合规高风险

### 17.3 P0 默认动作

命中 P0 后默认采用“分层暂停”：
- 暂停整店高风险执行链路
  - 自动发布
  - 采购确认后续动作
  - 高风险变更任务
- 保留低风险能力
  - 采集
  - 分析
  - 日志查看
  - 人工修复

### 17.4 无人接管保护

若企业微信告警发出后 30 分钟无人处理：
- 系统自动暂停店铺

### 17.5 外部变化应对

若 Shopee / 1688 接口、页面、授权策略变化：
- 局部隔离受影响模块
- 尽量降级为人工路径
- 其他未受影响链路继续运行

---

## 18. 人工接管与通知

### 18.1 人工接管触发条件

当 AI 无法处理以下问题时必须通知人工：
- 账号异常
- 授权失效
- 风控预警
- 高风险合规异常
- 严重映射不确定

### 18.2 通知渠道

V1 必须支持：
- 站内待办
- 企业微信 / 微信通知

### 18.3 人工处理目标时效

默认处理时效：
- 30 分钟内接管

---

## 19. 回流学习与知识沉淀

### 19.1 人工修改回流策略

人工修改 AI 输出后，采用双轨回流：
- 规则候选
- 模型反馈样本

### 19.2 吸收机制

回流结果不直接生效，默认：
- 管理员审核后吸收

### 19.3 知识沉淀目标

V1 要同时建设：
- 规则库
- 模板库
- Agent 经验记忆库

### 19.4 优先优化回路

虽然长期希望全链路都学，但第一优先优化主评估项是：
- 类目属性映射

---

## 20. 数据归档与训练包

### 20.1 归档目标

所有周期性数据都应能打包压缩，用于后续 AI 训练与经验沉淀。

### 20.2 归档维度

V1 默认双维度归档：
- 按店铺归档
- 按批次归档

### 20.3 训练包必须全量包含

- 完整决策链
- 人工修正记录
- 发布与结果反馈

### 20.4 存储策略

默认：
- 热数据本地可快速访问
- 正式素材与长期归档进入对象存储

建议：
- 数据库存元数据
- 文件与压缩包存储在对象存储 / 归档存储中

---

## 21. 观测、审计与解释性

### 21.1 必须内建的观测能力

V1 必须内建：
- 任务状态追踪
- Agent 决策日志
- 成本与收益面板
- 告警与恢复记录

### 21.2 审计链路覆盖范围

必须全量审计：
- 选品决策
- 内容改造
- 定价决策
- 发布执行

### 21.3 Agent 审计要求

每次 Agent 执行至少要记录：
- Agent 类型
- 输入摘要
- 输出摘要
- 模型版本
- 命中规则
- 证据来源
- 耗时
- token 或调用成本
- 关联实体 ID

### 21.4 解释能力要求

所有高价值决策必须支持：
- 结构化评分明细
- 时间线回放
- 面向运营的自然语言解释

---

## 22. 技术架构规范

### 22.1 总体架构原则

V1 采用混合式内部系统架构：
- Web 全栈管理台
- Python 后端服务
- 系统级工作流引擎
- 多角色 Agent 编排
- 真实平台接入
- 审计与归档体系

### 22.2 建议技术栈

#### 前端
- Next.js
- React
- TypeScript
- 实时状态更新（WebSocket / SSE / 轮询混合）

#### 后端
- Python
- FastAPI 或同类高性能 API 框架
- 工作流编排模块
- 多 Agent 调度模块

#### 数据
- PostgreSQL 作为主数据库

#### 文件
- 本地存储 + 对象存储混合

#### 模型
- 外部 API 为主
- 多模型分工

### 22.3 系统级工作流引擎要求

V1 已明确需要系统级工作流引擎。它必须优先解决三件事：
- 长流程恢复
- 并发编排
- 可审计可视化

#### 最低要求
- 支持批次级、商品级任务状态追踪
- 支持阶段并行
- 支持任务重试
- 支持断点恢复
- 支持补偿逻辑
- 支持与 UI 状态联动

### 22.4 Agent 编排策略

V1 默认采用：
- 主 Agent 调度 + 多角色 Agent 分工

建议角色至少包括：
- 机会发现 Agent
- 供货评分 Agent
- 类目映射 Agent
- 内容生成 Agent
- 定价 Agent
- 质检 Agent
- 发布 Agent
- 归档 Agent

主 Agent 负责：
- 决定流程推进
- 选择调用哪些子 Agent
- 聚合结果
- 输出统一解释

### 22.5 数据刷新策略

默认：
- 事件驱动 + 定时补偿

分层建议：
- 发布状态：近实时
- 竞品价格带：分钟级
- 榜单趋势：分钟级 / 小时级
- 评价痛点：小时级

### 22.6 并发控制策略

V1 单店默认：
- 保守并发

原则：
- 采集与分析允许较高并发
- 发布链路严格限流
- 采购确认相关链路低并发
- 后续可扩展为基于店铺健康的动态并发控制

---

## 23. 数据模型建议（逻辑层）

以下为 V1 核心逻辑表设计建议。

### 23.1 stores
- id
- name
- platform
- market
- status
- is_whitelisted
- created_at
- updated_at

### 23.2 store_authorizations
- id
- store_id
- auth_type
- access_token_ref
- refresh_token_ref
- expires_at
- status
- last_refresh_at
- last_error
- created_at
- updated_at

### 23.3 opportunity_batches
- id
- store_id
- trigger_type
- trigger_payload
- status
- priority
- started_at
- completed_at
- created_at
- updated_at

### 23.4 opportunity_items
- id
- batch_id
- store_id
- status
- risk_level
- score_total
- current_supply_candidate_id
- current_mapping_id
- current_content_variant_id
- current_pricing_decision_id
- preflight_status
- publish_idempotency_key
- created_at
- updated_at

### 23.5 demand_signal_snapshots
- id
- opportunity_item_id
- signal_type
- source
- payload
- snapshot_time

### 23.6 supply_candidates
- id
- opportunity_item_id
- source_platform
- source_item_ref
- supplier_ref
- cost_amount
- moq
- ship_from
- reliability_score
- image_quality_score
- status
- created_at

### 23.7 category_mappings
- id
- opportunity_item_id
- category_ref
- attributes_payload
- variation_payload
- confidence_score
- evidence_payload
- status
- created_at

### 23.8 content_variants
- id
- opportunity_item_id
- title
- bullet_points
- image_bundle_ref
- template_ref
- locale
- version_no
- status
- created_at

### 23.9 pricing_decisions
- id
- opportunity_item_id
- cost_payload
- fee_payload
- exchange_rate_payload
- competitor_band_payload
- suggested_price
- final_price
- min_profit_line
- decision_reason
- status
- created_at

### 23.10 preflight_checks
- id
- opportunity_item_id
- profit_check
- compliance_check
- supply_check
- account_health_check
- overall_result
- detail_payload
- created_at

### 23.11 publish_tasks
- id
- opportunity_item_id
- store_id
- status
- channel
- idempotency_key
- request_payload
- response_payload
- retry_count
- last_error
- created_at
- updated_at

### 23.12 publish_results
- id
- publish_task_id
- platform_item_ref
- result_type
- detail_payload
- created_at

### 23.13 procurement_drafts
- id
- opportunity_item_id
- supplier_ref
- sku_payload
- qty
- purchase_price
- status
- invalid_reason
- created_at
- updated_at

### 23.14 incidents
- id
- store_id
- batch_id
- opportunity_item_id
- severity
- incident_type
- status
- detail_payload
- notified_channels
- created_at
- updated_at

### 23.15 store_health_status
- id
- store_id
- auth_status
- quota_status
- risk_status
- pause_status
- last_checked_at
- detail_payload

### 23.16 agent_runs
- id
- agent_name
- model_name
- entity_type
- entity_id
- input_summary
- output_summary
- evidence_payload
- cost_payload
- status
- started_at
- ended_at

### 23.17 decision_audit_logs
- id
- entity_type
- entity_id
- action_type
- actor_type
- actor_ref
- before_payload
- after_payload
- reason
- created_at

### 23.18 feedback_records
- id
- opportunity_item_id
- feedback_type
- source_type
- reviewer_ref
- before_payload
- after_payload
- review_status
- created_at

### 23.19 training_archive_packages
- id
- store_id
- batch_id
- package_type
- storage_uri
- manifest_payload
- created_at

---

## 24. 接口与服务边界（逻辑）

### 24.1 内部模块划分

建议最小后端模块：
- auth-service：店铺授权
- batch-service：批次管理
- opportunity-service：机会商品体管理
- demand-service：需求信号采集
- sourcing-service：供货评分与候选管理
- mapping-service：类目属性映射
- content-service：内容与图片改造
- pricing-service：定价
- preflight-service：预飞检查
- publish-service：发布器
- procurement-service：采购草稿
- incident-service：异常与健康
- archive-service：训练归档
- agent-orchestrator：主 Agent 协调器
- workflow-engine：工作流执行层

### 24.2 前后端交互重点

前端必须可查询：
- 首页总览数据
- 批次阶段状态
- 单机会商品体全链路详情
- 异常与店铺健康
- 审计时间线
- 训练归档记录

---

## 25. 风控规范

### 25.1 硬红线

以下必须写入系统硬规则：
- 利润红线不得突破
- 类目错挂不得自动放行
- 素材侵权不得自动放行
- 敏感词违规不得自动放行
- 授权异常不得继续执行发布链路

### 25.2 重复铺货防护

系统必须具备重复铺货风险防护，包括：
- 同店同机会商品体多层幂等
- 同源商品同类目重复检查
- 模板轻改重复发布检查

### 25.3 店铺暂停机制

以下情况可触发系统暂停店铺：
- P0 素材 / 合规异常
- 超时无人接管
- 授权失效且恢复失败
- 发布失败率或风控异常达到阈值

---

## 26. 非功能要求

### 26.1 可靠性
- 支持工作流中断恢复
- 支持关键任务幂等
- 支持异常补偿

### 26.2 可观测性
- 所有关键链路可追踪
- 关键指标可视化
- 所有异常可检索

### 26.3 可扩展性
- 虽然 V1 先跑 1 家店，但模型、规则、模板、店铺配置必须具备后续多店扩展结构

### 26.4 可维护性
- 所有核心规则集中管理
- 所有 AI 输出有版本、有证据、有审计
- 所有降级路径明确可见

---

## 27. V1 实施顺序建议

尽管最终所有模块都重要，开发上建议按以下顺序推进：

### Phase 1：执行安全底座
- Shopee 真授权
- 店铺健康状态
- 发布幂等
- 异常中心骨架
- 白名单机制
- 规则引擎基础

### Phase 2：批次主链路打通
- 批次生成
- 机会商品体建模
- 规则召回 + AI 排序
- 供货候选
- 映射
- 内容改造
- 定价
- 预飞检查

### Phase 3：真实自动发布
- 发布器实现
- 发布结果回流
- UI 状态联动
- 失败恢复

### Phase 4：半自动采购与回流学习
- 待确认采购单
- 人工修正回流
- 训练包归档
- 评估与迭代闭环

---

## 28. V1.5 / V2 演进方向

### V1.5
- 多店铺扩展
- 店铺级差异化策略
- 规则版本回滚
- 更完整的模板治理
- 更精细的异常分级

### V2
- 更强的自动采购联动
- 广告与运营策略闭环
- 更成熟的 Agent 学习系统
- 多平台扩展（非 Shopee）
- SaaS 化能力预留评估

---

## 29. 最终结论

V1 不是一个简单的跨境选品工具，也不是一个纯自动上架脚本系统，而是一个以“机会商品体”为中心、以“候选批次主链路”为骨架、以“分层优先”作为总体原则的内部 AI 电商运营系统。

它的核心不是单点 AI 能力，而是以下四个能力共同成立：
- 能真实接入平台
- 能真实执行发布
- 能在风险前自动刹车
- 能把全链路数据沉淀为未来 AI 继续变强的资产

只要后续开发严格围绕这份规范推进，V1 的目标就不是做出一个“看起来很像”的系统，而是做出一个真正能在内部低风险试点店里持续跑起来的生产型系统。

---

## 30. 具体技术方案（结合当前项目）

本章不是重复前面的产品规范，而是把当前仓库现状与 V1 目标做对齐，明确“现在怎么落地”。

### 30.1 当前项目基线评估

当前仓库已经具备一个可运行的前后端骨架，但距离 `spec.md` 定义的生产型 V1 仍有明显差距。

#### 后端现状
当前后端基于：
- FastAPI：`backend/app/main.py`
- 路由聚合：`backend/app/api/routes/__init__.py`
- SQLAlchemy 会话与 Base：`backend/app/db.py`
- Settings 配置：`backend/app/core/config.py`

已具备的能力：
- 健康检查
- dashboard 概览接口
- 候选/草稿/审核/发布演示接口：`backend/app/api/routes/workflow.py`
- 平台连接与授权回调骨架：`backend/app/api/routes/platform_connections.py`

当前不足：
- 数据模型仍是 demo 级：`backend/app/models.py` 只有 `platform_connections`、`candidates`、`drafts`
- 业务流仍是 `Candidate -> Draft -> Review -> Publish` 的演示链路：`backend/app/services/workflow.py`
- 没有 Alembic migration
- 没有 worker / workflow engine
- 没有异常中心、审计链、采购草稿、训练归档
- 平台 connector 仍是伪造 exchange 结果：`backend/app/connectors/shopee/auth.py`、`backend/app/connectors/alibaba1688/auth.py`
- 权限仍依赖开发态 header：`backend/app/core/auth.py`

#### 前端现状
当前前端基于：
- Next.js App Router：`frontend/app/layout.tsx`
- 首页：`frontend/app/page.tsx`
- 单 dashboard 页面：`frontend/app/dashboard/page.tsx`
- 主交互客户端组件：`frontend/components/DashboardClient.tsx`

已具备的能力：
- 首屏 SSR 拉取 dashboard 数据
- dashboard fallback / error / authorization gating
- 基础 operator / reviewer / admin 角色交互
- Vitest 页面/组件测试：`frontend/app/dashboard/page.test.tsx`、`frontend/components/DashboardClient.test.tsx`

当前不足：
- 只有单页面控制台，不满足规范中的四大页面
- 仍以 demo 操作为中心，不是以批次、机会商品体、异常事件为中心
- 缺少 URL 状态管理、实时刷新机制、详情时间线、版本对比视图
- UI 仍以内联样式为主，不适合继续扩展成生产后台

#### 基线结论
当前项目不是空白仓库，适合在现有骨架上升级；但不能继续沿着 demo 对象扩写，必须切换到 `OpportunityBatch + OpportunityItem` 主链路。

### 30.2 V1 目标系统形态

结合现有代码与 V1 目标，推荐采用：
- **模块化单体后端**
- **Next.js 管理台前端**
- **PostgreSQL 主存储**
- **Redis 队列/锁/缓存**
- **应用内工作流编排 + 独立 worker 进程**

#### 为什么不在 V1 直接拆微服务
原因：
- 当前代码已是单体骨架，继续演进成本最低
- V1 只有 1 家店，吞吐目标优先在流程稳定，不在服务拆分
- UI 状态联动、审计时间线、异常恢复更适合先在一个代码库里打通
- 后续若扩展到多店、多平台，再按领域拆服务更稳妥

#### V1 目标部署形态
建议部署为 4 类进程：
1. `web-api`：FastAPI API 服务
2. `worker`：异步任务消费进程
3. `scheduler`：定时补偿、续期检查、归档任务
4. `frontend`：Next.js 管理台

基础依赖：
- PostgreSQL：系统主数据库
- Redis：任务队列、幂等锁、短期缓存
- 对象存储：图片素材、归档包、训练包

### 30.3 后端具体技术方案

#### 30.3.1 后端目录重组方案
保留现有：
- `backend/app/main.py`
- `backend/app/db.py`
- `backend/app/core/config.py`
- `backend/app/api/routes/__init__.py`

在此基础上重构为按领域分层：

```text
backend/app/
├── api/
│   ├── routes/
│   └── deps/
├── core/
├── db/
├── modules/
│   ├── auth/
│   ├── stores/
│   ├── batches/
│   ├── opportunities/
│   ├── sourcing/
│   ├── mapping/
│   ├── content/
│   ├── pricing/
│   ├── preflight/
│   ├── publishing/
│   ├── procurement/
│   ├── incidents/
│   ├── audit/
│   └── archive/
├── connectors/
├── workflows/
├── workers/
└── schemas/
```

说明：
- `api/routes` 只负责 HTTP 暴露
- `modules/*` 负责领域服务、repository、schema、规则
- `workflows` 负责阶段推进逻辑
- `workers` 负责异步执行
- `connectors` 负责 Shopee、1688、对象存储、企业微信、模型 API 等外部接入

#### 30.3.2 服务边界落地方式
建议把第 24 章中的逻辑模块落成同仓库领域模块：

- `stores`：店铺、白名单、策略
- `auth`：后台用户身份、角色、店铺授权边界
- `batches`：批次创建、暂停、恢复、重放
- `opportunities`：机会商品体、详情聚合、时间线
- `sourcing`：需求召回、供货候选、1688 接入
- `mapping`：类目属性映射
- `content`：标题/卖点/图片版本
- `pricing`：定价计算、利润线判断、规则裁决
- `preflight`：最终 gate
- `publishing`：发布任务、幂等控制、结果回流
- `procurement`：采购草稿、失效重算
- `incidents`：异常、店铺健康、告警、暂停恢复
- `audit`：决策审计、人工动作审计、Agent 执行日志
- `archive`：归档包、训练包输出

### 30.4 工作流与异步任务方案

#### 30.4.1 主工作流实现原则
V1 不建议一开始引入重型外部编排平台，先采用：
- PostgreSQL 持久化业务状态
- Redis 管理异步队列
- 应用内 workflow engine 推进状态机
- scheduler 做补偿与超时恢复

主链路：
1. 机会发现
2. 批次创建
3. 供需证据聚合
4. 评分排序
5. 供货选择
6. 映射
7. 内容生成
8. 定价
9. 自动复核
10. preflight
11. 发布
12. 回流
13. 异常处理
14. 采购草稿
15. 训练归档

#### 30.4.2 工作流引擎落地方式
建议在 `backend/app/workflows/` 中实现批次级和商品级状态推进器：

- `batch_orchestrator.py`：管理 `OpportunityBatch.status`
- `opportunity_orchestrator.py`：管理 `OpportunityItem.status`
- `publish_orchestrator.py`：管理 `PublishTask.status`
- `incident_recovery.py`：管理恢复与重试策略

职责划分：
- API 创建动作或人工动作
- orchestrator 决定阶段能否推进
- worker 执行真正耗时任务
- 状态变化写入数据库与审计日志
- UI 通过 API/SSE 读取阶段进度

#### 30.4.3 异步任务拆分
建议的任务类型：
- `discover_demand_signals`
- `score_supply_candidates`
- `run_category_mapping`
- `generate_content_variant`
- `calculate_pricing`
- `run_preflight`
- `publish_listing`
- `generate_procurement_draft`
- `archive_training_package`
- `refresh_store_health`
- `refresh_authorization_tokens`

#### 30.4.4 重试与补偿策略
- 采集、评分、内容生成：可重跑
- 发布、授权、采购失效相关：必须幂等续跑
- worker crash 后由 scheduler 扫描 `queued/running` 超时项恢复
- 恢复动作必须写审计日志
- 无法自动恢复的项转 `incident` 并进入人工待办

### 30.5 数据库与迁移方案

#### 30.5.1 从当前 demo 表过渡到目标表
当前：
- `platform_connections`
- `candidates`
- `drafts`

目标：
- `stores`
- `store_authorizations`
- `opportunity_batches`
- `opportunity_items`
- `demand_signal_snapshots`
- `supply_candidates`
- `category_mappings`
- `content_variants`
- `pricing_decisions`
- `preflight_checks`
- `publish_tasks`
- `publish_results`
- `procurement_drafts`
- `incidents`
- `store_health_status`
- `agent_runs`
- `decision_audit_logs`
- `feedback_records`
- `training_archive_packages`

对应关系：
- `CandidateRecord` 只是过渡对象，最终拆为 `opportunity_items + supply_candidates`
- `DraftRecord` 只是过渡对象，最终拆为 `content_variants + publish_tasks`
- `PlatformConnectionRecord` 最终升级为 `store_authorizations`，并与 `stores`、`store_health_status` 关联

#### 30.5.2 迁移顺序

##### 第一批：安全底座
- `stores`
- `store_authorizations`
- `store_health_status`
- `incidents`
- `decision_audit_logs`

##### 第二批：主链路核心
- `opportunity_batches`
- `opportunity_items`
- `demand_signal_snapshots`
- `supply_candidates`
- `category_mappings`
- `content_variants`
- `pricing_decisions`
- `preflight_checks`

##### 第三批：执行闭环
- `publish_tasks`
- `publish_results`
- `procurement_drafts`
- `feedback_records`
- `agent_runs`
- `training_archive_packages`

#### 30.5.3 数据库规范
- 正式环境停止依赖 `Base.metadata.create_all`，改用 Alembic migration
- PostgreSQL 中所有 payload 字段统一采用 JSONB
- 所有状态字段定义枚举或检查约束
- 对以下字段建立索引：
  - `store_id`
  - `batch_id`
  - `opportunity_item_id`
  - `status`
  - `severity`
  - `idempotency_key`
- 审计表与异常表要支持按时间倒序高频检索

### 30.6 前端具体技术方案

#### 30.6.1 页面结构重组
当前只有：
- `/`
- `/dashboard`

V1 目标页面应扩展为：
- `/dashboard`：首页总览
- `/batches`：批次指挥台
- `/batches/[id]`：批次详情/阶段看板
- `/opportunities/[id]`：机会商品详情
- `/incidents`：异常与店铺健康
- `/settings/platform-connections`：店铺授权与连接

#### 30.6.2 前端架构原则
延续 `frontend/app/dashboard/page.tsx` 的模式：
- 首屏数据由 Server Component 并发获取
- 交互行为下沉到 Client Component
- fallback / load error / auth gating 逻辑继续复用

新增约束：
- 列表筛选、分页、排序、active tab 存到 URL
- 详情页采用分块渲染：基本信息 / 需求证据 / 供给证据 / 映射 / 内容 / 定价 / 决策时间线 / 发布与采购
- dashboard、batches、incidents 三页做近实时刷新
- 首页优先展示“当前要处理什么”，不是纯 BI

#### 30.6.3 组件层方案
建议把当前 `DashboardClient.tsx` 拆成：
- `dashboard/OverviewMetrics`
- `dashboard/RealtimeStatusPanel`
- `dashboard/AuthorizationStatusCard`
- `batches/BatchStageBoard`
- `batches/BatchCandidateTable`
- `opportunities/OpportunityTimeline`
- `opportunities/VersionDiffPanel`
- `incidents/IncidentList`
- `incidents/StoreHealthPanel`

同时新增统一：
- 设计 token
- 表格/筛选器/状态徽标组件
- 异常提示、成功反馈、操作确认组件

#### 30.6.4 实时刷新策略
推荐：
- 首页、异常中心、批次页：SSE 优先
- 无 SSE 时自动降级为轮询
- 详情页的版本信息与时间线用按需刷新

### 30.7 平台接入与授权方案

#### 30.7.1 当前可复用部分
可直接复用的骨架：
- `backend/app/api/routes/platform_connections.py`
- `backend/app/services/platform_connections.py`
- `backend/app/repositories/platform_connections.py`

#### 30.7.2 当前风险点
当前实现仅适合 demo：
- state token 固定格式，不安全
- access_token / refresh_token 明文存库
- connector `exchange_code()` 返回的是模拟数据
- 未实现自动续期
- 未把授权状态与店铺健康、preflight 强绑定

#### 30.7.3 正式实现方案
- 将授权实体升级为 `store_authorizations`
- `state` 使用签名随机串，带过期时间和单次消费标记
- token 存密文或密钥引用，不向前端透出原值
- Shopee OAuth 为第一优先真实接入
- 1688 先按可行接口能力做真实授权/会话接入，无法稳定自动化时降级为人工补位
- scheduler 周期检查 `expires_at`
- 到期前预警；续期失败则更新 `store_health_status`
- 发布前 `preflight` 强依赖授权状态正常

### 30.8 风控、审计、异常中心方案

#### 30.8.1 横切治理原则
风控、审计、异常不作为附属功能开发，而是贯穿所有链路。

每个关键动作都要写：
- `decision_audit_logs`
- `incidents`（命中异常时）
- `agent_runs`（AI/Agent 执行时）

#### 30.8.2 异常中心实现方案
异常中心聚合三类信息：
- 异常事件
- 被阻塞任务
- 店铺健康状态

后端需要提供：
- 按店铺过滤
- 按异常类型聚合
- 关联批次与商品跳转
- 恢复动作接口

前端需要提供：
- P0 高亮
- 恢复按钮
- 审计链路查看入口
- 与批次、商品详情的双向跳转

#### 30.8.3 审计与解释性方案
所有高价值决策要保留：
- 结构化评分明细
- 决策时间线
- 自然语言解释
- 规则命中记录
- 证据来源摘要

这部分需要贯穿：
- 选品
- 映射
- 内容
- 定价
- preflight
- 发布
- 人工修正

### 30.9 分阶段落地顺序

#### Sprint 1：执行安全底座
目标：先把“能安全地接平台、能阻断风险”落地。

交付内容：
- Alembic migration 体系
- `stores / store_authorizations / store_health_status / incidents / decision_audit_logs`
- Shopee 真授权链路
- 店铺健康接口与授权设置页
- 白名单机制
- header auth 到正式后台登录态的切换设计

#### Sprint 2：批次主链路与机会商品体
目标：把当前 demo workflow 升级成真正的批次/商品主链路。

交付内容：
- `opportunity_batches / opportunity_items`
- 需求信号快照与供货候选
- 批次列表页、批次阶段看板
- 机会商品基本详情页
- API 从 `candidates / drafts` 逐步迁移到 `batches / opportunities`

#### Sprint 3：映射、内容、定价、preflight
目标：让发布前链路真正可解释、可拦截。

交付内容：
- `category_mappings / content_variants / pricing_decisions / preflight_checks`
- 利润红线、映射强拦截、素材风险拦截
- 版本历史与前后对比
- 决策时间线与自然语言解释

#### Sprint 4：真实自动发布闭环
目标：让系统完成真实发布与回流。

交付内容：
- `publish_tasks / publish_results`
- 幂等发布器
- 发布结果回流
- 批次与异常中心联动
- 失败恢复与重放机制

#### Sprint 5：采购与训练归档
目标：形成完整闭环并可持续迭代。

交付内容：
- `procurement_drafts / feedback_records / training_archive_packages / agent_runs`
- 待确认采购单
- 人工修正回流
- 批次级/店铺级训练包导出

### 30.10 验收与联调方案

#### 30.10.1 技术验收
后端：
- FastAPI API 可完成授权、批次、详情、异常、发布相关接口联调
- PostgreSQL migration 可重复执行
- Redis 队列、worker、scheduler 可跑通

前端：
- 四个核心页面可正常访问
- 批次、异常、店铺健康具备近实时刷新
- 详情页支持版本对比和时间线查看

#### 30.10.2 测试策略
- Python：pytest 单元测试 + 集成测试
- Frontend：Vitest 组件/页面测试
- E2E：Playwright 覆盖关键链路

关键 E2E 链路至少包括：
1. 店铺授权成功回流
2. 批次创建并进入阶段推进
3. 机会商品详情可查看证据与时间线
4. preflight 拦截不合规商品
5. 发布成功回流
6. 异常触发后进入 incident center 并可恢复
7. 采购草稿生成与利润失效重算

#### 30.10.3 业务验收
仍以第 4 章为准：
- 连续 7 天日发商品数 >= 50
- 发布成功率 >= 85%
- 人工介入率 <= 30%
- 利润红线零突破

#### 30.10.4 联调顺序
推荐联调顺序：
1. Shopee 授权
2. 店铺健康状态
3. 批次创建
4. 机会商品详情聚合
5. 映射/内容/定价/preflight
6. 发布结果回流
7. 异常恢复
8. 采购草稿
9. 训练归档

### 30.11 与当前项目的最终对齐结论

结合当前仓库现状，V1 最合理的落地方式不是推倒重来，而是：
- 保留 FastAPI + Next.js + PostgreSQL + Redis 这一基础栈
- 保留现有平台连接、dashboard SSR、API response envelope 等骨架
- 用 `OpportunityBatch + OpportunityItem` 替换当前 demo 主链路
- 用模块化单体 + worker/scheduler 的方式补齐工作流、异常、审计、采购、归档

这样既能延续当前仓库已有成果，也能确保系统逐步逼近 `spec.md` 定义的真实生产型闭环目标。
