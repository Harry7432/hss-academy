import React, { useState } from 'react';
import {
  FolderPlus,
  Play,
  RotateCw,
  FolderSync,
  Trash2,
  BookOpen,
  CheckCircle,
  Folder,
  Clock,
  Sparkles
} from 'lucide-react';
import { Course, ContinueLessonInfo } from '../../shared/types';
import { formatSeconds } from '../utils/format';

interface HomePageProps {
  courses: Course[];
  continueLesson: ContinueLessonInfo | null;
  onAddCourse: () => void;
  onOpenCourse: (courseId: string, lessonId?: string) => void;
  onUpdateCourse: (courseId: string) => void;
  onChangeFolder: (courseId: string) => void;
  onRemoveCourse: (courseId: string) => void;
  isLoading: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({
  courses,
  continueLesson,
  onAddCourse,
  onOpenCourse,
  onUpdateCourse,
  onChangeFolder,
  onRemoveCourse,
  isLoading
}) => {
  const [updatingCourseId, setUpdatingCourseId] = useState<string | null>(null);

  const handleUpdate = async (courseId: string) => {
    setUpdatingCourseId(courseId);
    try {
      await onUpdateCourse(courseId);
    } finally {
      setUpdatingCourseId(null);
    }
  };

  return (
    <div style={{ padding: '36px 48px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '36px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
            }}
          >
            <BookOpen size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
              HSS Academy
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Seus cursos locais, organizados e sempre de onde você parou
            </p>
          </div>
        </div>

        <button
          onClick={onAddCourse}
          disabled={isLoading}
          className="btn btn-primary"
          style={{ padding: '10px 20px', fontSize: '0.95rem' }}
        >
          <FolderPlus size={18} />
          <span>Adicionar curso / Localizar pasta</span>
        </button>
      </header>

      {/* Card: Continuar Estudando */}
      {continueLesson && continueLesson.lesson && (
        <section style={{ marginBottom: '40px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '14px',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            <Sparkles size={16} color="#3b82f6" />
            <span>Continuar estudando</span>
          </div>

          <div
            style={{
              background: 'linear-gradient(145deg, #1e293b, #172033)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '24px'
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="badge badge-info">{continueLesson.course.title}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  • {continueLesson.lesson.moduleName}
                </span>
              </div>
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  marginBottom: '10px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {continueLesson.lesson.title}
              </h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={15} />
                  <span>
                    {formatSeconds(continueLesson.lesson.positionSeconds)} de{' '}
                    {formatSeconds(continueLesson.lesson.durationSeconds || 0)}
                  </span>
                </div>
                {continueLesson.lesson.completed && (
                  <span className="badge badge-success">Concluída</span>
                )}
              </div>

              {continueLesson.lesson.durationSeconds > 0 && (
                <div style={{ marginTop: '12px', maxWidth: '400px' }}>
                  <div className="progress-bar-bg" style={{ height: '4px' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          (continueLesson.lesson.positionSeconds / continueLesson.lesson.durationSeconds) * 100
                        )}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => onOpenCourse(continueLesson.course.id, continueLesson.lesson.id)}
              className="btn btn-primary"
              style={{
                padding: '12px 24px',
                fontSize: '1rem',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <Play size={18} fill="#ffffff" />
              <span>Continuar assistindo</span>
            </button>
          </div>
        </section>
      )}

      {/* Lista de Cursos */}
      <section>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}
        >
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#ffffff' }}>
            Meus Cursos ({courses.length})
          </h2>
        </div>

        {courses.length === 0 ? (
          /* Estado Vazio */
          <div
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '2px dashed var(--border-color)',
              maxWidth: '600px',
              margin: '30px auto'
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px'
              }}
            >
              <Folder size={32} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '8px', color: '#ffffff' }}>
              Nenhum curso cadastrado ainda
            </h3>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                marginBottom: '24px',
                maxWidth: '460px',
                margin: '0 auto 24px'
              }}
            >
              Selecione a pasta do seu computador onde suas videoaulas estão armazenadas. Suas subpastas serão
              reconhecidas como módulos e seus vídeos como aulas, de forma 100% offline.
            </p>
            <button onClick={onAddCourse} className="btn btn-primary" style={{ padding: '12px 24px' }}>
              <FolderPlus size={18} />
              <span>Adicionar primeiro curso</span>
            </button>
          </div>
        ) : (
          /* Grade de Cursos */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '20px'
            }}
          >
            {courses.map((course) => {
              const isUpdating = updatingCourseId === course.id;

              return (
                <div
                  key={course.id}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'border-color 0.2s ease, transform 0.2s ease'
                  }}
                >
                  <div>
                    {/* Título do Curso */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <h3
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          color: '#ffffff',
                          marginBottom: '6px',
                          lineHeight: 1.3
                        }}
                      >
                        {course.title}
                      </h3>
                      <span className="badge badge-info">{course.progressPercent}%</span>
                    </div>

                    {/* Caminho da pasta */}
                    <p
                      title={course.rootPath}
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginBottom: '16px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {course.rootPath}
                    </p>

                    {/* Progresso */}
                    <div style={{ marginBottom: '20px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          marginBottom: '6px'
                        }}
                      >
                        <span>
                          {course.completedLessons} de {course.totalLessons} aulas concluídas
                        </span>
                        {course.completedLessons === course.totalLessons && course.totalLessons > 0 && (
                          <span style={{ color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> Concluído
                          </span>
                        )}
                      </div>
                      <div className="progress-bar-bg">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${course.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ações do Curso */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '14px',
                      gap: '8px'
                    }}
                  >
                    <button
                      onClick={() => onOpenCourse(course.id)}
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                    >
                      <Play size={16} fill="#ffffff" />
                      <span>{course.progressPercent > 0 ? 'Continuar' : 'Abrir curso'}</span>
                    </button>

                    <button
                      onClick={() => handleUpdate(course.id)}
                      disabled={isUpdating}
                      title="Atualizar aulas (nova varredura)"
                      className="btn btn-secondary"
                      style={{ padding: '8px 10px' }}
                    >
                      <RotateCw size={16} className={isUpdating ? 'animate-spin' : ''} />
                    </button>

                    <button
                      onClick={() => onChangeFolder(course.id)}
                      title="Alterar pasta do curso"
                      className="btn btn-secondary"
                      style={{ padding: '8px 10px' }}
                    >
                      <FolderSync size={16} />
                    </button>

                    <button
                      onClick={() => onRemoveCourse(course.id)}
                      title="Remover curso do aplicativo"
                      className="btn btn-danger"
                      style={{ padding: '8px 10px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
