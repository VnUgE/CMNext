// Copyright (C) 2026 Vaughn Nugent
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { useConfirmDialog, type UseConfirmDialogReturn } from '@vueuse/core';

export interface ConfirmMessage {
  /**
   * Optional custom title for the dialog
   */
  readonly title?: string;

  /**
   * Optional custom message/description
   */
  readonly message?: string;

  /**
   * Whether this is a warning action
   */
  readonly isWarning?: boolean;
}

export const confirm = (() => {
  const _confirm = useConfirmDialog<ConfirmMessage>();
  return Object.assign(_confirm.reveal, { ..._confirm });
})();

export interface PasswordConfirmResult {
  /**
   * The password entered by the user (only if confirmed)
   */
  readonly password?: string;
}

/**
 * A confirm dialog specialized for password confirmation
 */
export const passConfirm = useConfirmDialog<ConfirmMessage>() as UseConfirmDialogReturn<
  ConfirmMessage,
  PasswordConfirmResult,
  boolean
>;

export const promptForPassword = async (): Promise<string | undefined> => {
  const pc = await passConfirm.reveal({
    title: 'Confirm your password',
    message: 'Please enter your password to confirm removing this key.',
  });
  // User cancelled the prompt
  if (pc.isCanceled) {
    return;
  }
  // Get the password
  return pc.data?.password;
};
