import type { UseConfirmDialogRevealResult } from "@vueuse/core"

export interface ConfirmMessage {
  readonly title: string
  readonly text: string
  readonly subtext?: string
  readonly id?: string
  readonly isWarning?: boolean
}

export type RevealConfirm = (message: ConfirmMessage) => ReturnType<UseConfirmDialogRevealResult>