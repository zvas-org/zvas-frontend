import type { TaskDetailVM } from '@/api/adapters/task'
import { TaskSnapshotAssetsPanel } from './TaskSnapshotAssetsPanel'

export function TaskSnapshotInputTab({ task }: { task: TaskDetailVM }) {
  return (
    <TaskSnapshotAssetsPanel
      task={task}
      originType="input"
      title="扫描目标"
      desc="展示本次任务启动时纳入扫描范围的目标资产，按 IP、域名、站点三种视角查看。"
    />
  )
}
