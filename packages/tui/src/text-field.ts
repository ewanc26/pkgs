/** Pure editing model for a one-line text field. */
export interface Field {
  value: string;
  cursor: number;
}

export const emptyField: Field = { value: '', cursor: 0 };

/** Drop control characters, which a paste or a stray key can carry. */
export function printable(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u001f\u007f]/g, '');
}

export function insert(field: Field, text: string): Field {
  const clean = printable(text);
  return {
    value: field.value.slice(0, field.cursor) + clean + field.value.slice(field.cursor),
    cursor: field.cursor + clean.length,
  };
}

export function erase(field: Field): Field {
  if (field.cursor === 0) return field;
  return {
    value: field.value.slice(0, field.cursor - 1) + field.value.slice(field.cursor),
    cursor: field.cursor - 1,
  };
}

export function move(field: Field, to: number): Field {
  return { ...field, cursor: Math.max(0, Math.min(field.value.length, to)) };
}
