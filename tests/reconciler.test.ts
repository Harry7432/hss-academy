import { describe, it, expect } from 'vitest';
import { reconcileLessons } from '../src/main/reconciler';
import { Lesson } from '../src/shared/types';
import { ScannedLessonItem } from '../src/main/scanner';

describe('Reconciliador de Aulas (reconciler)', () => {
  const courseId = 'course-test-123';

  it('deve cadastrar aulas escaneadas pela primeira vez', () => {
    const scanned: ScannedLessonItem[] = [
      {
        moduleName: '01 - Introdução',
        title: '01 - Boas-vindas',
        relativePath: '01 - Introdução/01 - Boas-vindas.mp4',
        sizeBytes: 1000
      },
      {
        moduleName: '01 - Introdução',
        title: '02 - Configuração',
        relativePath: '01 - Introdução/02 - Configuração.mp4',
        sizeBytes: 2000
      }
    ];

    const { lessons, summary } = reconcileLessons(courseId, [], scanned);

    expect(lessons.length).toBe(2);
    expect(summary.added).toBe(2);
    expect(summary.missing).toBe(0);
    expect(lessons[0].completed).toBe(false);
    expect(lessons[0].positionSeconds).toBe(0);
    expect(lessons[0].available).toBe(true);
  });

  it('deve preservar o progresso salvo quando o arquivo continuar no mesmo caminho', () => {
    const existing: Lesson[] = [
      {
        id: 'l_existing_1',
        courseId,
        moduleName: '01 - Introdução',
        title: '01 - Boas-vindas',
        relativePath: '01 - Introdução/01 - Boas-vindas.mp4',
        sizeBytes: 1000,
        available: true,
        positionSeconds: 154.2,
        durationSeconds: 600,
        completed: true,
        lastWatchedAt: '2026-10-31T10:00:00.000Z'
      }
    ];

    const scanned: ScannedLessonItem[] = [
      {
        moduleName: '01 - Introdução',
        title: '01 - Boas-vindas',
        relativePath: '01 - Introdução/01 - Boas-vindas.mp4',
        sizeBytes: 1000
      },
      {
        moduleName: '01 - Introdução',
        title: '02 - Aula Nova',
        relativePath: '01 - Introdução/02 - Aula Nova.mp4',
        sizeBytes: 3000
      }
    ];

    const { lessons, summary } = reconcileLessons(courseId, existing, scanned);

    expect(lessons.length).toBe(2);
    expect(summary.added).toBe(1);

    const oldLesson = lessons.find((l) => l.relativePath === '01 - Introdução/01 - Boas-vindas.mp4');
    expect(oldLesson?.id).toBe('l_existing_1');
    expect(oldLesson?.positionSeconds).toBe(154.2);
    expect(oldLesson?.completed).toBe(true);
  });

  it('deve marcar aula ausente como available=false sem apagar histórico', () => {
    const existing: Lesson[] = [
      {
        id: 'l_existing_1',
        courseId,
        moduleName: '01 - Introdução',
        title: '01 - Boas-vindas',
        relativePath: '01 - Introdução/01 - Boas-vindas.mp4',
        sizeBytes: 1000,
        available: true,
        positionSeconds: 210,
        durationSeconds: 500,
        completed: false
      }
    ];

    // O scan agora não encontrou nada (arquivo foi deletado ou pasta desconectada)
    const scanned: ScannedLessonItem[] = [];

    const { lessons, summary } = reconcileLessons(courseId, existing, scanned);

    expect(lessons.length).toBe(1);
    expect(summary.missing).toBe(1);
    expect(lessons[0].available).toBe(false);
    expect(lessons[0].positionSeconds).toBe(210); // progresso preservado!
  });

  it('deve reconciliar arquivo renomeado no mesmo módulo com mesmo tamanho exato', () => {
    const existing: Lesson[] = [
      {
        id: 'l_existing_1',
        courseId,
        moduleName: '01 - Introdução',
        title: '01 - Nome Antigo',
        relativePath: '01 - Introdução/01 - Nome Antigo.mp4',
        sizeBytes: 1234567,
        available: true,
        positionSeconds: 345,
        durationSeconds: 800,
        completed: true
      }
    ];

    const scanned: ScannedLessonItem[] = [
      {
        moduleName: '01 - Introdução',
        title: '01 - Nome Novo Corrigido',
        relativePath: '01 - Introdução/01 - Nome Novo Corrigido.mp4',
        sizeBytes: 1234567 // mesmo tamanho
      }
    ];

    const { lessons, summary } = reconcileLessons(courseId, existing, scanned);

    expect(lessons.length).toBe(1);
    expect(summary.restored).toBe(1);
    expect(lessons[0].id).toBe('l_existing_1'); // manteve ID
    expect(lessons[0].title).toBe('01 - Nome Novo Corrigido');
    expect(lessons[0].positionSeconds).toBe(345); // manteve progresso
    expect(lessons[0].completed).toBe(true);
  });
});
