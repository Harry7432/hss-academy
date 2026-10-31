import { describe, it, expect } from 'vitest';
import { naturalCompare } from '../src/main/scanner';

describe('Ordenação Natural (naturalCompare)', () => {
  it('deve ordenar números naturalmente (1, 2, 10 ao invés de 1, 10, 2)', () => {
    const list = [
      '10 - TypeScript.mp4',
      '1 - Boas-vindas.mp4',
      '2 - JavaScript.mp4'
    ];

    const sorted = [...list].sort(naturalCompare);

    expect(sorted).toEqual([
      '1 - Boas-vindas.mp4',
      '2 - JavaScript.mp4',
      '10 - TypeScript.mp4'
    ]);
  });

  it('deve ordenar com zeros à esquerda preservando a ordem numérica', () => {
    const list = [
      '03 - Aula 3.mp4',
      '10 - Aula 10.mp4',
      '01 - Aula 1.mp4',
      '02 - Aula 2.mp4'
    ];

    const sorted = [...list].sort(naturalCompare);

    expect(sorted).toEqual([
      '01 - Aula 1.mp4',
      '02 - Aula 2.mp4',
      '03 - Aula 3.mp4',
      '10 - Aula 10.mp4'
    ]);
  });

  it('deve lidar corretamente com acentuação e caracteres especiais em português', () => {
    const list = [
      '03 - Conclusão e Próximos Passos.mp4',
      '01 - Visão Geral do Módulo.mp4',
      '02 - Funções e Parâmetros.mp4'
    ];

    const sorted = [...list].sort(naturalCompare);

    expect(sorted).toEqual([
      '01 - Visão Geral do Módulo.mp4',
      '02 - Funções e Parâmetros.mp4',
      '03 - Conclusão e Próximos Passos.mp4'
    ]);
  });
});
