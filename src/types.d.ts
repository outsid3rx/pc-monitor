import { default as SI } from 'systeminformation'

type SystemInformation = typeof SI

type Split<
  S extends string,
  D extends string = ',' | ' ' | '|',
> = string extends S
  ? string[]
  : S extends ''
    ? []
    : S extends `${infer T}${D}${infer U}`
      ? [T, ...Split<U, D>]
      : [S]

type Key = Exclude<
  keyof SystemInformation,
  | 'get'
  | 'getStaticData'
  | 'getDynamicData'
  | 'getAllData'
  | 'observe'
  | 'powerShellStart'
  | 'powerShellRelease'
>

type ValuesObject = Record<Key, string>

type AllValues = {
  [key in keyof ValuesObject]: SystemInformation[key] extends Function
    ? Awaited<ReturnType<SystemInformation[key]>>
    : never
}

type MarkOptionalIfNeed<V extends string, D> = V extends `${string}|${string}`
  ? Partial<D>
  : D

type GetData<Values extends Partial<ValuesObject>> = Readonly<{
  [key in keyof Values]: Values[key] extends string
    ? Values[key] extends '*'
      ? AllValues[key]
      : Values[key] extends `(${string}) ${infer T extends string}`
        ? MarkOptionalIfNeed<
            T,
            Pick<
              AllValues[key] extends Array<unknown>
                ? AllValues[key][number]
                : AllValues[key],
              Split<T>[number]
            >
          >[]
        : MarkOptionalIfNeed<
            AllValues[key],
            Pick<AllValues[key], Split<Values[key]>[number]>
          >
    : never
}>

declare module 'systeminformation' {
  export function get<V extends Partial<ValuesObject>>(
    valuesObject: Readonly<V>,
    cb?: (data: GetData<typeof valuesObject>) => unknown,
  ): Promise<GetData<typeof valuesObject>>
}
