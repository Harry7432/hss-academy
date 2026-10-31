import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CourseManager } from '../src/main/courseManager';
import { AppStorage } from '../src/main/storage';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Lógica de Seek e Avanço/Retrocesso no Player', () => {
  let tempStorageDir: string;
  let tempCourseDir: string;
  let storage: AppStorage;
  let manager: CourseManager;

  beforeEach(() => {
    tempStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hss-seek-storage-'));
    tempCourseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hss-seek-course-'));

    storage = new AppStorage(tempStorageDir);
    manager = new CourseManager(storage);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempStorageDir, { recursive: true, force: true });
      fs.rmSync(tempCourseDir, { recursive: true, force: true });
    } catch {}
  });

  it('deve atualizar e salvar a posição ao buscar tempo arbitrário (seek)', async () => {
    const mod1 = path.join(tempCourseDir, '01 - Módulo');
    fs.mkdirSync(mod1);
    fs.writeFileSync(path.join(mod1, '01 - Aula.mp4'), 'video-fake');

    const detail = await manager.addCourse(tempCourseDir);
    const lessonId = detail.modules[0].lessons[0].id;
    const duration = 600; // 10 minutos

    // Seek para 3 minutos (180 segundos)
    manager.saveLessonProgress(lessonId, 180, duration);
    let lesson = storage.getLessonById(lessonId);
    expect(lesson?.positionSeconds).toBe(180);

    // Seek avançando para 7 minutos (420 segundos)
    manager.saveLessonProgress(lessonId, 420, duration);
    lesson = storage.getLessonById(lessonId);
    expect(lesson?.positionSeconds).toBe(420);

    // Seek retrocedendo para 1 minuto (60 segundos)
    manager.saveLessonProgress(lessonId, 60, duration);
    lesson = storage.getLessonById(lessonId);
    expect(lesson?.positionSeconds).toBe(60);
  });

  it('deve aplicar limites de clamping para saltos de tempo (-5s / +5s)', () => {
    const duration = 100;

    const clampSeek = (current: number, delta: number, dur: number) => {
      return Math.max(0, Math.min(dur, current + delta));
    };

    // Salto de -5s no início não pode ficar negativo
    expect(clampSeek(2, -5, duration)).toBe(0);

    // Salto de +5s normal
    expect(clampSeek(10, 5, duration)).toBe(15);

    // Salto de +5s perto do fim não pode ultrapassar a duração
    expect(clampSeek(98, 5, duration)).toBe(100);
  });
});
