import { useCallback, useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useAuth } from "@/hooks/useAuth";

function buildSteps(isDeveloper: boolean) {
  const common = [
    {
      element: '[data-tour="nav-notificacoes"]',
      popover: {
        title: "Notificações",
        description: "Você recebe um aviso quando algo importante acontece nas suas solicitações.",
      },
    },
    {
      element: '[data-tour="nav-ajuda"]',
      popover: {
        title: "Central de ajuda",
        description: "Dúvidas sobre como usar o app? Tudo está na página de ajuda.",
      },
    },
    {
      element: '[data-tour="nav-tour"]',
      popover: {
        title: "Refazer o tour",
        description: "Clique na bússola sempre que quiser revisitar este tour.",
      },
    },
  ];

  if (isDeveloper) {
    return [
      {
        element: '[data-tour="nav-dashboard"]',
        popover: {
          title: "Dashboard de priorização",
          description: "Visão geral das demandas, ordenadas por score.",
        },
      },
      {
        element: '[data-tour="nav-solicitacoes"]',
        popover: {
          title: "Solicitações",
          description: "Lista, Kanban e Gantt das demandas cadastradas pelos solicitantes.",
        },
      },
      {
        element: '[data-tour="nav-solucoes"]',
        popover: {
          title: "Soluções",
          description: "Catálogo das soluções que você cria a partir das solicitações.",
        },
      },
      ...common,
    ];
  }
  return [
    {
      element: '[data-tour="nav-dashboard"]',
      popover: {
        title: "Seu dashboard",
        description: "Acompanhe rapidamente o andamento das suas solicitações.",
      },
    },
    {
      element: '[data-tour="nav-solicitacoes"]',
      popover: {
        title: "Minhas Solicitações",
        description: "Veja o status detalhado de cada demanda que você cadastrou.",
      },
    },
    ...common,
  ];
}

export function useOnboardingTour() {
  const { user } = useAuth();
  const isDeveloper = user?.role === "developer" || !!user?.isAdministrador;

  const start = useCallback(() => {
    const steps = buildSteps(isDeveloper).filter((s) =>
      typeof document !== "undefined" ? !!document.querySelector(s.element) : true,
    );
    if (steps.length === 0) return;
    const d = driver({
      showProgress: true,
      allowClose: true,
      nextBtnText: "Próximo",
      prevBtnText: "Voltar",
      doneBtnText: "Concluir",
      steps,
    });
    d.drive();
  }, [isDeveloper]);

  return { start };
}

/**
 * Dispara o tour automaticamente UMA vez por usuário, após login.
 * Não interfere com login nem com a tela de escolher perfil.
 */
export function OnboardingTour() {
  const { user } = useAuth();
  const { start } = useOnboardingTour();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!user?.id || firedRef.current) return;
    const key = `onboarding:done:${user.id}`;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(key) === "1") return;
    firedRef.current = true;
    const handle = window.setTimeout(() => {
      try {
        start();
        window.localStorage.setItem(key, "1");
      } catch {
        /* noop */
      }
    }, 800);
    return () => window.clearTimeout(handle);
  }, [user?.id, start]);

  return null;
}

export default OnboardingTour;
