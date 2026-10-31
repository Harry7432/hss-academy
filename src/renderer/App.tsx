import React, { useEffect, useState, useCallback } from 'react';
import { Course, CourseDetail, ContinueLessonInfo } from '../shared/types';
import { HomePage } from './components/HomePage';
import { PlayerPage } from './components/PlayerPage';
import { Toast, ToastMessage } from './components/Toast';

export const App: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [continueLesson, setContinueLesson] = useState<ContinueLessonInfo | null>(null);
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<CourseDetail | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | undefined>(undefined);
  const [view, setView] = useState<'home' | 'player'>('home');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Carrega cursos e última aula assistida
  const loadData = useCallback(async () => {
    try {
      if (!window.hssApi) return;
      const [allCourses, contLesson] = await Promise.all([
        window.hssApi.getCourses(),
        window.hssApi.getContinueLesson()
      ]);
      setCourses(allCourses);
      setContinueLesson(contLesson);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      addToast('error', 'Erro ao carregar lista de cursos');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Adicionar novo curso
  const handleAddCourse = async () => {
    try {
      const folderPath = await window.hssApi.selectCourseFolder();
      if (!folderPath) return;

      setIsLoading(true);
      const detail = await window.hssApi.addCourse(folderPath);
      await loadData();
      addToast('success', `Curso "${detail.course.title}" adicionado com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao adicionar curso:', err);
      addToast('error', err?.message || 'Falha ao adicionar curso');
    } finally {
      setIsLoading(false);
    }
  };

  // Abrir tela do curso / player
  const handleOpenCourse = async (courseId: string, lessonId?: string) => {
    try {
      setIsLoading(true);
      const detail = await window.hssApi.getCourseDetail(courseId);
      if (!detail) {
        addToast('error', 'Curso não encontrado');
        return;
      }
      setSelectedCourseDetail(detail);
      setActiveLessonId(lessonId || detail.course.lastLessonId);
      setView('player');
    } catch (err: any) {
      console.error('Erro ao abrir curso:', err);
      addToast('error', 'Falha ao carregar detalhes do curso');
    } finally {
      setIsLoading(false);
    }
  };

  // Atualizar aulas de um curso (varredura + reconciliação)
  const handleUpdateCourse = async (courseId: string) => {
    try {
      const { detail, summary } = await window.hssApi.updateCourse(courseId);
      if (selectedCourseDetail && selectedCourseDetail.course.id === courseId) {
        setSelectedCourseDetail(detail);
      }
      await loadData();

      const msgs: string[] = [];
      if (summary.added > 0) msgs.push(`+${summary.added} novas aulas`);
      if (summary.restored > 0) msgs.push(`${summary.restored} restauradas`);
      if (summary.missing > 0) msgs.push(`${summary.missing} arquivos não encontrados`);

      const summaryText = msgs.length > 0 ? msgs.join(', ') : 'Nenhuma alteração encontrada';
      addToast('info', `Aulas atualizadas: ${summaryText}`);
    } catch (err: any) {
      console.error('Erro ao atualizar aulas:', err);
      addToast('error', 'Falha ao atualizar aulas');
    }
  };

  // Alterar pasta do curso
  const handleChangeFolder = async (courseId: string) => {
    try {
      const newFolderPath = await window.hssApi.selectCourseFolder();
      if (!newFolderPath) return;

      setIsLoading(true);
      const detail = await window.hssApi.changeCourseFolder(courseId, newFolderPath);
      if (selectedCourseDetail && selectedCourseDetail.course.id === courseId) {
        setSelectedCourseDetail(detail);
      }
      await loadData();
      addToast('success', `Pasta do curso atualizada para ${newFolderPath}`);
    } catch (err: any) {
      console.error('Erro ao alterar pasta:', err);
      addToast('error', err?.message || 'Falha ao alterar pasta');
    } finally {
      setIsLoading(false);
    }
  };

  // Remover curso do app
  const handleRemoveCourse = async (courseId: string) => {
    const confirm = window.confirm('Tem certeza que deseja remover este curso do aplicativo? Seus arquivos de vídeo não serão apagados do computador.');
    if (!confirm) return;

    try {
      await window.hssApi.removeCourse(courseId);
      await loadData();
      addToast('info', 'Curso removido do aplicativo');
    } catch (err) {
      addToast('error', 'Falha ao remover curso');
    }
  };

  // Salvar progresso de aula
  const handleSaveProgress = async (
    lessonId: string,
    positionSeconds: number,
    durationSeconds: number,
    completed?: boolean
  ) => {
    try {
      const ok = await window.hssApi.saveLessonProgress(lessonId, positionSeconds, durationSeconds, completed);
      if (!ok) {
        addToast('error', 'Falha ao salvar progresso da aula');
        return;
      }
      // Atualiza estado local no selectedCourseDetail para reatividade imediata
      if (selectedCourseDetail) {
        setSelectedCourseDetail((prev) => {
          if (!prev) return prev;
          let changed = false;
          const newModules = prev.modules.map((m) => {
            const newLessons = m.lessons.map((l) => {
              if (l.id === lessonId) {
                changed = true;
                return {
                  ...l,
                  positionSeconds,
                  durationSeconds: durationSeconds > 0 ? durationSeconds : l.durationSeconds,
                  completed: typeof completed === 'boolean' ? completed : l.completed
                };
              }
              return l;
            });
            const comp = newLessons.filter((l) => l.available && l.completed).length;
            const avail = newLessons.filter((l) => l.available).length;
            return {
              ...m,
              lessons: newLessons,
              completedCount: comp,
              progressPercent: avail > 0 ? Math.round((comp / avail) * 100) : 0
            };
          });

          if (!changed) return prev;

          const totalAvail = newModules.reduce((acc, m) => acc + m.totalCount, 0);
          const totalComp = newModules.reduce((acc, m) => acc + m.completedCount, 0);

          return {
            ...prev,
            course: {
              ...prev.course,
              totalLessons: totalAvail,
              completedLessons: totalComp,
              progressPercent: totalAvail > 0 ? Math.round((totalComp / totalAvail) * 100) : 0,
              lastLessonId: lessonId
            },
            modules: newModules
          };
        });
      }
    } catch (err) {
      console.warn('Erro ao salvar progresso:', err);
      addToast('error', 'Falha ao salvar o progresso da aula');
    }
  };

  // Alternar conclusão de aula (ação manual)
  const handleToggleCompleted = async (lessonId: string, completed?: boolean) => {
    try {
      const result = await window.hssApi.toggleLessonCompleted(lessonId, completed);
      if (selectedCourseDetail) {
        setSelectedCourseDetail((prev) => {
          if (!prev) return prev;
          const newModules = prev.modules.map((m) => {
            const newLessons = m.lessons.map((l) => (l.id === lessonId ? result.lesson : l));
            const comp = newLessons.filter((l) => l.available && l.completed).length;
            const avail = newLessons.filter((l) => l.available).length;
            return {
              ...m,
              lessons: newLessons,
              completedCount: comp,
              progressPercent: avail > 0 ? Math.round((comp / avail) * 100) : 0
            };
          });
          const totalAvail = newModules.reduce((acc, m) => acc + m.totalCount, 0);
          const totalComp = newModules.reduce((acc, m) => acc + m.completedCount, 0);
          return {
            ...prev,
            course: {
              ...prev.course,
              totalLessons: totalAvail,
              completedLessons: totalComp,
              progressPercent: totalAvail > 0 ? Math.round((totalComp / totalAvail) * 100) : 0
            },
            modules: newModules
          };
        });
      }
      addToast('success', result.lesson.completed ? 'Aula marcada como concluída' : 'Aula desmarcada');
    } catch (err) {
      console.error('Erro ao alternar conclusão:', err);
      addToast('error', 'Falha ao atualizar status da aula');
    }
  };

  // Abrir no player nativo do Windows
  const handleOpenExternal = async (lessonId: string) => {
    try {
      const ok = await window.hssApi.openExternalPlayer(lessonId);
      if (!ok) {
        addToast('error', 'Não foi possível abrir o arquivo no player do Windows');
      }
    } catch (err) {
      addToast('error', 'Erro ao abrir arquivo externamente');
    }
  };

  return (
    <div className="app-container">
      {view === 'home' || !selectedCourseDetail ? (
        <HomePage
          courses={courses}
          continueLesson={continueLesson}
          onAddCourse={handleAddCourse}
          onOpenCourse={handleOpenCourse}
          onUpdateCourse={handleUpdateCourse}
          onChangeFolder={handleChangeFolder}
          onRemoveCourse={handleRemoveCourse}
          isLoading={isLoading}
        />
      ) : (
        <PlayerPage
          courseDetail={selectedCourseDetail}
          initialLessonId={activeLessonId}
          onBack={() => {
            setView('home');
            loadData();
          }}
          onUpdateCourse={() => handleUpdateCourse(selectedCourseDetail.course.id)}
          onChangeFolder={() => handleChangeFolder(selectedCourseDetail.course.id)}
          onSaveProgress={handleSaveProgress}
          onToggleCompleted={handleToggleCompleted}
          onOpenExternal={handleOpenExternal}
        />
      )}

      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
