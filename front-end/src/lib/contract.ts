/**
 * Shared compile-time contract helpers.
 *
 * Mirrors the CONTRACT PIN pattern in `@vnuge/cmnext-admin` types: use these
 * to assert that a form model still matches the schema it is validated
 * against. tsc fails the build on drift, so parallel models (form vs wire)
 * cannot silently diverge.
 *
 * @example
 * ```ts
 * export type AssertPostForm = Expect<Equal<PostFormData, yup.InferType<typeof postSchema>>>;
 * ```
 */
export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
export type Expect<T extends true> = T;
