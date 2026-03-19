import { Input, Select, SelectItem, Button } from "@heroui/react";
import { MagnifyingGlassIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import type { RiskLevel, ActionResult } from "../../../api/types/audit.types";

interface AuditFilterProps {
    onSearchChange: (value: string) => void;
    riskLevel: RiskLevel | "all";
    onRiskLevelChange: (value: RiskLevel | "all") => void;
    result: ActionResult | "all";
    onResultChange: (value: ActionResult | "all") => void;
    onRefresh: () => void;
    isRefreshing?: boolean;
}

export const AuditFilter = ({
    onSearchChange,
    riskLevel,
    onRiskLevelChange,
    result,
    onResultChange,
    onRefresh,
    isRefreshing
}: AuditFilterProps) => {
    return (
        <section className="flex flex-col md:flex-row items-center gap-4 w-full mb-2">
            <div className="flex-1 w-full relative">
                <Input
                    isClearable
                    placeholder="搜索操作者、动作、资源 ID 或 TraceID..."
                    onValueChange={onSearchChange}
                    variant="flat"
                    startContent={<MagnifyingGlassIcon className="w-5 h-5 text-apple-text-tertiary" />}
                    aria-label="搜索审计日志"
                    classNames={{
                        inputWrapper: "bg-apple-tertiary-bg/10 hover:bg-apple-tertiary-bg/20 transition-colors h-14 rounded-2xl border border-white/5 backdrop-blur-md",
                        input: "text-base font-medium placeholder:text-apple-text-tertiary",
                    }}
                />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
                <Select
                    placeholder="风险等级"
                    className="w-40"
                    variant="flat"
                    selectedKeys={[riskLevel]}
                    onSelectionChange={(keys) => {
                        const val = Array.from(keys)[0] as RiskLevel | "all";
                        onRiskLevelChange(val || "all");
                    }}
                    aria-label="筛选风险等级"
                    classNames={{
                        trigger: "bg-apple-tertiary-bg/10 hover:bg-apple-tertiary-bg/20 transition-colors h-14 rounded-2xl border border-white/5 backdrop-blur-md text-apple-text-primary font-bold pr-10",
                        value: "text-apple-text-primary truncate"
                    }}
                >
                    <SelectItem key="all">全部风险</SelectItem>
                    <SelectItem key="low">低风险</SelectItem>
                    <SelectItem key="medium">中风险</SelectItem>
                    <SelectItem key="high">高风险</SelectItem>
                </Select>

                <Select
                    placeholder="执行结果"
                    className="w-40"
                    variant="flat"
                    selectedKeys={[result]}
                    onSelectionChange={(keys) => {
                        const val = Array.from(keys)[0] as ActionResult | "all";
                        onResultChange(val || "all");
                    }}
                    aria-label="筛选执行结果"
                    classNames={{
                        trigger: "bg-apple-tertiary-bg/10 hover:bg-apple-tertiary-bg/20 transition-colors h-14 rounded-2xl border border-white/5 backdrop-blur-md text-apple-text-primary font-bold pr-10",
                        value: "text-apple-text-primary truncate"
                    }}
                >
                    <SelectItem key="all">全部结果</SelectItem>
                    <SelectItem key="success">成功</SelectItem>
                    <SelectItem key="failure">失败</SelectItem>
                </Select>

                <Button
                    variant="flat"
                    isIconOnly
                    className="h-14 w-14 rounded-2xl bg-apple-tertiary-bg/10 border border-white/5 backdrop-blur-md"
                    isLoading={isRefreshing}
                    onPress={onRefresh}
                    aria-label="刷新日志"
                >
                    <ArrowPathIcon className="w-6 h-6 text-apple-text-secondary" />
                </Button>
            </div>
        </section>
    );
};
