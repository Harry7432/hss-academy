import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import { registerMediaSchemePrivilege, setupMediaProtocol } from './mediaProtocol';
import { AppStorage } from './storage';
import { CourseManager } from './courseManager';

// Registrar scheme de streaming de mídia como privilegiado antes do app ready
registerMediaSchemePrivilege();

let mainWindow: BrowserWindow | null = null;
let storage: AppStorage | null = null;
let courseManager: CourseManager | null = null;

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'HSS Academy',
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    // Modo de produção: carrega o index.html gerado na pasta dist
    const indexPath = path.join(__dirname, '../../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Configuração inicial quando o Electron estiver pronto
app.whenReady().then(() => {
  const userDataPath = app.getPath('userData');
  storage = new AppStorage(userDataPath);
  courseManager = new CourseManager(storage);

  setupMediaProtocol(storage);
  setupIpcHandlers(courseManager);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIpcHandlers(manager: CourseManager) {
  // Diálogo nativo de seleção de pasta no Windows
  ipcMain.handle('dialog:select-course-folder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecione a pasta do Curso',
      properties: ['openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Adicionar novo curso
  ipcMain.handle('course:add', async (_event, folderPath: string) => {
    return await manager.addCourse(folderPath);
  });

  // Listar todos os cursos
  ipcMain.handle('course:get-all', async () => {
    return manager.getCoursesWithProgress();
  });

  // Obter detalhes completos do curso
  ipcMain.handle('course:get-detail', async (_event, courseId: string) => {
    return manager.getCourseDetail(courseId);
  });

  // Atualizar aulas de um curso (varredura + reconciliação)
  ipcMain.handle('course:update', async (_event, courseId: string) => {
    return await manager.updateCourse(courseId);
  });

  // Alterar pasta raiz do curso
  ipcMain.handle('course:change-folder', async (_event, courseId: string, newFolderPath: string) => {
    return await manager.changeCourseFolder(courseId, newFolderPath);
  });

  // Remover curso do app
  ipcMain.handle('course:delete', async (_event, courseId: string) => {
    return manager.removeCourse(courseId);
  });

  // Salvar progresso
  ipcMain.handle(
    'lesson:save-progress',
    async (_event, lessonId: string, positionSeconds: number, durationSeconds: number, completed?: boolean) => {
      return manager.saveLessonProgress(lessonId, positionSeconds, durationSeconds, completed);
    }
  );

  // Marcar/desmarcar concluída
  ipcMain.handle('lesson:toggle-completed', async (_event, lessonId: string, completed?: boolean) => {
    return manager.toggleLessonCompleted(lessonId, completed);
  });

  // Continuar estudando
  ipcMain.handle('app:get-continue-lesson', async () => {
    return manager.getContinueLesson();
  });

  // Abrir no player nativo do Windows
  ipcMain.handle('lesson:open-external', async (_event, lessonId: string) => {
    return await manager.openExternalPlayer(lessonId);
  });

  // Obter URL local protegida para o player
  ipcMain.handle('video:get-url', async (_event, lessonId: string) => {
    return `hss-media://lesson/${encodeURIComponent(lessonId)}`;
  });
}
