import { describe, expect, it } from 'vitest';
import { presets, validatePreset } from '../src/presets';

describe('presets de exportação', () => {
  it('fornece e valida os nove perfis solicitados', () => {
    expect(Object.keys(presets)).toHaveLength(9);
    for (const preset of Object.values(presets)) expect(validatePreset(preset)).toBe(preset);
  });
  it('rejeita parâmetros fora do intervalo antes de iniciar', () => {
    expect(() => validatePreset({ ...presets.balanced, crf: 99 })).toThrow('CRF');
    expect(() => validatePreset({ ...presets.youtube, width: 1 })).toThrow('Dimensão');
  });
});
