import { get, set, watchDebounced } from "@vueuse/core";
import { isEqual } from "lodash-es";
import { watch, MaybeRef, ref, computed, Ref, toRef } from "vue";
import * as Yup from "yup";

export interface ErrorObject {
    readonly isError: boolean;
    readonly message: string | undefined;
}

export interface EditBuffer<T> {
    readonly raw: Readonly<Ref<T>>;
    readonly editBuffer: Ref<T>;
    readonly modified: Ref<boolean>;
    readonly errors: Ref<Record<keyof T, ErrorObject>>;
    revert(): void;
    validate(): Promise<boolean>;
}

export const useEditBuffer = <T extends Yup.AnyObject>(
    initialValue: MaybeRef<T | undefined>,
    schema: Yup.ObjectSchema<T>
): EditBuffer<T> => {
    const raw = toRef(() => get(initialValue) || {} as T);
    const editBuffer = ref<T>(raw.value || {} as T);
    const rawErrors = ref<Record<keyof T, ErrorObject>>({});

    const modified = computed(() => {
        const rawValue = { ...raw.value };
        const editValue = { ...editBuffer.value };
        // Extract plain object values for comparison
        return !isEqual(editValue, rawValue);
    });

    // Proxy to ensure default ErrorObject for any property
    const errors = computed(() => {
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

    const revert = () => set(editBuffer, { ...raw.value });

    const validate = async () => {
        try {
            await schema.validate(editBuffer.value, { abortEarly: false });
            set(rawErrors, {}); // Clear errors if validation passes
            return true;
        }
        catch (validationError: any) {
            const validationErrors: Record<keyof T, ErrorObject> = {} as Record<keyof T, ErrorObject>;

            if (validationError.inner) {
                validationError.inner.forEach((err: any) => {
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

    // If the raw/initial data changes, revert the editBuffer to the new raw data
    watch(raw, revert);
    watchDebounced(editBuffer, validate, { debounce: 300 });

    return {
        raw,
        editBuffer,
        modified,
        errors,
        revert,
        validate,
    };
};