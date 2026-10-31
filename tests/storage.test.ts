import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AppStorage } from '../src/main/storage';

describe('Armazenamento Atômico (AppStorage)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hss-storage-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('deve inicializar com dados padrão quando o arquivo não existir', () => {
    const storage = new AppStorage(tempDir);
    const data = storage.getData();

    expect(data.version).toBe(1);
    expect(data.courses).toEqual([]);
    expect(data.lessons).toEqual([]);
  });

  it('deve salvar e carregar cursos e aulas com escrita atômica', () => {
    const storage = new AppStorage(tempDir);

    storage.setCourses([
      {
        id: 'c1',
        title: 'Curso 1',
        rootPath: 'C:\\Cursos\\1',
        createdAt: '2026-10-31',
        updatedAt: '2026-10-31',
        totalLessons: 1,
        completedLessons: 0,
        progressPercent: 0
      }
    ]);

    // Recria a instância para ler do disco
    const newStorage = new AppStorage(tempDir);
    expect(newStorage.getCourses().length).toBe(1);
    expect(newStorage.getCourses()[0].title).toBe('Curso 1');
  });

  it('deve criar backup automático e recuperar dados se o arquivo principal for corrompido', () => {
    const storage = new AppStorage(tempDir);

    // Salva primeira versão
    storage.setCourses([
      {
        id: 'c1',
        title: 'Curso Original',
        rootPath: 'C:\\Cursos\\1',
        createdAt: '2026-10-31',
        updatedAt: '2026-10-31',
        totalLessons: 1,
        completedLessons: 0,
        progressPercent: 0
      }
    ]);

    // Salva segunda versão (gerando backup da anterior)
    storage.setCourses([
      {
        id: 'c1',
        title: 'Curso Versão 2',
        rootPath: 'C:\\Cursos\\1',
        createdAt: '2026-10-31',
        updatedAt: '2026-10-31',
        totalLessons: 1,
        completedLessons: 0,
        progressPercent: 0
      }
    ]);

    const mainFile = path.join(tempDir, 'hss_academy_data.json');
    const backupFile = path.join(tempDir, 'hss_academy_data.json.bak');

    expect(fs.existsSync(mainFile)).toBe(true);
    expect(fs.existsSync(backupFile)).toBe(true);

    // Corrompe propositalmente o arquivo principal com JSON inválido
    fs.writeFileSync(mainFile, '<<< CORRUPTED NON-JSON CONTENT >>>', 'utf-8');

    // Ao instanciar um novo storage, ele deve detectar a corrupção e recuperar do backup!
    const recoveredStorage = new AppStorage(tempDir);
    expect(recoveredStorage.getCourses().length).toBe(1);
    expect(recoveredStorage.getCourses()[0].id).toBe('c1');
  });
});
