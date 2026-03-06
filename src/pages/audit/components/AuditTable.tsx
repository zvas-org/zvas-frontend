import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Chip,
    Button,
    Pagination,
} from "@heroui/react";
import {
    EyeIcon,
    DocumentDuplicateIcon,
    ExclamationCircleIcon,
    CheckCircleIcon
} from "@heroicons/react/24/outline";
import type { AuditLog } from "../../../api/types/audit.types";

interface AuditTableProps {
    data: AuditLog[];
    isLoading: boolean;
    onViewDetail: (log: AuditLog) => void;
    page: number;
    totalPages: number;
    totalCount: number;
    onPageChange: (page: number) => void;
}

export const AuditTable = ({ data, isLoading, onViewDetail, page, totalPages, totalCount, onPageChange }: AuditTableProps) => {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const renderCell = (log: AuditLog, columnKey: string) => {
        switch (columnKey) {
            case "created_at":
                return (
                    <span className="text-apple-text-secondary text-[13px]">
                        {formatDateTime(log.created_at)}
                    </span>
                );
            case "actor":
                return (
                    <div className="flex flex-col">
                        <span className="text-apple-text-primary font-medium">{log.actor_username}</span>
                        <span className="text-[11px] text-apple-text-tertiary uppercase">{log.actor_role}</span>
                    </div>
                );
            case "action":
                return (
                    <span className="font-mono text-[13px] text-apple-blue-light">{log.action}</span>
                );
            case "resource_type":
                return (
                    <span className="text-apple-text-secondary text-[13px]">{log.resource_type || "N/A"}</span>
                );
            case "resource_id":
                return (
                    <span className="font-mono text-[12px] text-apple-text-primary truncate max-w-[120px] block" title={log.resource_id}>
                        {log.resource_id || "-"}
                    </span>
                );
            case "risk_level":
                return (
                    <Chip
                        size="sm"
                        variant="dot"
                        color={
                            log.risk_level === "high" ? "danger" :
                                log.risk_level === "medium" ? "warning" : "success"
                        }
                        className="border-none bg-transparent h-6"
                    >
                        {riskLabelMap[log.risk_level] || log.risk_level}
                    </Chip>
                );
            case "result":
                return (
                    <div className="flex items-center gap-1.5 h-6">
                        {log.result === "success" ? (
                            <CheckCircleIcon className="w-4 h-4 text-apple-green" />
                        ) : (
                            <ExclamationCircleIcon className="w-4 h-4 text-apple-red" />
                        )}
                        <span className={log.result === "success" ? "text-apple-green text-[13px]" : "text-apple-red text-[13px]"}>
                            {log.result === "success" ? "成功" : "失败"}
                        </span>
                    </div>
                );
            case "trace_id":
                return (
                    <div className="flex items-center gap-2 group h-6">
                        <code className="text-[11px] text-apple-text-tertiary bg-apple-secondary-bg px-1.5 py-0.5 rounded border border-apple-border/30">
                            {log.trace_id.slice(0, 8)}
                        </code>
                        <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            className="opacity-0 group-hover:opacity-100 transition-opacity min-w-unit-6 h-6 w-6"
                            onPress={() => copyToClipboard(log.trace_id)}
                        >
                            <DocumentDuplicateIcon className="w-3 h-3 text-apple-text-tertiary" />
                        </Button>
                    </div>
                );
            case "actions":
                return (
                    <div className="flex justify-end">
                        <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            className="text-apple-text-tertiary hover:text-apple-text-primary h-8 w-8"
                            onPress={() => onViewDetail(log)}
                            aria-label="查看详情"
                        >
                            <EyeIcon className="w-4 h-4" />
                        </Button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="rounded-[32px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-x-auto scrollbar-hide md:scrollbar-default">
            <Table
                aria-label="审计日志表格"
                layout="fixed"
                removeWrapper
                isHeaderSticky
                classNames={{
                    base: "p-4 overflow-x-auto custom-scrollbar",
                    table: "min-w-[1200px] table-fixed",
                    thead: "[&>tr]:first:rounded-xl",
                    th: "bg-transparent text-apple-text-tertiary uppercase text-[10px] tracking-[0.2em] font-black h-14 border-b border-white/5 pb-2 text-left",
                    tr: "hover:bg-white/[0.03] transition-colors cursor-default",
                    td: "py-5 border-b border-white/5 last:border-0 overflow-hidden text-ellipsis whitespace-nowrap text-left",
                }}
            >
                <TableHeader>
                    <TableColumn key="created_at" width={160} align="start">时间 (Timestamp)</TableColumn>
                    <TableColumn key="actor" width={180} align="start">操作主体 (Actor)</TableColumn>
                    <TableColumn key="action" width={240} align="start">行为指令 (Command)</TableColumn>
                    <TableColumn key="resource_type" width={140} align="start">资产类型 (Type)</TableColumn>
                    <TableColumn key="resource_id" width={180} align="start">关联标识 (Resource_ID)</TableColumn>
                    <TableColumn key="risk_level" width={120} align="start">风险等级</TableColumn>
                    <TableColumn key="result" width={100} align="start">执行结果</TableColumn>
                    <TableColumn key="trace_id" width={140} align="start">溯源码 (Trace)</TableColumn>
                    <TableColumn key="actions" width={60} align="end">指令</TableColumn>
                </TableHeader>
                <TableBody
                    items={data}
                    isLoading={isLoading}
                    loadingContent={<div className="h-40 flex items-center justify-center text-apple-text-tertiary font-bold animate-pulse">正在同步全域审计快照...</div>}
                    emptyContent={<div className="h-40 flex items-center justify-center text-apple-text-tertiary font-bold">未在该区间发现符合安全策略的流水记录。</div>}
                >
                    {(item) => (
                        <TableRow key={item.id}>
                            {(columnKey) => <TableCell>{renderCell(item, columnKey as string)}</TableCell>}
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {/* 分页栏 */}
            <div className="px-6 py-6 flex flex-col md:flex-row gap-4 justify-between items-center border-t border-white/5 bg-white/[0.01]">
                <p className="text-[11px] text-apple-text-tertiary font-bold uppercase tracking-[0.2em]">
                    当前展示 <span className="text-white">{data.length}</span> / {totalCount} 条审计记录
                </p>
                <Pagination
                    total={totalPages}
                    page={page}
                    onChange={onPageChange}
                    showControls
                    classNames={{
                        wrapper: "gap-2",
                        item: "bg-white/5 text-apple-text-secondary font-bold rounded-xl border border-white/5 hover:bg-white/10 transition-all min-w-[40px] h-10",
                        cursor: "bg-apple-blue font-black rounded-xl shadow-lg shadow-apple-blue/30",
                        prev: "bg-white/5 text-white/50 rounded-xl",
                        next: "bg-white/5 text-white/50 rounded-xl",
                    }}
                />
            </div>
        </div>
    );
};

const riskLabelMap: Record<string, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
};

function formatDateTime(value: string) {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) return value;
    return new Intl.DateTimeFormat('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(new Date(timestamp));
}
