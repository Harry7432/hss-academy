import fs from 'fs';
import path from 'path';
import { AppData, Course, Lesson } from '../shared/types';

export class AppStorage {
  private filePath: string;
  private backupPath: string;
  private data: AppData;

  constructor(storageDir: string) {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    this.filePath = path.join(storageDir, 'hss_academy_data.json');
    this.backupPath = path.join(storageDir, 'hss_academy_data.json.bak');
    this.data = this.load();
  }

  public getData(): AppData {
    return this.data;
  }

  public getCourses(): Course[] {
    return this.data.courses;
  }

  public getLessons(): Lesson[] {
    return this.data.lessons;
  }

  public getCourseLessons(courseId: string): Lesson[] {
    return this.data.lessons.filter((l) => l.courseId === courseId);
  }

  public getLessonById(lessonId: string): Lesson | undefined {
    return this.data.lessons.find((l) => l.id === lessonId);
  }

  public getCourseById(courseId: string): Course | undefined {
    return this.data.courses.find((c) => c.id === courseId);
  }

  public setCourses(courses: Course[]): void {
    this.data.courses = courses;
    this.save();
  }

  public setLessons(lessons: Lesson[]): void {
    this.data.lessons = lessons;
    this.save();
  }

  public setLastGlobalLessonId(lessonId: string | undefined): void {
    this.data.lastGlobalLessonId = lessonId;
    this.save();
  }

  /**
   * Salva dados atomicamente usando escrita em arquivo temporário e rename,
   * gerando também backup automático.
   */
  public save(): void {
    const tmpPath = `${this.filePath}.tmp`;
    const jsonString = JSON.stringify(this.data, null, 2);

    try {
      // 1. Escreve no arquivo temporário
      fs.writeFileSync(tmpPath, jsonString, 'utf-8');

      // 2. Cria cópia de backup do arquivo anterior se existir
      if (fs.existsSync(this.filePath)) {
        try {
          fs.copyFileSync(this.filePath, this.backupPath);
        } catch (copyErr) {
          console.warn('Aviso ao criar backup de dados:', copyErr);
        }
      }

      // 3. Renomeia atomicamente o temporário para o arquivo oficial
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('Erro na escrita atômica dos dados:', err);
      // Limpeza do .tmp se falhar
      if (fs.existsSync(tmpPath)) {
        try {
          fs.unlinkSync(tmpPath);
        } catch {}
      }
      throw err;
    }
  }

  /**
   * Carrega os dados persistidos, com recuperação automática a partir do backup.
   */
  private load(): AppData {
    const defaultData: AppData = {
      version: 1,
      courses: [],
      lessons: [],
      lastGlobalLessonId: undefined
    };

    if (!fs.existsSync(this.filePath)) {
      if (fs.existsSync(this.backupPath)) {
        try {
          const bakContent = fs.readFileSync(this.backupPath, 'utf-8');
          const parsed = JSON.parse(bakContent);
          return this.sanitizeData(parsed);
        } catch {}
      }
      return defaultData;
    }

    try {
      const fileContent = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      return this.sanitizeData(parsed);
    } catch (parseError) {
      console.error('Arquivo principal corrompido, tentando restaurar backup...', parseError);
      if (fs.existsSync(this.backupPath)) {
        try {
          const bakContent = fs.readFileSync(this.backupPath, 'utf-8');
          const parsedBak = JSON.parse(bakContent);
          const sanitized = this.sanitizeData(parsedBak);
          // Restaura o arquivo principal
          fs.writeFileSync(this.filePath, JSON.stringify(sanitized, null, 2), 'utf-8');
          return sanitized;
        } catch (bakError) {
          console.error('Falha ao restaurar do backup:', bakError);
        }
      }
      return defaultData;
    }
  }

  private sanitizeData(raw: any): AppData {
    return {
      version: typeof raw?.version === 'number' ? raw.version : 1,
      courses: Array.isArray(raw?.courses) ? raw.courses : [],
      lessons: Array.isArray(raw?.lessons) ? raw.lessons : [],
      lastGlobalLessonId: typeof raw?.lastGlobalLessonId === 'string' ? raw.lastGlobalLessonId : undefined
    };
  }
}
