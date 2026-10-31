import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  FileQuestion
} from 'lucide-react';
import { Lesson } from '../../shared/types';
import { formatSeconds } from '../utils/format';

interface VideoPlayerProps {
  lesson: Lesson;
  videoUrl: string;
  onSaveProgress: (lessonId: string, position: number, duration: number, completed?: boolean) => void;
  onToggleCompleted: (lessonId: string, completed?: boolean) => void;
  onNextLesson?: () => void;
  hasNextLesson: boolean;
  onOpenExternal: (lessonId: string) => void;
}

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  lesson,
  videoUrl,
  onSaveProgress,
  onToggleCompleted,
  onNextLesson,
  hasNextLesson,
  onOpenExternal
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(lesson.positionSeconds || 0);
  const [duration, setDuration] = useState<number>(lesson.durationSeconds || 0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);
  const [seekTime, setSeekTime] = useState<number>(lesson.positionSeconds || 0);

  // Referência para controlar o último save e evitar chamadas em excesso
  const lastSavedPosRef = useRef<number>(lesson.positionSeconds || 0);
  const initialSeekDoneRef = useRef<boolean>(false);

  // Reseta estado ao trocar de aula
  useEffect(() => {
    setIsPlaying(false);
    setHasError(false);
    setIsSeeking(false);
    initialSeekDoneRef.current = false;
    setCurrentTime(lesson.positionSeconds || 0);
    setSeekTime(lesson.positionSeconds || 0);
    setDuration(lesson.durationSeconds || 0);
    lastSavedPosRef.current = lesson.positionSeconds || 0;
  }, [lesson.id]);

  // Função para salvar progresso silenciosamente
  const triggerSave = useCallback(
    (pos: number, dur: number, forceCompleted?: boolean) => {
      if (dur <= 0 && pos <= 0) return;
      onSaveProgress(lesson.id, pos, dur, forceCompleted);
      lastSavedPosRef.current = pos;
    },
    [lesson.id, onSaveProgress]
  );

  // Intervalo de salvamento automático a cada 5 segundos quando reproduzindo
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (videoRef.current && !isSeeking) {
        const cur = videoRef.current.currentTime;
        const dur = videoRef.current.duration || duration;
        // Salva se mudou pelo menos 3 segundos desde o último save
        if (Math.abs(cur - lastSavedPosRef.current) >= 3) {
          triggerSave(cur, dur);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, duration, isSeeking, triggerSave]);

  // Salvar no descarregamento da página ou saída
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (videoRef.current) {
        triggerSave(videoRef.current.currentTime, videoRef.current.duration || duration);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [duration, triggerSave]);

  // Evento quando metadados são carregados -> retoma do ponto salvo
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    const vidDuration = video.duration || 0;
    setDuration(vidDuration);

    if (!initialSeekDoneRef.current && lesson.positionSeconds > 0) {
      // Recuo suave de 2 segundos para dar contexto
      const targetTime = Math.max(0, lesson.positionSeconds - 2);
      if (targetTime < vidDuration) {
        video.currentTime = targetTime;
        setCurrentTime(targetTime);
        setSeekTime(targetTime);
      }
      initialSeekDoneRef.current = true;
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    // Se o usuário estiver arrastando a barra de progresso, não sobrescreve
    if (!isSeeking) {
      setCurrentTime(video.currentTime);
      setSeekTime(video.currentTime);
    }

    // Marca como concluído automaticamente se >= 95% do vídeo
    if (!lesson.completed && video.duration > 0 && video.currentTime / video.duration >= 0.95) {
      triggerSave(video.currentTime, video.duration, true);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch((err) => {
        console.warn('Erro ao reproduzir vídeo:', err);
      });
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
      triggerSave(video.currentTime, video.duration || duration);
    }
  };

  const applySeek = (newTime: number) => {
    const video = videoRef.current;
    if (!video) return;

    const clampedTime = Math.max(0, Math.min(video.duration || duration || 0, newTime));
    video.currentTime = clampedTime;
    setCurrentTime(clampedTime);
    setSeekTime(clampedTime);
    triggerSave(clampedTime, video.duration || duration);
  };

  const handleSeekPointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    setIsSeeking(true);
    const targetVal = parseFloat((e.target as HTMLInputElement).value);
    setSeekTime(targetVal);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetVal = parseFloat(e.target.value);
    setSeekTime(targetVal);
    // Se não estiver em modo pointer-down ativo (ex: clique direto com teclado/acessibilidade)
    if (!isSeeking) {
      applySeek(targetVal);
    }
  };

  const handleSeekPointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
    const targetVal = parseFloat((e.target as HTMLInputElement).value);
    setIsSeeking(false);
    applySeek(targetVal);
  };

  const skipSeconds = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const current = isSeeking ? seekTime : video.currentTime;
    const target = Math.max(0, Math.min(video.duration || duration || 0, current + seconds));
    applySeek(target);
  };

  const changeSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(false);
    }
  };

  // Atalhos de teclado no player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se estiver digitando em input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipSeconds(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipSeconds(5);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#000000',
        position: 'relative'
      }}
    >
      {/* Área do Vídeo */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {!lesson.available ? (
          /* Aviso quando arquivo não está no disco */
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#111827',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '520px',
              border: '1px solid #374151'
            }}
          >
            <FileQuestion size={48} color="#f59e0b" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
              Arquivo não encontrado no disco
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', lineHeight: 1.5, marginBottom: '20px' }}>
              O arquivo <code>{lesson.relativePath}</code> não foi localizado na pasta do curso.
              Seu histórico e progresso continuam preservados. Caso o disco tenha sido desconectado ou o arquivo renomeado, clique em <strong>Atualizar aulas</strong>.
            </p>
          </div>
        ) : hasError ? (
          /* Erro de decodificação de vídeo / codec */
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#111827',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '520px',
              border: '1px solid #374151'
            }}
          >
            <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
              Codec ou formato incompatível
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', lineHeight: 1.5, marginBottom: '20px' }}>
              O player interno do navegador não suporta este codec de áudio/vídeo nativamente.
              Você pode abrir e assistir normalmente no player padrão do Windows.
            </p>
            <button
              onClick={() => onOpenExternal(lesson.id)}
              className="btn btn-primary"
              style={{ margin: '0 auto' }}
            >
              <ExternalLink size={16} />
              <span>Abrir no player padrão do Windows</span>
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            onClick={togglePlay}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => {
              setIsPlaying(false);
              if (videoRef.current) {
                triggerSave(videoRef.current.currentTime, videoRef.current.duration || duration);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              triggerSave(duration, duration, true);
              if (hasNextLesson && onNextLesson) {
                onNextLesson();
              }
            }}
            onError={() => {
              setHasError(true);
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              cursor: 'pointer'
            }}
          />
        )}
      </div>

      {/* Barra de Controles */}
      {lesson.available && !hasError && (
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderTop: '1px solid #1e293b',
            padding: '12px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {/* Barra de Progresso / Seek */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: '45px', textAlign: 'right' }}>
              {formatSeconds(isSeeking ? seekTime : currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={isSeeking ? seekTime : currentTime}
              onPointerDown={handleSeekPointerDown}
              onChange={handleSeekChange}
              onPointerUp={handleSeekPointerUp}
              style={{
                flex: 1,
                cursor: 'pointer',
                accentColor: '#3b82f6',
                height: '5px'
              }}
            />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: '45px' }}>
              {formatSeconds(duration)}
            </span>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Esquerda: Play, Voltar 5s, Avançar 5s, Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={togglePlay}
                className="btn btn-primary"
                style={{ width: '38px', height: '38px', borderRadius: '50%', padding: 0 }}
                title={isPlaying ? 'Pausar (Espaço)' : 'Reproduzir (Espaço)'}
              >
                {isPlaying ? <Pause size={18} fill="#ffffff" /> : <Play size={18} fill="#ffffff" />}
              </button>

              <button
                onClick={() => skipSeconds(-5)}
                className="btn btn-ghost"
                title="Voltar 5 segundos (Seta Esquerda)"
              >
                <RotateCcw size={16} />
              </button>

              <button
                onClick={() => skipSeconds(5)}
                className="btn btn-ghost"
                title="Avançar 5 segundos (Seta Direita)"
              >
                <RotateCw size={16} />
              </button>

              {/* Volume */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
                <button onClick={toggleMute} className="btn btn-ghost" title="Silenciar (M)">
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  style={{ width: '70px', accentColor: '#3b82f6', cursor: 'pointer', height: '4px' }}
                />
              </div>
            </div>

            {/* Direita: Conclusão, Velocidade, Próxima Aula, Tela Cheia */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Marcar / Desmarcar como concluída */}
              <button
                onClick={() => onToggleCompleted(lesson.id, !lesson.completed)}
                className={`btn ${lesson.completed ? 'btn-success' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                <CheckCircle2 size={16} />
                <span>{lesson.completed ? 'Concluída' : 'Marcar como concluída'}</span>
              </button>

              {/* Seletor de Velocidade */}
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 'var(--radius-sm)' }}>
                {PLAYBACK_SPEEDS.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => changeSpeed(speed)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      fontWeight: playbackSpeed === speed ? 700 : 400,
                      color: playbackSpeed === speed ? '#3b82f6' : '#94a3b8',
                      backgroundColor: playbackSpeed === speed ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              {/* Botão Próxima Aula */}
              {hasNextLesson && onNextLesson && (
                <button
                  onClick={onNextLesson}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  <span>Próxima aula</span>
                </button>
              )}

              {/* Player Externo */}
              <button
                onClick={() => onOpenExternal(lesson.id)}
                className="btn btn-ghost"
                title="Abrir no player padrão do Windows"
              >
                <ExternalLink size={16} />
              </button>

              {/* Tela Cheia */}
              <button onClick={toggleFullscreen} className="btn btn-ghost" title="Tela Cheia (F)">
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
