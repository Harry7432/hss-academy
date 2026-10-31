import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Play,
  RotateCw,
  FolderSync,
  AlertCircle,
  Clock,
  Layers
} from 'lucide-react';
import { CourseDetail, Lesson } from '../../shared/types';
import { VideoPlayer } from './VideoPlayer';
import { formatSeconds } from '../utils/format';

interface PlayerPageProps {
  courseDetail: CourseDetail;
  initialLessonId?: string;
  onBack: () => void;
  onUpdateCourse: () => Promise<void>;
  onChangeFolder: () => void;
  onSaveProgress: (lessonId: string, position: number, duration: number, completed?: boolean) => void;
  onToggleCompleted: (lessonId: string, completed?: boolean) => void;
  onOpenExternal: (lessonId: string) => void;
}

export const PlayerPage: React.FC<PlayerPageProps> = ({
  courseDetail,
  initialLessonId,
  onBack,
  onUpdateCourse,
  onChangeFolder,
  onSaveProgress,
  onToggleCompleted,
  onOpenExternal
}) => {
  // Lista linear de todas as aulas em ordem para navegação sequencial
  const allLessons = useMemo(() => {
    const list: Lesson[] = [];
    for (const mod of courseDetail.modules) {
      list.push(...mod.lessons);
    }
    return list;
  }, [courseDetail]);

  // Aula selecionada atualmente
  const [selectedLessonId, setSelectedLessonId] = useState<string>(() => {
    if (initialLessonId && allLessons.some((l) => l.id === initialLessonId)) {
      return initialLessonId;
    }
    if (courseDetail.course.lastLessonId && allLessons.some((l) => l.id === courseDetail.course.lastLessonId)) {
      return courseDetail.course.lastLessonId;
    }
    const firstAvailable = allLessons.find((l) => l.available);
    return firstAvailable ? firstAvailable.id : allLessons[0]?.id || '';
  });

  // Módulos abertos/colapsados (por padrão todos abertos)
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const toggleModule = (moduleName: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName]
    }));
  };

  const currentLesson = useMemo(() => {
    return allLessons.find((l) => l.id === selectedLessonId) || allLessons[0];
  }, [allLessons, selectedLessonId]);

  const currentIndex = useMemo(() => {
    return allLessons.findIndex((l) => l.id === selectedLessonId);
  }, [allLessons, selectedLessonId]);

  const hasNextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1;

  const handleNextLesson = () => {
    if (hasNextLesson) {
      setSelectedLessonId(allLessons[currentIndex + 1].id);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdateCourse();
    } finally {
      setIsUpdating(false);
    }
  };

  const videoUrl = currentLesson ? `hss-media://lesson/${encodeURIComponent(currentLesson.id)}` : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Bar Fixa */}
      <header
        style={{
          height: '60px',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
          <button onClick={onBack} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>

          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {courseDetail.course.title}
            </h2>
            {currentLesson && (
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {currentLesson.moduleName} • {currentLesson.title}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Progresso do curso */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '80px' }}>
              <div className="progress-bar-bg" style={{ height: '5px' }}>
                <div
                  className="progress-bar-fill"
                  style={{ width: `${courseDetail.course.progressPercent}%` }}
                />
              </div>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {courseDetail.course.progressPercent}%
            </span>
          </div>

          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="btn btn-secondary"
            title="Atualizar aulas (nova varredura no disco)"
          >
            <RotateCw size={15} className={isUpdating ? 'animate-spin' : ''} />
            <span>Atualizar aulas</span>
          </button>

          <button
            onClick={onChangeFolder}
            className="btn btn-secondary"
            title="Alterar pasta da raiz do curso"
          >
            <FolderSync size={15} />
            <span>Alterar pasta</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal: Sidebar + Player */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar de Módulos e Aulas */}
        <aside
          style={{
            width: '360px',
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-surface)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="var(--accent-primary)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
                Conteúdo do Curso
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {courseDetail.course.completedLessons}/{courseDetail.course.totalLessons} aulas
            </span>
          </div>

          {/* Acordeão de Módulos */}
          <div style={{ flex: 1 }}>
            {courseDetail.modules.map((module) => {
              const isCollapsed = collapsedModules[module.name];

              return (
                <div key={module.name} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {/* Cabeçalho do Módulo */}
                  <div
                    onClick={() => toggleModule(module.name)}
                    style={{
                      padding: '12px 18px',
                      backgroundColor: 'rgba(30, 41, 59, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {module.name}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                      {module.completedCount}/{module.totalCount}
                    </span>
                  </div>

                  {/* Lista de Aulas do Módulo */}
                  {!isCollapsed && (
                    <div>
                      {module.lessons.map((lesson) => {
                        const isSelected = lesson.id === selectedLessonId;

                        return (
                          <div
                            key={lesson.id}
                            onClick={() => setSelectedLessonId(lesson.id)}
                            style={{
                              padding: '10px 16px 10px 32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: isSelected
                                ? 'rgba(59, 130, 246, 0.15)'
                                : 'transparent',
                              borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                              {/* Ícone de status */}
                              {!lesson.available ? (
                                <span title="Arquivo não encontrado" style={{ display: 'flex' }}>
                                  <AlertCircle size={15} color="#f59e0b" />
                                </span>
                              ) : lesson.completed ? (
                                <CheckCircle2 size={15} color="#10b981" />
                              ) : isSelected ? (
                                <Play size={15} fill="#3b82f6" color="#3b82f6" />
                              ) : (
                                <Circle size={15} color="#64748b" />
                              )}

                              <div style={{ minWidth: 0 }}>
                                <p
                                  style={{
                                    fontSize: '0.8rem',
                                    fontWeight: isSelected ? 600 : 400,
                                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                >
                                  {lesson.title}
                                </p>

                                {!lesson.available && (
                                  <span style={{ fontSize: '0.7rem', color: '#f59e0b' }}>
                                    Arquivo não encontrado
                                  </span>
                                )}
                              </div>
                            </div>

                            {lesson.positionSeconds > 0 && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.7rem',
                                  color: 'var(--text-muted)',
                                  marginLeft: '8px'
                                }}
                              >
                                <Clock size={11} />
                                <span>{formatSeconds(lesson.positionSeconds)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Player de Vídeo */}
        <main style={{ flex: 1, minWidth: 0, height: '100%', backgroundColor: '#000000' }}>
          {currentLesson ? (
            <VideoPlayer
              lesson={currentLesson}
              videoUrl={videoUrl}
              onSaveProgress={onSaveProgress}
              onToggleCompleted={onToggleCompleted}
              onNextLesson={handleNextLesson}
              hasNextLesson={hasNextLesson}
              onOpenExternal={onOpenExternal}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-secondary)'
              }}
            >
              Nenhuma aula disponível neste curso.
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
