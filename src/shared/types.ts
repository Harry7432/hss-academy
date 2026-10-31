export interface Lesson {
  id: string;
  courseId: string;
  moduleName: string;
  title: string;
  relativePath: string;
  sizeBytes: number;
  available: boolean;
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
  lastWatchedAt?: string;
}

export interface Course {
  id: string;
  title: string;
  rootPath: string;
  createdAt: string;
  updatedAt: string;
  lastLessonId?: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
}

export interface Module {
  name: string;
  lessons: Lesson[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
}

export interface CourseDetail {
  course: Course;
  modules: Module[];
}

export interface AppData {
  version: number;
  courses: Course[];
  lessons: Lesson[];
  lastGlobalLessonId?: string;
}

export interface ContinueLessonInfo {
  lesson: Lesson;
  course: Course;
}

export interface ScanResult {
  title: string;
  lessons: Array<{
    moduleName: string;
    title: string;
    relativePath: string;
    sizeBytes: number;
  }>;
}

export interface UpdateSummary {
  added: number;
  restored: number;
  missing: number;
  total: number;
}

export interface HssApi {
  selectCourseFolder: () => Promise<string | null>;
  addCourse: (folderPath: string) => Promise<CourseDetail>;
  getCourses: () => Promise<Course[]>;
  getCourseDetail: (courseId: string) => Promise<CourseDetail | null>;
  updateCourse: (courseId: string) => Promise<{ detail: CourseDetail; summary: UpdateSummary }>;
  changeCourseFolder: (courseId: string, newFolderPath: string) => Promise<CourseDetail>;
  removeCourse: (courseId: string) => Promise<boolean>;
  saveLessonProgress: (
    lessonId: string,
    positionSeconds: number,
    durationSeconds: number,
    completed?: boolean
  ) => Promise<boolean>;
  toggleLessonCompleted: (lessonId: string, completed?: boolean) => Promise<{ lesson: Lesson; progressPercent: number }>;
  getContinueLesson: () => Promise<ContinueLessonInfo | null>;
  openExternalPlayer: (lessonId: string) => Promise<boolean>;
  getVideoUrl: (lessonId: string) => Promise<string>;
}

declare global {
  interface Window {
    hssApi: HssApi;
  }
}
