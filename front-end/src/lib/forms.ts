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

import { type MaybeRef, toValue } from 'vue';
import { type ObjectSchema, type AnyObject, ValidationError } from 'yup';
import { type Toaster } from '@vnuge/vnlib.browser/vue';
import { logError } from './log';

export interface UseFormValidationOptions {
  /**
   * Toaster instance for displaying validation errors
   */
  readonly toaster: Toaster;
}

export interface UseFormValidationReturn {
  /**
   * Validates the data against the schema and displays errors via toaster
   * @param data - The data to validate
   * @param schema - The Yup schema to validate against
   * @returns True if validation passed, false otherwise
   */
  readonly validate: <T extends AnyObject>(
    data: MaybeRef<T>,
    schema: ObjectSchema<T>
  ) => Promise<boolean>;
}

/**
 * Creates a form validation helper that integrates Yup schemas with toaster notifications.
 * Validates reactive data against Yup schemas and automatically displays validation errors
 * via the toaster, providing a consistent UX for form validation.
 *
 * @param options - Configuration with toaster instance
 * @returns Validation utilities for form handling
 *
 * @example
 * ```ts
 * import * as yup from 'yup'
 * import { useFormValidation } from '@/lib'
 *
 * const { validate } = useFormValidation({ toaster })
 *
 * const schema = yup.object({
 *   email: yup.string().email().required(),
 *   password: yup.string().min(8).required()
 * })
 *
 * const formData = { email: 'user@example.com', password: 'pass123' }
 *
 * if (await validate(formData, schema)) {
 *   // Form is valid, proceed with submission
 * }
 * ```
 */
export const useFormValidation = (options: UseFormValidationOptions): UseFormValidationReturn => {
  const { toaster } = options;

  /**
   * Validates data against a Yup schema and displays errors via toaster
   */
  const validate = async <T extends AnyObject>(
    data: MaybeRef<T>,
    schema: ObjectSchema<T>
  ): Promise<boolean> => {
    const unwrappedData = toValue(data);

    try {
      // Close any existing toasts before validation
      toaster.close();

      // Validate the data against the schema
      await schema.validate(unwrappedData, { abortEarly: false });

      return true;
    } catch (error) {
      // Handle Yup validation errors
      if (error instanceof ValidationError) {
        // Display the first error (Yup provides all errors)
        const firstError = error.errors[0];

        // Extract field name from path if available
        const fieldName = error.path || 'form';

        toaster.error(`Please verify your ${fieldName}`, firstError);
      } else {
        // Handle unexpected errors
        logError('Validation error:', error);
        toaster.error('Validation failed', 'An unexpected error occurred');
      }

      return false;
    }
  };

  return {
    validate,
  };
};
