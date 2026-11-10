import type { ValueTransformer } from 'typeorm';

/** DECIMAL 컬럼은 드라이버가 문자열로 내려주므로 number 로 변환한다. */
export const decimalTransformer: ValueTransformer = {
  to: (value: unknown) => value,
  from: (value: string | number | null) =>
    value === null || value === undefined ? null : Number(value),
};
