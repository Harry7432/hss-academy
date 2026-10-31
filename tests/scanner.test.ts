import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { scanCourseDirectory, isVideoFile, getCleanTitle } from '../src/main/scanner';

describe('Scanner de Diretórios e Vídeos', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hss-scanner-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('deve identificar extensões de vídeo suportadas e ignorar outros arquivos', () => {
    expect(isVideoFile('aula.mp4')).toBe(true);
    expect(isVideoFile('video.mkv')).toBe(true);
    expect(isVideoFile('aula.webm')).toBe(true);
    expect(isVideoFile('aula.avi')).toBe(true);
    expect(isVideoFile('aula.mov')).toBe(true);
    expect(isVideoFile('aula.m4v')).toBe(true);

    expect(isVideoFile('anotacoes.txt')).toBe(false);
    expect(isVideoFile('slides.pdf')).toBe(false);
    expect(isVideoFile('.DS_Store')).toBe(false);
    expect(isVideoFile('~$temporario.mp4')).toBe(false);
  });

  it('deve limpar títulos removendo a extensão do arquivo', () => {
    expect(getCleanTitle('01 - Boas-vindas.mp4')).toBe('01 - Boas-vindas');
    expect(getCleanTitle('Introdução ao React.mkv')).toBe('Introdução ao React');
  });

  it('deve escanear estrutura completa com módulos e aulas soltas', () => {
    // 1. Criar vídeo solto na raiz
    fs.writeFileSync(path.join(tempDir, '00 - Apresentação Geral.mp4'), 'video-fake-content-root');

    // 2. Criar subpasta de módulo "01 - Introdução"
    const mod1 = path.join(tempDir, '01 - Introdução');
    fs.mkdirSync(mod1);
    fs.writeFileSync(path.join(mod1, '01 - Boas-vindas.mp4'), 'video-fake-content-1');
    fs.writeFileSync(path.join(mod1, '02 - Como Estudar.mp4'), 'video-fake-content-2');
    fs.writeFileSync(path.join(mod1, 'material_apoio.pdf'), 'pdf-fake'); // deve ser ignorado

    // 3. Criar subpasta de módulo "02 - JavaScript com IA"
    const mod2 = path.join(tempDir, '02 - JavaScript com IA');
    fs.mkdirSync(mod2);
    fs.writeFileSync(path.join(mod2, '01 - Variáveis.mp4'), 'video-fake-content-3');
    fs.writeFileSync(path.join(mod2, '02 - Condicionais.mp4'), 'video-fake-content-4');

    // Executa a varredura
    const result = scanCourseDirectory(tempDir);

    expect(result.lessons.length).toBe(5);

    // Aula da raiz agrupada em "Aulas gerais"
    const rootLesson = result.lessons.find((l) => l.moduleName === 'Aulas gerais');
    expect(rootLesson).toBeDefined();
    expect(rootLesson?.title).toBe('00 - Apresentação Geral');
    expect(rootLesson?.relativePath).toBe('00 - Apresentação Geral.mp4');

    // Aulas do módulo 1
    const mod1Lessons = result.lessons.filter((l) => l.moduleName === '01 - Introdução');
    expect(mod1Lessons.length).toBe(2);
    expect(mod1Lessons[0].title).toBe('01 - Boas-vindas');
    expect(mod1Lessons[1].title).toBe('02 - Como Estudar');

    // Aulas do módulo 2
    const mod2Lessons = result.lessons.filter((l) => l.moduleName === '02 - JavaScript com IA');
    expect(mod2Lessons.length).toBe(2);
    expect(mod2Lessons[0].title).toBe('01 - Variáveis');
    expect(mod2Lessons[1].title).toBe('02 - Condicionais');
  });

  it('deve disparar erro se o diretório não existir', () => {
    expect(() => scanCourseDirectory('D:\\Caminho\\Inexistente\\XYZ_123')).toThrow();
  });
});
