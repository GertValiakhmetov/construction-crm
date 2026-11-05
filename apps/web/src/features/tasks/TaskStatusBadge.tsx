import type { Status } from '@crm/contracts'
import { statusLabels } from './statusLabels'

export function TaskStatusBadge({ status }: { status: Status }) {
  return <span className={`badge ${status}`}>{statusLabels[status]}</span>
}
