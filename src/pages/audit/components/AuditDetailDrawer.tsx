import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerBody,
    DrawerFooter,
    Button,
    Chip,
    Divider
} from "@heroui/react";
import {
    UserIcon,
    CubeIcon,
    GlobeAltIcon,
    HashtagIcon,
    ExclamationCircleIcon,
    ClockIcon
} from "@heroicons/react/24/outline";
import type { AuditLog } from "../../../api/types/audit.types";

interface AuditDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    log: AuditLog | null;
}

export const AuditDetailDrawer = ({ isOpen, onClose, log }: AuditDetailDrawerProps) => {
    if (!log) return null;

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            classNames={{
                base: "bg-apple-secondary-bg border-l border-apple-border text-apple-text-primary",
                closeButton: "hover:bg-apple-tertiary-bg",
            }}
        >
            <DrawerContent>
                {(onClose) => (
                    <>
                        <DrawerHeader className="flex flex-col gap-1 border-b border-apple-border py-6 px-8">
                            <div className="flex items-center gap-2 mb-1">
                                <Chip
                                    size="sm"
                                    variant="flat"
                                    color={log.result === "success" ? "success" : "danger"}
                                >
                                    {log.result === "success" ? "SUCCESS" : "FAILURE"}
                                </Chip>
                                <span className="text-[12px] text-apple-text-tertiary font-mono">{log.trace_id}</span>
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">审计详情</h2>
                            <p className="text-sm text-apple-text-secondary font-mono">{log.action}</p>
                        </DrawerHeader>

                        <DrawerBody className="p-8 space-y-8 overflow-y-auto">
                            {/* 基本状态 */}
                            <div className="grid grid-cols-2 gap-6">
                                <DetailItem
                                    icon={ClockIcon}
                                    label="操作时间"
                                    value={new Date(log.created_at).toLocaleString('zh-CN')}
                                />
                                <DetailItem
                                    icon={ExclamationCircleIcon}
                                    label="风险等级"
                                    value={riskLabelMap[log.risk_level]}
                                    valueColor={log.risk_level === 'high' ? 'text-apple-red' : ''}
                                />
                            </div>

                            <Divider className="bg-apple-border" />

                            {/* 操作者信息 */}
                            <section className="space-y-4">
                                <h3 className="text-[11px] font-bold text-apple-text-tertiary uppercase tracking-widest">操作者 (Actor)</h3>
                                <div className="bg-apple-black/30 p-4 rounded-2xl space-y-3">
                                    <DetailItem icon={UserIcon} label="用户名" value={log.actor_username} />
                                    <DetailItem icon={HashtagIcon} label="用户 ID" value={log.actor_user_id} isMono />
                                    <DetailItem icon={GlobeAltIcon} label="客户端 IP" value={log.remote_ip} />
                                </div>
                            </section>

                            {/* 资源信息 */}
                            <section className="space-y-4">
                                <h3 className="text-[11px] font-bold text-apple-text-tertiary uppercase tracking-widest">关联资源 (Resource)</h3>
                                <div className="bg-apple-black/30 p-4 rounded-2xl space-y-3">
                                    <DetailItem icon={CubeIcon} label="资源类型" value={log.resource_type} />
                                    <DetailItem icon={HashtagIcon} label="资源 ID" value={log.resource_id} isMono />
                                    <div className="pt-2">
                                        <p className="text-[11px] text-apple-text-tertiary mb-1 uppercase">请求路径</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold bg-apple-tertiary-bg px-1.5 py-0.5 rounded text-apple-text-primary">
                                                {log.method}
                                            </span>
                                            <code className="text-xs text-apple-blue-light">{log.path}</code>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* 原始负载 */}
                            <section className="space-y-4">
                                <h3 className="text-[11px] font-bold text-apple-text-tertiary uppercase tracking-widest">动作负载 (Detail JSON)</h3>
                                <pre className="bg-apple-black p-5 rounded-2xl text-xs font-mono text-apple-text-secondary overflow-auto max-h-[400px] leading-relaxed border border-apple-border">
                                    {JSON.stringify(log.detail, null, 2)}
                                </pre>
                            </section>

                            {log.error_message && (
                                <section className="space-y-4 pb-4">
                                    <h3 className="text-[11px] font-bold text-apple-red uppercase tracking-widest">错误详情</h3>
                                    <div className="bg-apple-red/5 border border-apple-red/20 p-4 rounded-2xl">
                                        <p className="text-sm text-apple-red-light leading-relaxed font-medium">
                                            {log.error_message}
                                        </p>
                                    </div>
                                </section>
                            )}
                        </DrawerBody>

                        <DrawerFooter className="border-t border-apple-border p-6">
                            <Button
                                fullWidth
                                variant="flat"
                                className="bg-apple-tertiary-bg hover:bg-apple-border-strong text-apple-text-primary rounded-xl font-bold"
                                onPress={onClose}
                            >
                                关闭
                            </Button>
                        </DrawerFooter>
                    </>
                )}
            </DrawerContent>
        </Drawer>
    );
};

const DetailItem = ({
    icon: Icon,
    label,
    value,
    isMono,
    valueColor
}: {
    icon: React.ElementType,
    label: string,
    value: string,
    isMono?: boolean
    valueColor?: string
}) => (
    <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-apple-secondary-bg">
            <Icon className="w-3.5 h-3.5 text-apple-text-tertiary" />
        </div>
        <div className="space-y-0.5">
            <p className="text-[10px] text-apple-text-tertiary uppercase tracking-tighter">{label}</p>
            <p className={`text-[13px] font-medium ${isMono ? 'font-mono' : ''} ${valueColor || 'text-apple-text-primary'}`}>
                {value}
            </p>
        </div>
    </div>
);

const riskLabelMap: Record<string, string> = {
    low: '低风险记录',
    medium: '中风险关注',
    high: '高风险预警',
};
