<script setup lang="ts">
interface Props {
    /** Card title displayed in header */
    title?: string;
    /** Optional description text below title */
    description?: string;
    /** When true, shows "unavailable for external auth" overlay */
    externalAuthBlocked?: boolean;
    /** Whether to show a compact version without padding */
    compact?: boolean;
}

withDefaults(defineProps<Props>(), {
    title: undefined,
    description: undefined,
    externalAuthBlocked: false,
    compact: false,
});
</script>

<template>
    <div
        class="card bg-base-100 border border-base-300 shadow-sm"
        :class="{ 'opacity-60': externalAuthBlocked }"
    >
        <!-- Header with title and optional actions slot -->
        <div
            v-if="title || $slots.header"
            class="card-body pb-2"
            :class="{ 'p-3': compact, 'p-4 sm:p-6': !compact }"
        >
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h4 v-if="title" class="card-title text-base font-semibold">
                        {{ title }}
                    </h4>
                    <p v-if="description" class="text-sm text-base-content/70 mt-1">
                        {{ description }}
                    </p>
                </div>
                <div v-if="$slots.actions" class="shrink-0">
                    <slot name="actions" />
                </div>
            </div>

            <!-- External auth warning -->
            <div v-if="externalAuthBlocked" class="alert alert-warning mt-3 py-2">
                <fa-icon icon="lock" class="text-sm" />
                <span class="text-sm">Unavailable for external authentication</span>
            </div>
        </div>

        <!-- Main content -->
        <div
            v-if="$slots.default && !externalAuthBlocked"
            class="card-body pt-0"
            :class="{ 'p-3': compact, 'p-4 sm:p-6': !compact }"
        >
            <slot />
        </div>
    </div>
</template>
