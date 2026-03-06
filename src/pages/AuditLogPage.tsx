import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../api/adapters/audit';
import type { AuditLog, RiskLevel, ActionResult } from '../api/types/audit.types';

import { AuditSummary } from './audit/components/AuditSummary';
import { AuditFilter } from './audit/components/AuditFilter';
import { AuditTable } from './audit/components/AuditTable';
import { AuditDetailDrawer } from './audit/components/AuditDetailDrawer';

const PAGE_SIZE = 20;

export function AuditLogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [resultFilter, setResultFilter] = useState<ActionResult | 'all'>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);

  // 搜索/过滤器联动处理：修改时同步重置至第一页
  const handleSearchChange = (v: string) => { setSearchTerm(v); setPage(1); };
  const handleRiskChange = (v: RiskLevel | 'all') => { setRiskFilter(v); setPage(1); };
  const handleResultChange = (v: ActionResult | 'all') => { setResultFilter(v); setPage(1); };

  // 获取审计日志数据
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => getAuditLogs({ page: 1, page_size: 1000 }),
  });

  const auditLogs = useMemo(() => data?.items || [], [data]);

  // 前端过滤逻辑
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesSearch =
        log.actor_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.trace_id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRisk = riskFilter === 'all' || log.risk_level === riskFilter;
      const matchesResult = resultFilter === 'all' || log.result === resultFilter;

      return matchesSearch && matchesRisk && matchesResult;
    });
  }, [auditLogs, searchTerm, riskFilter, resultFilter]);


  // 前端分页切片
  const pagedLogs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, page]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));

  // 计算摘要指标（基于全量数据）
  const summaryData = useMemo(() => {
    return {
      total: auditLogs.length,
      highRiskCount: auditLogs.filter(l => l.risk_level === 'high').length,
      failureCount: auditLogs.filter(l => l.result === 'failure').length,
      actorCount: new Set(auditLogs.map(l => l.actor_user_id)).size,
    };
  }, [auditLogs]);

  const handleViewDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDrawerOpen(true);
  };

  return (
    <div className="flex flex-col gap-14 w-full text-apple-text-primary animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-20">
      {/* 极简顶层信息排版 */}
      <header className="px-2 flex flex-col gap-1">
        <h1 className="text-4xl font-black tracking-tighter text-white">全域安全审计系统</h1>
        <p className="text-xs text-apple-text-tertiary uppercase tracking-[0.3em] font-medium opacity-60">Security_Infrastructure / Realtime_Audit_Mirror</p>
      </header>

      {/* 紧凑型指标概览区 (Bento 风格) */}
      <AuditSummary
        {...summaryData}
        isLoading={isLoading}
      />

      {/* 操作与搜索胶囊栏 */}
      <AuditFilter
        onSearchChange={handleSearchChange}
        onRiskLevelChange={handleRiskChange}
        onResultChange={handleResultChange}
        onRefresh={refetch}
        isRefreshing={isFetching}
      />

      {/* 磨砂玻璃审计列表表格 */}
      <AuditTable
        data={pagedLogs}
        isLoading={isLoading}
        onViewDetail={handleViewDetail}
        page={page}
        totalPages={totalPages}
        totalCount={filteredLogs.length}
        onPageChange={setPage}
      />

      {/* 底部溯源信息卡片 (iPhone 质感) */}
      <div className="bg-apple-tertiary-bg/5 border border-white/5 backdrop-blur-md rounded-[32px] p-8 apple-spotlight group">
        <div className="grid grid-cols-[200px_1fr] gap-y-6 text-sm font-medium">
          <div className="text-apple-text-tertiary text-[10px] tracking-[0.3em] uppercase font-black opacity-80 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-apple-blue shadow-[0_0_8px_rgba(0,113,227,0.8)]" />
            系统溯源 (Mirror_ID)
          </div>
          <div className="font-mono text-apple-text-primary select-all text-sm tracking-tight italic opacity-90">{data?.trace_id || 'NULL_SNAPSHOT_ID'}</div>
          <div className="text-apple-text-tertiary text-[10px] tracking-[0.3em] uppercase font-black opacity-80">架构说明 (Spec)</div>
          <div className="text-apple-text-tertiary text-[12px] leading-relaxed opacity-60 max-w-2xl">
            该面板实时映射全域业务操作流。所有鉴权行为、资产变更及高风险操作均受离散哈希链条保护，确保追溯的唯一性与不可篡改性。
          </div>
        </div>
      </div>

      {/* 详情抽屉 */}
      <AuditDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        log={selectedLog}
      />
    </div>
  );
}
