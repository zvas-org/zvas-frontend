import type { TaskDetailVM } from '@/api/adapters/task'
import { TaskSnapshotAssetsPanel } from './TaskSnapshotAssetsPanel'

export function TaskSnapshotExpandedTab({ task }: { task?: TaskDetailVM }) {
  return (
    <TaskSnapshotAssetsPanel
      task={task}
      originType="expanded"
      title="本次发现资产"
      desc="展示任务运行过程中新增识别的资产，便于区分原始扫描目标与本次发现结果。"
    />
  )
}
