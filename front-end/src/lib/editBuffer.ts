import { get, set, watchDebounced } from '@vueuse/core';
import { assign, forEach, isEqual } from 'lodash-es';
import { type MaybeRef, shallowRef, computed, type Ref, watch, reactive, Reactive } from 'vue';
import * as Yup from 'yup';

export interface ErrorObject {
  readonly isError: boolean;
  readonly message: string | undefined;
}

export interface EditBuffer<T> {
  readonly raw: Ref<T>;
  readonly buffer: Reactive<T>;
  readonly modified: Ref<boolean>;
  readonly errors: Ref<Record<keyof T, ErrorObject>>;
  revert(): void;
  validate(): Promise<boolean>;
}

export const useEditBuffer = <T extends Yup.AnyObject>(
  initialValue: MaybeRef<T | undefined>,
  schema: Yup.ObjectSchema<T>
): EditBuffer<T> => {
  const raw = computed(() => get(initialValue) || ({} as T));
  const buffer = reactive<T>({} as T);

  const rawErrors = shallowRef<Record<keyof T, ErrorObject>>({} as Record<keyof T, ErrorObject>);

  const modified = computed(() => {
    // Extract plain object values for comparison
    return !isEqual({ ...buffer }, { ...raw.value });
  });

  const revert = () => assign(buffer, raw.value);

  const validate = async () => {
    try {
      await schema.validate({ ...buffer }, { abortEarly: false });
      set(rawErrors, {}); // Clear errors if validation passes
      return true;
    } catch (validationError: unknown) {
      const validationErrors: Record<keyof T, ErrorObject> = {} as Record<keyof T, ErrorObject>;

      if (validationError instanceof Yup.ValidationError && validationError.inner) {
        forEach(validationError.inner, (err: Yup.ValidationError) => {
          validationErrors[err.path as keyof T] = {
            isError: true,
            message: err.message,
          };
        });
      }

      set(rawErrors, validationErrors); // Populate errors object
      return false;
    }
  };

  // Proxy to ensure default ErrorObject for any property
  const errors = computed<Record<keyof T, ErrorObject>>(() => {
    return new Proxy(rawErrors.value, {
      get(target, prop: string) {
        if (!(prop in target)) {
          return { isError: false, message: undefined } as ErrorObject;
        }
        return target[prop as keyof T];
      },
      set(target, prop: string, value: ErrorObject) {
        target[prop as keyof T] = value;
        return true;
      },
    });
  });

  // If the raw/initial data changes, revert the editBuffer to the new raw data
  watch(raw, (v) => assign(buffer, v), { immediate: true });

  watchDebounced(buffer, validate, { debounce: 300 });

  return {
    raw,
    buffer,
    modified,
    errors,
    revert,
    validate,
  };
};
