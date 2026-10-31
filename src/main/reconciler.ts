import crypto from 'crypto';
import { Lesson, UpdateSummary } from '../shared/types';
import { ScannedLessonItem } from './scanner';

/**
 * Gera um ID único e estável para uma aula.
 */
export function generateLessonId(courseId: string, relativePath: string): string {
  const hash = crypto.createHash('sha256').update(`${courseId}:${relativePath}`).digest('hex');
  return `l_${hash.substring(0, 16)}`;
}

/**
 * Reconcilia as aulas escaneadas do disco com as aulas previamente registradas no banco de dados.
 */
export function reconcileLessons(
  courseId: string,
  existingLessons: Lesson[],
  scannedLessons: ScannedLessonItem[]
): { lessons: Lesson[]; summary: UpdateSummary } {
  const summary: UpdateSummary = {
    added: 0,
    restored: 0,
    missing: 0,
    total: 0
  };

  // Mapear aulas existentes deste curso por relativePath
  const existingMap = new Map<string, Lesson>();
  for (const l of existingLessons) {
    if (l.courseId === courseId) {
      existingMap.set(l.relativePath, { ...l });
    }
  }

  // Conjunto de caminhos encontrados no scan
  const scannedRelativePaths = new Set<string>();
  for (const s of scannedLessons) {
    scannedRelativePaths.add(s.relativePath);
  }

  // Identificar quais aulas sumiram
  const missingLessons: Lesson[] = [];
  for (const [relPath, lesson] of existingMap.entries()) {
    if (!scannedRelativePaths.has(relPath)) {
      missingLessons.push(lesson);
    }
  }

  // Identificar novos itens escaneados
  const newScannedItems: ScannedLessonItem[] = [];
  for (const s of scannedLessons) {
    if (!existingMap.has(s.relativePath)) {
      newScannedItems.push(s);
    }
  }

  // Heurística conservadora de renomeação:
  // Se exatamente 1 aula sumiu de um módulo e exatamente 1 aula nova apareceu no mesmo módulo com o mesmo tamanho exato de bytes
  const renamedMap = new Map<string, ScannedLessonItem>(); // missing relativePath -> new item
  const usedNewScanned = new Set<string>();

  for (const missing of missingLessons) {
    const candidates = newScannedItems.filter(
      (n) =>
        !usedNewScanned.has(n.relativePath) &&
        n.moduleName === missing.moduleName &&
        n.sizeBytes === missing.sizeBytes &&
        n.sizeBytes > 0
    );

    if (candidates.length === 1) {
      const match = candidates[0];
      renamedMap.set(missing.relativePath, match);
      usedNewScanned.add(match.relativePath);
    }
  }

  const updatedLessons: Lesson[] = [];

  // 1. Processar itens escaneados
  for (const item of scannedLessons) {
    // Se foi renomeado de uma aula ausente
    let matchedOldLesson: Lesson | undefined;
    for (const [oldRelPath, newScanned] of renamedMap.entries()) {
      if (newScanned.relativePath === item.relativePath) {
        matchedOldLesson = existingMap.get(oldRelPath);
        break;
      }
    }

    if (matchedOldLesson) {
      // Preserva o histórico da aula antiga com o novo caminho
      updatedLessons.push({
        ...matchedOldLesson,
        relativePath: item.relativePath,
        title: item.title,
        moduleName: item.moduleName,
        sizeBytes: item.sizeBytes,
        available: true
      });
      summary.restored++;
      continue;
    }

    // Se já existia normalmente
    const existing = existingMap.get(item.relativePath);
    if (existing) {
      if (!existing.available) {
        summary.restored++;
      }
      updatedLessons.push({
        ...existing,
        title: item.title,
        moduleName: item.moduleName,
        sizeBytes: item.sizeBytes,
        available: true
      });
    } else {
      // Aula nova
      summary.added++;
      updatedLessons.push({
        id: generateLessonId(courseId, item.relativePath),
        courseId,
        moduleName: item.moduleName,
        title: item.title,
        relativePath: item.relativePath,
        sizeBytes: item.sizeBytes,
        available: true,
        positionSeconds: 0,
        durationSeconds: 0,
        completed: false
      });
    }
  }

  // 2. Preservar aulas antigas que sumiram do disco (sem apagar dados nem progresso!)
  for (const missing of missingLessons) {
    if (renamedMap.has(missing.relativePath)) {
      // Já foi aproveitada pela renomeação
      continue;
    }
    summary.missing++;
    updatedLessons.push({
      ...missing,
      available: false
    });
  }

  summary.total = updatedLessons.length;

  return {
    lessons: updatedLessons,
    summary
  };
}
