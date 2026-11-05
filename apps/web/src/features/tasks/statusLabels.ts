import { Status } from '@crm/contracts'

export const statusLabels: Record<Status, string> = {
  [Status.New]: 'Новая',
  [Status.InProgress]: 'В работе',
  [Status.InReview]: 'На проверке',
  [Status.Rework]: 'На доработке',
  [Status.Accepted]: 'Принята',
}
