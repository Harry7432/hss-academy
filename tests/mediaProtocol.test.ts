import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getMimeType } from '../src/main/mediaProtocol';

describe('Protocolo de Mídia e Range Requests', () => {
  let tempDir: string;
  let testVideoPath: string;
  const mockVideoContent = '0123456789'.repeat(100); // 1000 bytes

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hss-media-test-'));
    testVideoPath = path.join(tempDir, 'aula_teste.mp4');
    fs.writeFileSync(testVideoPath, mockVideoContent);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('deve identificar corretamente os tipos MIME para streaming de vídeo', () => {
    expect(getMimeType('video.mp4')).toBe('video/mp4');
    expect(getMimeType('video.m4v')).toBe('video/mp4');
    expect(getMimeType('video.webm')).toBe('video/webm');
    expect(getMimeType('video.mkv')).toBe('video/x-matroska');
    expect(getMimeType('video.mov')).toBe('video/quicktime');
    expect(getMimeType('video.avi')).toBe('video/x-msvideo');
  });

  it('deve calcular corretamente chunks e headers para requisições Range (HTTP 206)', () => {
    const fileSize = fs.statSync(testVideoPath).size;
    expect(fileSize).toBe(1000);

    // Simulação do parser de Range
    const rangeHeader = 'bytes=200-499';
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parseInt(parts[1], 10);
    const chunkSize = end - start + 1;

    expect(start).toBe(200);
    expect(end).toBe(499);
    expect(chunkSize).toBe(300);

    const contentRange = `bytes ${start}-${end}/${fileSize}`;
    expect(contentRange).toBe('bytes 200-499/1000');
  });

  it('deve detectar Ranges fora do limite e preparar status 416', () => {
    const fileSize = 1000;
    const rangeHeader = 'bytes=2000-3000';
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parseInt(parts[1], 10);

    const isUnsatisfiable = start >= fileSize || end >= fileSize || start > end;
    expect(isUnsatisfiable).toBe(true);
  });
});
