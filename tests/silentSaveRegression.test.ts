import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CourseManager } from '../src/main/courseManager';
import { AppStorage } from '../src/main/storage';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Regressão: Salvamento Silencioso de Progresso', () => {
  let tempStorageDir: string;
  let tempCourseDir: string;
  let storage: AppStorage;
  let manager: CourseManager;

  beforeEach(() => {
    tempStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hss-reg-storage-'));
    tempCourseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hss-reg-course-'));

    storage = new AppStorage(tempStorageDir);
    manager = new CourseManager(storage);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempStorageDir, { recursive: true, force: true });
      fs.rmSync(tempCourseDir, { recursive: true, force: true });
    } catch {}
  });

  it('deve persistir posição e duração no storage sem falhas', async () => {
    const mod1 = path.join(tempCourseDir, '01 - Módulo');
    fs.mkdirSync(mod1);
    fs.writeFileSync(path.join(mod1, '01 - Aula.mp4'), 'conteudo-fake');

    const detail = await manager.addCourse(tempCourseDir);
    const lessonId = detail.modules[0].lessons[0].id;

    // Simula salvamento automático periódico
    const success = manager.saveLessonProgress(lessonId, 45.5, 600);
    expect(success).toBe(true);

    const savedLesson = storage.getLessonById(lessonId);
    expect(savedLesson).toBeDefined();
    expect(savedLesson?.positionSeconds).toBe(45.5);
    expect(savedLesson?.durationSeconds).toBe(600);
  });

  it('não deve conter nenhum indicador visual de "Posição salva" nos arquivos do renderer', () => {
    const rendererDir = path.resolve(__dirname, '../src/renderer');
    const files = fs.readdirSync(rendererDir, { recursive: true }) as string[];

    for (const file of files) {
      const fullPath = path.join(rendererDir, file);
      if (fs.statSync(fullPath).isFile() && (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css') || file.endsWith('.html'))) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(content).not.toContain('Posição salva');
        expect(content).not.toContain('Posicao salva');
        expect(content).not.toContain('isSavedIndicator');
      }
    }
  });

  it('deve retornar false caso o salvamento falhe (ex: lessonId inexistente), permitindo aviso apenas em caso de erro real', () => {
    const success = manager.saveLessonProgress('id-inexistente-xyz', 10, 100);
    expect(success).toBe(false);
  });
});
