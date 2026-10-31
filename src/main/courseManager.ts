import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { shell } from 'electron';
import { Course, CourseDetail, Lesson, Module, UpdateSummary } from '../shared/types';
import { scanCourseDirectory, naturalCompare } from './scanner';
import { reconcileLessons } from './reconciler';
import { AppStorage } from './storage';

export class CourseManager {
  private storage: AppStorage;

  constructor(storage: AppStorage) {
    this.storage = storage;
  }

  /**
   * Adiciona um novo curso a partir de uma pasta local do computador.
   */
  public async addCourse(folderPath: string): Promise<CourseDetail> {
    const resolvedPath = path.resolve(folderPath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`A pasta especificada não existe: ${folderPath}`);
    }

    // Verificar se já existe um curso com essa mesma pasta
    const existing = this.storage.getCourses().find(
      (c) => path.resolve(c.rootPath).toLowerCase() === resolvedPath.toLowerCase()
    );
    if (existing) {
      return this.getCourseDetail(existing.id)!;
    }

    const scanResult = scanCourseDirectory(resolvedPath);
    const courseId = `c_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const now = new Date().toISOString();

    const { lessons } = reconcileLessons(courseId, [], scanResult.lessons);

    const newCourse: Course = {
      id: courseId,
      title: scanResult.title,
      rootPath: resolvedPath,
      createdAt: now,
      updatedAt: now,
      lastLessonId: lessons.length > 0 ? lessons[0].id : undefined,
      totalLessons: lessons.length,
      completedLessons: 0,
      progressPercent: 0
    };

    const allCourses = [...this.storage.getCourses(), newCourse];
    const allLessons = [...this.storage.getLessons(), ...lessons];

    this.storage.setCourses(allCourses);
    this.storage.setLessons(allLessons);

    if (!this.storage.getData().lastGlobalLessonId && lessons.length > 0) {
      this.storage.setLastGlobalLessonId(lessons[0].id);
    }

    return this.getCourseDetail(courseId)!;
  }

  /**
   * Atualiza as aulas de um curso através de uma nova varredura de disco.
   */
  public async updateCourse(courseId: string): Promise<{ detail: CourseDetail; summary: UpdateSummary }> {
    const course = this.storage.getCourseById(courseId);
    if (!course) {
      throw new Error('Curso não encontrado');
    }

    const resolvedPath = path.resolve(course.rootPath);
    if (!fs.existsSync(resolvedPath)) {
      // Pasta inacessível: não apaga progresso! Marca aulas como indisponíveis
      const courseLessons = this.storage.getCourseLessons(courseId).map((l) => ({
        ...l,
        available: false
      }));

      const otherLessons = this.storage.getLessons().filter((l) => l.courseId !== courseId);
      this.storage.setLessons([...otherLessons, ...courseLessons]);

      const detail = this.getCourseDetail(courseId)!;
      return {
        detail,
        summary: {
          added: 0,
          restored: 0,
          missing: courseLessons.length,
          total: courseLessons.length
        }
      };
    }

    const scanResult = scanCourseDirectory(resolvedPath);
    const currentCourseLessons = this.storage.getCourseLessons(courseId);

    const { lessons: updatedCourseLessons, summary } = reconcileLessons(
      courseId,
      currentCourseLessons,
      scanResult.lessons
    );

    const otherLessons = this.storage.getLessons().filter((l) => l.courseId !== courseId);
    this.storage.setLessons([...otherLessons, ...updatedCourseLessons]);

    // Atualiza curso
    const completedCount = updatedCourseLessons.filter((l) => l.completed).length;
    const totalCount = updatedCourseLessons.filter((l) => l.available).length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const updatedCourses = this.storage.getCourses().map((c) => {
      if (c.id === courseId) {
        return {
          ...c,
          title: scanResult.title || c.title,
          updatedAt: new Date().toISOString(),
          totalLessons: totalCount,
          completedLessons: completedCount,
          progressPercent: progress
        };
      }
      return c;
    });

    this.storage.setCourses(updatedCourses);

    return {
      detail: this.getCourseDetail(courseId)!,
      summary
    };
  }

  /**
   * Altera a pasta raiz do curso e reconcilia preservando o progresso.
   */
  public async changeCourseFolder(courseId: string, newFolderPath: string): Promise<CourseDetail> {
    const course = this.storage.getCourseById(courseId);
    if (!course) {
      throw new Error('Curso não encontrado');
    }

    const resolvedPath = path.resolve(newFolderPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`A nova pasta não existe: ${newFolderPath}`);
    }

    // Atualiza o rootPath
    const scanResult = scanCourseDirectory(resolvedPath);
    const currentCourseLessons = this.storage.getCourseLessons(courseId);

    const { lessons: updatedCourseLessons } = reconcileLessons(
      courseId,
      currentCourseLessons,
      scanResult.lessons
    );

    const otherLessons = this.storage.getLessons().filter((l) => l.courseId !== courseId);
    this.storage.setLessons([...otherLessons, ...updatedCourseLessons]);

    const completedCount = updatedCourseLessons.filter((l) => l.completed).length;
    const totalCount = updatedCourseLessons.filter((l) => l.available).length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const updatedCourses = this.storage.getCourses().map((c) => {
      if (c.id === courseId) {
        return {
          ...c,
          title: scanResult.title || c.title,
          rootPath: resolvedPath,
          updatedAt: new Date().toISOString(),
          totalLessons: totalCount,
          completedLessons: completedCount,
          progressPercent: progress
        };
      }
      return c;
    });

    this.storage.setCourses(updatedCourses);

    return this.getCourseDetail(courseId)!;
  }

  /**
   * Remove um curso do app (apenas os registros locais do app, jamais os arquivos do usuário).
   */
  public removeCourse(courseId: string): boolean {
    const courses = this.storage.getCourses().filter((c) => c.id !== courseId);
    const lessons = this.storage.getLessons().filter((l) => l.courseId !== courseId);

    this.storage.setCourses(courses);
    this.storage.setLessons(lessons);

    if (this.storage.getData().lastGlobalLessonId) {
      const lastLesson = lessons.find((l) => l.id === this.storage.getData().lastGlobalLessonId);
      if (!lastLesson) {
        this.storage.setLastGlobalLessonId(lessons.length > 0 ? lessons[0].id : undefined);
      }
    }

    return true;
  }

  /**
   * Retorna lista de cursos com progresso computado.
   */
  public getCoursesWithProgress(): Course[] {
    const courses = this.storage.getCourses();
    const allLessons = this.storage.getLessons();

    return courses.map((course) => {
      const courseLessons = allLessons.filter((l) => l.courseId === course.id);
      const availableLessons = courseLessons.filter((l) => l.available);
      const completedLessons = availableLessons.filter((l) => l.completed);

      const total = availableLessons.length;
      const completed = completedLessons.length;
      const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        ...course,
        totalLessons: total,
        completedLessons: completed,
        progressPercent
      };
    });
  }

  /**
   * Retorna os detalhes de um curso, agrupando em módulos com ordenação natural.
   */
  public getCourseDetail(courseId: string): CourseDetail | null {
    const course = this.storage.getCourseById(courseId);
    if (!course) return null;

    const courseLessons = this.storage.getCourseLessons(courseId);
    const availableLessons = courseLessons.filter((l) => l.available);
    const completedCount = availableLessons.filter((l) => l.completed).length;
    const progressPercent = availableLessons.length > 0 ? Math.round((completedCount / availableLessons.length) * 100) : 0;

    // Agrupar por moduleName
    const moduleMap = new Map<string, Lesson[]>();
    for (const lesson of courseLessons) {
      const mod = lesson.moduleName || 'Aulas gerais';
      if (!moduleMap.has(mod)) {
        moduleMap.set(mod, []);
      }
      moduleMap.get(mod)!.push(lesson);
    }

    const moduleNames = Array.from(moduleMap.keys()).sort(naturalCompare);
    const modules: Module[] = moduleNames.map((name) => {
      const lessons = moduleMap.get(name)!;
      // Ordenação natural das aulas dentro do módulo
      lessons.sort((a, b) => naturalCompare(a.relativePath, b.relativePath));

      const modAvail = lessons.filter((l) => l.available);
      const modComp = modAvail.filter((l) => l.completed).length;
      const modProgress = modAvail.length > 0 ? Math.round((modComp / modAvail.length) * 100) : 0;

      return {
        name,
        lessons,
        completedCount: modComp,
        totalCount: modAvail.length,
        progressPercent: modProgress
      };
    });

    return {
      course: {
        ...course,
        totalLessons: availableLessons.length,
        completedLessons: completedCount,
        progressPercent
      },
      modules
    };
  }

  /**
   * Salva progresso de reprodução da aula.
   */
  public saveLessonProgress(
    lessonId: string,
    positionSeconds: number,
    durationSeconds: number,
    completedManual?: boolean
  ): boolean {
    const lesson = this.storage.getLessonById(lessonId);
    if (!lesson) return false;

    // Se completou manualmente ou se atingiu >= 95% do vídeo
    let isCompleted = lesson.completed;
    if (typeof completedManual === 'boolean') {
      isCompleted = completedManual;
    } else if (durationSeconds > 0 && positionSeconds / durationSeconds >= 0.95) {
      isCompleted = true;
    }

    const now = new Date().toISOString();
    const updatedLesson: Lesson = {
      ...lesson,
      positionSeconds: Math.max(0, positionSeconds),
      durationSeconds: durationSeconds > 0 ? durationSeconds : lesson.durationSeconds,
      completed: isCompleted,
      lastWatchedAt: now
    };

    const allLessons = this.storage.getLessons().map((l) => (l.id === lessonId ? updatedLesson : l));
    this.storage.setLessons(allLessons);

    // Atualiza lastLessonId no curso
    const allCourses = this.storage.getCourses().map((c) => {
      if (c.id === lesson.courseId) {
        return {
          ...c,
          lastLessonId: lessonId,
          updatedAt: now
        };
      }
      return c;
    });
    this.storage.setCourses(allCourses);

    // Atualiza lastGlobalLessonId
    this.storage.setLastGlobalLessonId(lessonId);

    return true;
  }

  /**
   * Alterna status de concluído de uma aula.
   */
  public toggleLessonCompleted(
    lessonId: string,
    completed?: boolean
  ): { lesson: Lesson; progressPercent: number } {
    const lesson = this.storage.getLessonById(lessonId);
    if (!lesson) {
      throw new Error('Aula não encontrada');
    }

    const newCompleted = typeof completed === 'boolean' ? completed : !lesson.completed;
    const updatedLesson: Lesson = {
      ...lesson,
      completed: newCompleted
    };

    const allLessons = this.storage.getLessons().map((l) => (l.id === lessonId ? updatedLesson : l));
    this.storage.setLessons(allLessons);

    const detail = this.getCourseDetail(lesson.courseId);
    return {
      lesson: updatedLesson,
      progressPercent: detail ? detail.course.progressPercent : 0
    };
  }

  /**
   * Obtém a última aula assistida (global).
   */
  public getContinueLesson(): { lesson: Lesson; course: Course } | null {
    const lastGlobalId = this.storage.getData().lastGlobalLessonId;
    if (lastGlobalId) {
      const lesson = this.storage.getLessonById(lastGlobalId);
      if (lesson) {
        const course = this.storage.getCourseById(lesson.courseId);
        if (course) {
          return { lesson, course };
        }
      }
    }

    // Se não tiver global, busca a aula com lastWatchedAt mais recente
    const allLessons = this.storage.getLessons().filter((l) => l.available && l.lastWatchedAt);
    if (allLessons.length > 0) {
      allLessons.sort((a, b) => new Date(b.lastWatchedAt!).getTime() - new Date(a.lastWatchedAt!).getTime());
      const lesson = allLessons[0];
      const course = this.storage.getCourseById(lesson.courseId);
      if (course) {
        return { lesson, course };
      }
    }

    // Se ainda não assistiu nada, pega a primeira aula disponível do primeiro curso
    const courses = this.storage.getCourses();
    if (courses.length > 0) {
      const firstCourse = courses[0];
      const firstLessons = this.storage.getCourseLessons(firstCourse.id).filter((l) => l.available);
      if (firstLessons.length > 0) {
        return { lesson: firstLessons[0], course: firstCourse };
      }
    }

    return null;
  }

  /**
   * Abre o arquivo no player padrão do Windows caso o usuário deseje.
   */
  public async openExternalPlayer(lessonId: string): Promise<boolean> {
    const lesson = this.storage.getLessonById(lessonId);
    if (!lesson) return false;

    const course = this.storage.getCourseById(lesson.courseId);
    if (!course) return false;

    const fullPath = path.resolve(course.rootPath, lesson.relativePath);
    if (!fs.existsSync(fullPath)) return false;

    const error = await shell.openPath(fullPath);
    return !error;
  }
}
