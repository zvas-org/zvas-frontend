import { useMemo, useState } from "react";
import {
  Button,
  Input,
  Pagination,
  Select,
  SelectItem,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { EyeIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

import {
  getProbeStatusLabel,
  parseHttpProbeSummary,
} from "@/api/adapters/asset";
import { getHttpProbeObservation, useTaskRecords } from "@/api/adapters/task";
import type { TaskRecordVM } from "@/api/adapters/task";
import { getRecordTypeLabel } from "@/api/adapters/route";
import { TaskRecordDetailDrawer } from "@/components/tasks/TaskRecordDetailDrawer";
import { APPLE_TABLE_CLASSES } from "@/utils/theme";

type RecordTabKey =
  | "all"
  | "port_scan"
  | "http_probe"
  | "vuln_scan"
  | "weak_scan";

const RECORD_TABS: Array<{
  key: RecordTabKey;
  label: string;
  description: string;
}> = [
  { key: "all", label: "全部记录", description: "统一查看所有扫描单元" },
  {
    key: "port_scan",
    label: "端口扫描",
    description: "查看端口开放和服务识别",
  },
  { key: "http_probe", label: "站点识别", description: "查看请求与响应报文" },
  { key: "vuln_scan", label: "漏洞扫描", description: "查看漏洞命中与摘要" },
  {
    key: "weak_scan",
    label: "弱点扫描",
    description: "查看 weakScan 执行摘要与明细入口",
  },
];

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatDuration(durationMs: number) {
  if (!durationMs) return "-";
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(1)} s`;
}

function isInProgressStatus(status: string) {
  return status === "queued" || status === "dispatched" || status === "running";
}

function getInProgressSummary(status: string) {
  switch (status) {
    case "queued":
      return "待执行，尚未产生结果";
    case "dispatched":
      return "已分发，等待执行";
    case "running":
      return "执行中，等待结果收口";
    default:
      return "结果处理中";
  }
}

function parseTaskRecordSummary(
  item: TaskRecordVM,
): Record<string, unknown> | null {
  if (!item.result_summary) return null;
  if (
    typeof item.result_summary === "string" &&
    item.result_summary.startsWith("{")
  ) {
    try {
      const parsed = JSON.parse(item.result_summary);
      if (parsed && typeof parsed === "object")
        return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function getHTTPProbeTableData(item: TaskRecordVM) {
  const summaryPayload = parseTaskRecordSummary(item);
  const summary = parseHttpProbeSummary(summaryPayload);
  const observation = getHttpProbeObservation(item);
  return {
    siteURL: summary?.site_url || item.target_key || "-",
    title: summary?.title || "-",
    statusCode: summary?.status_code ?? null,
    probeLabel:
      getProbeStatusLabel(summary?.probe_status) || observation.label || "-",
    probeError: summary?.probe_error || observation.error || "",
    probeState: summary?.probe_status || observation.state || "",
  };
}

type SummaryRenderer = (item: TaskRecordVM) => React.ReactNode | null;

const SUMMARY_RENDERERS: Record<string, SummaryRenderer> = {
  "http_probe/homepage_identify": (item) => {
    let payload = null;
    try {
      if (
        typeof item.result_summary === "string" &&
        item.result_summary.startsWith("{")
      ) {
        payload = JSON.parse(item.result_summary);
      } else {
        payload = item.result_summary;
      }
    } catch {
      // ignore
    }
    const sum = parseHttpProbeSummary(payload);
    if (!sum) return null;
    return (
      <div className="flex flex-col gap-1 w-full overflow-hidden">
        <div className="flex items-center gap-2 w-full">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
              sum.status_code && sum.status_code >= 200 && sum.status_code < 400
                ? "bg-apple-green/20 text-apple-green-light"
                : "bg-white/10 text-white/70"
            }`}
          >
            {sum.status_code || "-"}
          </span>
          <span
            className="text-[12px] truncate text-white font-medium"
            title={sum.title}
          >
            {sum.title || "无标题"}
          </span>
        </div>
        <span
          className="text-[10px] text-apple-text-tertiary truncate font-mono"
          title={sum.site_url}
        >
          {sum.site_url}
        </span>
      </div>
    );
  },
  vul_scan: (item) => {
    const summary = item.result_summary;
    if (!summary) return null;
    const isFound = typeof summary === "string" && summary.includes("发现");
    const isSkipped = typeof summary === "string" && summary.includes("跳过");
    const isClean = typeof summary === "string" && summary.includes("未发现");
    return (
      <div className="flex items-center gap-2 w-full overflow-hidden">
        <span
          className={`shrink-0 w-1.5 h-1.5 rounded-full ${
            isFound
              ? "bg-apple-red"
              : isSkipped
                ? "bg-apple-amber"
                : isClean
                  ? "bg-apple-green"
                  : "bg-white/30"
          }`}
        />
        <span
          className={`text-[12px] truncate font-medium ${
            isFound
              ? "text-apple-red-light"
              : isSkipped
                ? "text-apple-amber"
                : isClean
                  ? "text-apple-green-light"
                  : "text-apple-text-secondary"
          }`}
        >
          {String(summary)}
        </span>
      </div>
    );
  },
};

