import { contextBridge, ipcRenderer } from 'electron';
import { Course, CourseDetail, HssApi, Lesson, UpdateSummary, ContinueLessonInfo } from '../shared/types';

const api: HssApi = {
  selectCourseFolder: async (): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:select-course-folder');
  },
  addCourse: async (folderPath: string): Promise<CourseDetail> => {
    return ipcRenderer.invoke('course:add', folderPath);
  },
  getCourses: async (): Promise<Course[]> => {
    return ipcRenderer.invoke('course:get-all');
  },
  getCourseDetail: async (courseId: string): Promise<CourseDetail | null> => {
    return ipcRenderer.invoke('course:get-detail', courseId);
  },
  updateCourse: async (courseId: string): Promise<{ detail: CourseDetail; summary: UpdateSummary }> => {
    return ipcRenderer.invoke('course:update', courseId);
  },
  changeCourseFolder: async (courseId: string, newFolderPath: string): Promise<CourseDetail> => {
    return ipcRenderer.invoke('course:change-folder', courseId, newFolderPath);
  },
  removeCourse: async (courseId: string): Promise<boolean> => {
    return ipcRenderer.invoke('course:delete', courseId);
  },
  saveLessonProgress: async (
    lessonId: string,
    positionSeconds: number,
    durationSeconds: number,
    completed?: boolean
  ): Promise<boolean> => {
    return ipcRenderer.invoke('lesson:save-progress', lessonId, positionSeconds, durationSeconds, completed);
  },
  toggleLessonCompleted: async (
    lessonId: string,
    completed?: boolean
  ): Promise<{ lesson: Lesson; progressPercent: number }> => {
    return ipcRenderer.invoke('lesson:toggle-completed', lessonId, completed);
  },
  getContinueLesson: async (): Promise<ContinueLessonInfo | null> => {
    return ipcRenderer.invoke('app:get-continue-lesson');
  },
  openExternalPlayer: async (lessonId: string): Promise<boolean> => {
    return ipcRenderer.invoke('lesson:open-external', lessonId);
  },
  getVideoUrl: async (lessonId: string): Promise<string> => {
    return ipcRenderer.invoke('video:get-url', lessonId);
  }
};

contextBridge.exposeInMainWorld('hssApi', api);
