import { protocol } from 'electron';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { AppStorage } from './storage';

export const MEDIA_SCHEME = 'hss-media';

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.ts': 'video/mp2t'
};

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'video/mp4';
}

/**
 * Registra o scheme como privilegiado. Deve ser chamado antes do app.whenReady().
 */
export function registerMediaSchemePrivilege() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true,
        bypassCSP: true
      }
    }
  ]);
}

/**
 * Manipula requisições ao scheme hss-media://lesson/<lessonId>
 * Implementa suporte nativo a HTTP 206 (Partial Content) e Range requests,
 * garantindo compatibilidade total com o seek do HTML5 video no Chromium.
 */
export function setupMediaProtocol(storage: AppStorage) {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    try {
      const url = new URL(request.url);
      // Formato esperado: hss-media://lesson/{lessonId}
      const lessonId = url.hostname === 'lesson' ? url.pathname.replace(/^\//, '') : url.pathname.replace(/^\/lesson\//, '');

      if (!lessonId) {
        return new Response('Lesson ID ausente', { status: 400 });
      }

      const lesson = storage.getLessonById(lessonId);
      if (!lesson) {
        return new Response('Aula não encontrada', { status: 404 });
      }

      const course = storage.getCourseById(lesson.courseId);
      if (!course) {
        return new Response('Curso associado não encontrado', { status: 404 });
      }

      // Validação de segurança estrita contra Path Traversal
      const courseRoot = path.resolve(course.rootPath);
      const videoFullPath = path.resolve(courseRoot, lesson.relativePath);

      // O caminho DEVE começar estritamente com o diretório raiz do curso
      const relative = path.relative(courseRoot, videoFullPath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        return new Response('Acesso negado: fora do diretório do curso', { status: 403 });
      }

      if (!fs.existsSync(videoFullPath)) {
        return new Response('Arquivo de vídeo não encontrado no disco', { status: 404 });
      }

      const stat = fs.statSync(videoFullPath);
      const fileSize = stat.size;
      const mimeType = getMimeType(videoFullPath);
      const rangeHeader = request.headers.get('range');

      // Se houver cabeçalho Range (requisição para seek ou streaming por pedaços)
      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        let start = parseInt(parts[0], 10);
        let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (isNaN(start)) {
          // Ex: bytes=-500 (últimos 500 bytes)
          start = fileSize - end;
          end = fileSize - 1;
        }

        if (start >= fileSize || end >= fileSize || start > end) {
          return new Response(null, {
            status: 416,
            headers: {
              'Content-Range': `bytes */${fileSize}`
            }
          });
        }

        const chunkSize = end - start + 1;
        const nodeStream = fs.createReadStream(videoFullPath, { start, end });
        const webStream = Readable.toWeb(nodeStream) as unknown as BodyInit;

        return new Response(webStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(chunkSize),
            'Content-Type': mimeType
          }
        });
      }

      // Se não houver Range, responde com o arquivo completo e cabeçalho Accept-Ranges
      const nodeStream = fs.createReadStream(videoFullPath);
      const webStream = Readable.toWeb(nodeStream) as unknown as BodyInit;

      return new Response(webStream, {
        status: 200,
        headers: {
          'Content-Length': String(fileSize),
          'Accept-Ranges': 'bytes',
          'Content-Type': mimeType
        }
      });
    } catch (err) {
      console.error('Erro no protocolo hss-media:', err);
      return new Response('Erro interno ao carregar mídia', { status: 500 });
    }
  });
}
