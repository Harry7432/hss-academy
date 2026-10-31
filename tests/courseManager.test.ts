import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AppStorage } from '../src/main/storage';
import { CourseManager } from '../src/main/courseManager';

describe('Gerenciador de Cursos (CourseManager)', () => {
  let tempStorageDir: string;
  let tempCourseDir: string;
  let storage: AppStorage;
  let manager: CourseManager;

  beforeEach(() => {
    tempStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hss-cm-storage-'));
    tempCourseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hss-cm-course-'));

    storage = new AppStorage(tempStorageDir);
    manager = new CourseManager(storage);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempStorageDir, { recursive: true, force: true });
      fs.rmSync(tempCourseDir, { recursive: true, force: true });
    } catch {}
  });

  it('deve adicionar um curso, identificar módulos e calcular progresso', async () => {
    // Monta pasta do curso com 2 módulos e 3 aulas
    const mod1 = path.join(tempCourseDir, '01 - Módulo 1');
    const mod2 = path.join(tempCourseDir, '02 - Módulo 2');
    fs.mkdirSync(mod1);
    fs.mkdirSync(mod2);

    fs.writeFileSync(path.join(mod1, '01 - Aula A.mp4'), 'video-1');
    fs.writeFileSync(path.join(mod1, '02 - Aula B.mp4'), 'video-2');
    fs.writeFileSync(path.join(mod2, '01 - Aula C.mp4'), 'video-3');

    const detail = await manager.addCourse(tempCourseDir);

    expect(detail.course.totalLessons).toBe(3);
    expect(detail.course.completedLessons).toBe(0);
    expect(detail.course.progressPercent).toBe(0);
    expect(detail.modules.length).toBe(2);
    expect(detail.modules[0].name).toBe('01 - Módulo 1');
    expect(detail.modules[0].lessons.length).toBe(2);

    // Salvar progresso na primeira aula
    const firstLessonId = detail.modules[0].lessons[0].id;
    manager.saveLessonProgress(firstLessonId, 120, 600);

    const updatedDetail = manager.getCourseDetail(detail.course.id);
    expect(updatedDetail?.course.lastLessonId).toBe(firstLessonId);

    // Marcar primeira aula como concluída
    manager.toggleLessonCompleted(firstLessonId, true);
    const finalDetail = manager.getCourseDetail(detail.course.id);

    expect(finalDetail?.course.completedLessons).toBe(1);
    // 1 de 3 = 33%
    expect(finalDetail?.course.progressPercent).toBe(33);
    expect(finalDetail?.modules[0].completedCount).toBe(1);
    expect(finalDetail?.modules[0].progressPercent).toBe(50);
  });

  it('deve atualizar o curso ao adicionar novas aulas sem perder histórico', async () => {
    const mod1 = path.join(tempCourseDir, '01 - Módulo');
    fs.mkdirSync(mod1);
    fs.writeFileSync(path.join(mod1, '01 - Aula 1.mp4'), 'video-1');

    const detail = await manager.addCourse(tempCourseDir);
    const lesson1Id = detail.modules[0].lessons[0].id;

    // Salva progresso na aula 1
    manager.saveLessonProgress(lesson1Id, 45, 100, true);

    // Adiciona uma nova aula no disco
    fs.writeFileSync(path.join(mod1, '02 - Aula Nova.mp4'), 'video-2');

    // Executa atualização (botão "Atualizar aulas")
    const { detail: updatedDetail, summary } = await manager.updateCourse(detail.course.id);

    expect(summary.added).toBe(1);
    expect(updatedDetail.course.totalLessons).toBe(2);
    expect(updatedDetail.course.completedLessons).toBe(1);
    expect(updatedDetail.course.progressPercent).toBe(50);

    // Aula 1 continua com seu progresso intacto
    const l1 = updatedDetail.modules[0].lessons.find((l) => l.id === lesson1Id);
    expect(l1?.completed).toBe(true);
    expect(l1?.positionSeconds).toBe(45);
  });

  it('deve manter progresso ao alterar pasta raiz do curso', async () => {
    const mod1 = path.join(tempCourseDir, '01 - Módulo');
    fs.mkdirSync(mod1);
    fs.writeFileSync(path.join(mod1, '01 - Aula.mp4'), 'video-content');

    const detail = await manager.addCourse(tempCourseDir);
    const lessonId = detail.modules[0].lessons[0].id;
    manager.saveLessonProgress(lessonId, 90, 180, true);

    // Cria nova pasta de destino simulando curso movido
    const newCourseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hss-moved-course-'));
    try {
      const newMod1 = path.join(newCourseDir, '01 - Módulo');
      fs.mkdirSync(newMod1);
      fs.writeFileSync(path.join(newMod1, '01 - Aula.mp4'), 'video-content');

      // Altera pasta raiz
      const movedDetail = await manager.changeCourseFolder(detail.course.id, newCourseDir);

      expect(movedDetail.course.rootPath).toBe(path.resolve(newCourseDir));
      expect(movedDetail.course.completedLessons).toBe(1);
      expect(movedDetail.modules[0].lessons[0].positionSeconds).toBe(90);
      expect(movedDetail.modules[0].lessons[0].completed).toBe(true);
    } finally {
      fs.rmSync(newCourseDir, { recursive: true, force: true });
    }
  });
});