function renderResultSummary(item: TaskRecordVM) {
  if (isInProgressStatus(item.status)) {
    return (
      <span className="truncate block w-full text-apple-blue-light font-medium">
        {getInProgressSummary(item.status)}
      </span>
    );
  }

  const key = item.task_subtype
    ? `${item.task_type}/${item.task_subtype}`
    : item.task_type;
  const renderer = SUMMARY_RENDERERS[key];
  if (renderer) {
    const result = renderer(item);
    if (result) return result;
  }
  return (
    <span className="truncate block w-full">{item.result_summary || "-"}</span>
  );
}

function renderStatus(item: TaskRecordVM) {
  const statusColorMap: Record<string, string> = {
    succeeded: "bg-apple-green/20 text-apple-green-light",
    failed: "bg-apple-red/20 text-apple-red",
    running: "bg-apple-blue/20 text-apple-blue-light",
    pending: "bg-apple-amber/20 text-apple-amber",
    canceled: "bg-white/20 text-apple-text-secondary",
  };
  const colorClass = statusColorMap[item.status] || "bg-white/10 text-white/70";

  if (item.task_type === "http_probe") {
    const obs = getHttpProbeObservation(item);
    return (
      <div className="flex flex-col gap-1.5 items-start">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${colorClass}`}
        >
          {item.status}
        </span>
        {obs.state !== "unknown" && obs.state !== "failed" && (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest ${
              obs.state === "alive"
                ? "border border-apple-green/40 text-apple-green-light bg-apple-green/10"
                : "border border-white/20 text-apple-text-secondary bg-white/5"
            }`}
          >
            {obs.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${colorClass}`}
    >
      {item.status}
    </span>
  );
}

export function TaskRecordsTab({ taskId }: { taskId?: string }) {
  const [page, setPage] = useState(1);
  const [recordTab, setRecordTab] = useState<RecordTabKey>("all");
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<TaskRecordVM | null>(
    null,
  );
  const pageSize = 20;

  const query = useTaskRecords(taskId, {
    page,
    page_size: pageSize,
    stage: recordTab === "all" ? undefined : recordTab,
    status: status || undefined,
    keyword: keyword || undefined,
    sort: "updated_at",
    order: "desc",
  });

  const items = query.data?.data || [];
  const total = query.data?.pagination?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const statusOptions = useMemo(
    () => [
      { key: "", label: "全部状态" },
      { key: "queued", label: "待执行" },
      { key: "dispatched", label: "已分发" },
      { key: "running", label: "执行中" },
      { key: "succeeded", label: "已完成" },
      { key: "failed", label: "失败" },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full mb-8">
      {/* <div className='bg-white/[0.02] border border-white/5 p-6 rounded-2xl backdrop-blur-3xl'>
        <h3 className='text-xl font-black text-white tracking-tight mb-1'>扫描记录</h3>
        <p className='text-[13px] text-apple-text-tertiary font-medium'>
          按扫描类型拆分查看记录和详情，避免不同引擎结果结构混在同一视图里。
        </p>
      </div> */}

      <div className="flex flex-wrap gap-3">
        {RECORD_TABS.map((tab) => {
          const active = recordTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setRecordTab(tab.key);
                setPage(1);
                setSelectedRecord(null);
              }}
              className={`min-w-[180px] rounded-2xl border px-4 py-3 text-left transition-all ${
                active
                  ? "border-apple-blue/40 bg-apple-blue/10 shadow-lg shadow-apple-blue/10"
                  : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"
              }`}
            >
              <div
                className={`text-sm font-black ${active ? "text-white" : "text-apple-text-secondary"}`}
              >
                {tab.label}
              </div>
              <div className="mt-1 text-xs text-apple-text-tertiary">
                {tab.description}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input
          isClearable
          value={keyword}
          placeholder={
            recordTab === "http_probe"
              ? "搜索 URL、标题或状态码"
              : "搜索目标或结果摘要"
          }
          onValueChange={(value) => {
            setKeyword(value);
            setPage(1);
          }}
          classNames={{
            inputWrapper: "bg-white/5 border border-white/5 rounded-2xl h-12",
            input: "text-sm",
          }}
          startContent={
            <MagnifyingGlassIcon className="w-4 h-4 text-apple-text-tertiary" />
          }
        />
        <Select
          selectedKeys={status ? [status] : []}
          placeholder="状态"
          onSelectionChange={(keys) => {
            setStatus((Array.from(keys)[0] as string) || "");
            setPage(1);
          }}
          classNames={{
            trigger: "bg-white/5 border border-white/5 rounded-2xl h-12",
          }}
          popoverProps={{
            classNames: {
              content:
                "bg-apple-bg/95 backdrop-blur-3xl border border-white/10 shadow-2xl p-1 min-w-[160px]",
            },
          }}
        >
          {statusOptions.map((item) => (
            <SelectItem key={item.key}>{item.label}</SelectItem>
          ))}
        </Select>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-x-auto">
        <Table
          removeWrapper
          aria-label="Task Records"
          layout="fixed"
          classNames={{
            ...APPLE_TABLE_CLASSES,
            base:
              recordTab === "http_probe"
                ? "p-4 min-w-[1180px]"
                : "p-4 min-w-[1100px]",
          }}
        >
          <TableHeader>
            {recordTab === "http_probe" ? (
              <>
                <TableColumn width={280}>站点 URL</TableColumn>
                <TableColumn width={100}>执行状态</TableColumn>
                <TableColumn width={140}>存活状态</TableColumn>
                <TableColumn width={240}>页面标题</TableColumn>
                <TableColumn width={110}>状态码</TableColumn>
                <TableColumn width={160}>开始时间</TableColumn>
                <TableColumn width={100}>耗时</TableColumn>
                <TableColumn width={96}>详情</TableColumn>
              </>
            ) : (
              <>
                <TableColumn width={130}>阶段</TableColumn>
                <TableColumn width={200}>目标</TableColumn>
                <TableColumn width={90}>状态</TableColumn>
                <TableColumn width={160}>执行节点</TableColumn>
                <TableColumn width={80}>尝试次数</TableColumn>
                <TableColumn width={100}>耗时</TableColumn>
                <TableColumn width={160}>开始时间</TableColumn>
                <TableColumn width={280}>结果摘要</TableColumn>
                <TableColumn width={96}>详情</TableColumn>
              </>
            )}
          </TableHeader>
          <TableBody
            emptyContent={
              <div className="py-20 text-apple-text-tertiary text-[13px] font-bold tracking-widest uppercase">
                当前筛选条件下暂无扫描记录。
              </div>
            }
            isLoading={query.isPending}
            loadingContent={
              <Skeleton className="h-40 w-full rounded-[24px] bg-white/5" />
            }
          >
            {items.map((item) => {
              if (recordTab === "http_probe") {
                const httpData = getHTTPProbeTableData(item);
                const statusCode = httpData.statusCode;
                const healthy =
                  typeof statusCode === "number" &&
                  statusCode >= 200 &&
                  statusCode < 400;
                return (
                  <TableRow key={item.unit_id}>
                    <TableCell>
                      <span className="font-mono text-[12px] break-all text-apple-blue-light">
                        {httpData.siteURL}
                      </span>
                    </TableCell>
                    <TableCell>{renderStatus(item)}</TableCell>
                    <TableCell>
                      {httpData.probeState === "unreachable" ? (
                        <span
                          className="inline-flex rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-apple-text-secondary"
                          title={httpData.probeError || "无法确认细节"}
                        >
                          {httpData.probeLabel}
                        </span>
                      ) : httpData.probeState === "alive" ? (
                        <span className="inline-flex rounded-full border border-apple-green/30 bg-apple-green/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-apple-green-light">
                          {httpData.probeLabel}
                        </span>
                      ) : (
                        <span className="text-[12px] text-apple-text-tertiary">
                          {httpData.probeLabel}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className="block truncate text-[12px] text-white font-medium"
                        title={httpData.title}
                      >
                        {httpData.title}
                      </span>
                    </TableCell>
                    <TableCell>
                      {typeof statusCode === "number" && statusCode > 0 ? (
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-black ${healthy ? "bg-apple-green/15 text-apple-green-light" : "bg-white/10 text-white"}`}
                        >
                          {statusCode}
                        </span>
                      ) : (
                        <span className="text-[12px] text-apple-text-tertiary">
                          -
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{formatDateTime(item.started_at)}</TableCell>
                    <TableCell>{formatDuration(item.duration_ms)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="flat"
                        className="min-w-0 rounded-xl bg-white/5 text-apple-blue-light hover:bg-white/10 font-bold"
                        onPress={() => setSelectedRecord(item)}
                        startContent={<EyeIcon className="w-4 h-4" />}
                      >
                        详情
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }

              return (
                <TableRow key={item.unit_id}>
                  <TableCell>
                    {getRecordTypeLabel(
                      undefined,
                      item.task_type,
                      item.task_subtype,
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[12px] break-all">
                      {item.target_key}
                    </span>
                  </TableCell>
                  <TableCell>{renderStatus(item)}</TableCell>
                  <TableCell>{item.worker_id || "-"}</TableCell>
                  <TableCell>{item.attempt}</TableCell>
                  <TableCell>{formatDuration(item.duration_ms)}</TableCell>
                  <TableCell>{formatDateTime(item.started_at)}</TableCell>
                  <TableCell>{renderResultSummary(item)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="flat"
                      className="min-w-0 rounded-xl bg-white/5 text-apple-blue-light hover:bg-white/10 font-bold"
                      onPress={() => setSelectedRecord(item)}
                      startContent={<EyeIcon className="w-4 h-4" />}
                    >
                      详情
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {total > 0 && (
          <div className="flex justify-between items-center px-6 py-5 border-t border-white/5 bg-white/[0.01]">
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-apple-text-tertiary">
              {RECORD_TABS.find((tab) => tab.key === recordTab)?.label ||
                "当前记录"}
              <span className="text-white mx-1">{total}</span>条
            </span>
            {totalPages > 1 && (
              <Pagination
                size="sm"
                page={page}
                total={totalPages}
                onChange={setPage}
                classNames={{
                  wrapper: "gap-2",
                  item: "bg-white/5 text-apple-text-secondary font-bold rounded-xl border border-white/5 hover:bg-white/10 transition-all min-w-[32px] h-8 text-[12px]",
                  cursor:
                    "bg-apple-blue font-black rounded-xl shadow-lg shadow-apple-blue/30 text-white",
                }}
              />
            )}
          </div>
        )}
      </div>

      <TaskRecordDetailDrawer
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        taskId={taskId}
        record={selectedRecord}
      />
    </div>
  );
}
