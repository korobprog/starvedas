"use client";

import { useEffect, useRef } from "react";
import type { SiteService, SiteServiceOption } from "@/lib/site-data";

/**
 * Кадры эффектов нарисованы в Arcaidia Effector и выгружены в спрайт-атласы
 * (public/fx). Атлас = кадры цикла плюс «хвост»: первые кадры цикла
 * смешиваются с хвостом, поэтому склейка не заметна.
 */
type AtlasConfig = {
  src: string;
  cols: number;
  cellWidth: number;
  cellHeight: number;
  loopFrames: number;
  blendFrames: number;
  fps: number;
};

const diyaAtlas: AtlasConfig = {
  src: "/fx/diya-atlas.png",
  cols: 6,
  cellWidth: 96,
  cellHeight: 144,
  loopFrames: 24,
  blendFrames: 6,
  fps: 12
};

const petalsAtlas: AtlasConfig = {
  src: "/fx/petals-atlas.png",
  cols: 10,
  cellWidth: 320,
  cellHeight: 320,
  loopFrames: 48,
  blendFrames: 12,
  fps: 12
};

function createPlayer(config: AtlasConfig, onReady?: () => void) {
  const image = new Image();
  let ready = false;

  image.onload = () => {
    ready = true;
    // Первый кадр рисуем сразу: в фоновой вкладке кадры анимации почти
    // не приходят, и канва иначе осталась бы пустой.
    onReady?.();
  };
  image.src = config.src;

  function drawFrame(
    context: CanvasRenderingContext2D,
    frame: number,
    alpha: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ) {
    if (alpha <= 0) {
      return;
    }

    context.globalAlpha = alpha;
    context.drawImage(
      image,
      (frame % config.cols) * config.cellWidth,
      Math.floor(frame / config.cols) * config.cellHeight,
      config.cellWidth,
      config.cellHeight,
      dx,
      dy,
      dw,
      dh
    );
  }

  return function draw(
    context: CanvasRenderingContext2D,
    time: number,
    offset: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ) {
    if (!ready) {
      return;
    }

    const { loopFrames, blendFrames, fps } = config;
    const frame = (Math.floor(time * fps) + offset) % loopFrames;

    if (frame < blendFrames) {
      const mix = frame / blendFrames;

      drawFrame(context, frame + loopFrames, 1 - mix, dx, dy, dw, dh);
      drawFrame(context, frame, mix, dx, dy, dw, dh);
    } else {
      drawFrame(context, frame, 1, dx, dy, dw, dh);
    }

    context.globalAlpha = 1;
  };
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function DiyaFlame({
  className,
  lit = true
}: {
  className?: string;
  lit?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!lit) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    let frameId = 0;
    const draw = createPlayer(diyaAtlas, () => render(performance.now()));

    function render(now: number) {
      context!.clearRect(0, 0, canvas!.width, canvas!.height);
      draw(context!, now / 1000, 0, 0, 0, canvas!.width, canvas!.height);

      if (!prefersReducedMotion()) {
        frameId = requestAnimationFrame(render);
      }
    }

    if (prefersReducedMotion()) {
      const timers = [400, 1500].map((delay) =>
        window.setTimeout(() => render(2000), delay)
      );

      return () => timers.forEach((timer) => window.clearTimeout(timer));
    }

    frameId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(frameId);
  }, [lit]);

  return (
    <span
      aria-hidden="true"
      className={`${className ?? "diya"}${lit ? "" : " diya--unlit"}`}
    >
      {lit && (
        <canvas
          className="diya__flame"
          height={144}
          ref={canvasRef}
          width={96}
        />
      )}
      <svg className="diya__bowl" viewBox="4 16 24 14">
        <path d="M4 18h24c0 5-5.4 9-12 9S4 23 4 18z" />
        <rect height="2.4" rx="1.2" width="10" x="11" y="27" />
      </svg>
    </span>
  );
}

export function PetalsBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    const tile = 380;
    let frameId = 0;
    const draw = createPlayer(petalsAtlas, () => render(performance.now()));

    function resize() {
      const ratio = Math.min(2, window.devicePixelRatio || 1);

      canvas!.width = Math.max(1, Math.round(canvas!.clientWidth * ratio));
      canvas!.height = Math.max(1, Math.round(canvas!.clientHeight * ratio));
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function render(now: number) {
      const width = canvas!.clientWidth;
      const height = canvas!.clientHeight;

      context!.clearRect(0, 0, width, height);

      const columns = Math.ceil(width / tile);
      const rows = Math.ceil(height / tile);

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const flipped = (column + row) % 2 === 1;
          const offset = (column * 17 + row * 29) % petalsAtlas.loopFrames;

          context!.save();

          if (flipped) {
            context!.translate(column * tile * 2 + tile, 0);
            context!.scale(-1, 1);
          }

          draw(
            context!,
            now / 1000,
            offset,
            column * tile,
            row * tile,
            tile,
            tile
          );
          context!.restore();
        }
      }

      if (!prefersReducedMotion()) {
        frameId = requestAnimationFrame(render);
      }
    }

    resize();

    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => resize())
        : null;

    observer?.observe(canvas);

    if (prefersReducedMotion()) {
      const timers = [400, 1500].map((delay) =>
        window.setTimeout(() => render(2000), delay)
      );

      return () => {
        observer?.disconnect();
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    frameId = requestAnimationFrame(render);

    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas aria-hidden="true" className="petals" ref={canvasRef} />;
}

function formatDayParts(value: string | null) {
  if (!value) {
    return { date: "", weekday: "" };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { date: "", weekday: "" };
  }

  return {
    date: new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "Europe/Moscow"
    }).format(date),
    weekday: new Intl.DateTimeFormat("ru-RU", {
      weekday: "short",
      timeZone: "Europe/Moscow"
    }).format(date)
  };
}

/** Карточка дня шраддхи: лампадка зажигается у выбранного дня. */
export function PitriDayCard({
  checked,
  onToggle,
  option,
  phase
}: {
  checked: boolean;
  onToggle: () => void;
  option: SiteServiceOption;
  /** 0 — полнолуние в начале периода, 1 — новолуние в конце. */
  phase: number;
}) {
  const { date, weekday } = formatDayParts(option.eventStartsAt);

  return (
    <label className="rite-day-card">
      <input checked={checked} onChange={onToggle} type="checkbox" />
      <DiyaFlame className="diya diya--day" lit={checked} />
      <span
        aria-hidden="true"
        className="moon"
        style={{ "--k": phase.toFixed(3) } as React.CSSProperties}
      />
      <span className="rite-day-card__text">
        <span className="rite-day-card__date">
          {date || option.eventStartsAtLabel}
          {weekday && <small>{weekday}</small>}
        </span>
        <span className="rite-day-card__title">{option.title}</span>
        <small className="rite-day-card__price">{option.priceLabel}</small>
      </span>
    </label>
  );
}

function formatDayLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Moscow"
  }).format(date);
}

/**
 * Полоса модуля над карточками: огонёк лампады, период и фазы луны
 * по дням расписания — от полнолуния к новолунию, как идёт Питри Пакша.
 */
export function PitriPakshaBand({
  services
}: {
  services: readonly SiteService[];
}) {
  if (services.length === 0) {
    return null;
  }

  const dayDates = services
    .flatMap((service) => service.options)
    .map((option) => option.eventStartsAt)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => a.localeCompare(b));

  const subscription = services.find((service) => service.isSubscription);
  const periodStart =
    subscription?.subscriptionStartsAtLabel ||
    (dayDates.length > 0 ? formatDayLabel(dayDates[0]) : "");
  const periodEnd =
    subscription?.subscriptionEndsAtLabel ||
    (dayDates.length > 0 ? formatDayLabel(dayDates[dayDates.length - 1]) : "");

  return (
    <div className="pitri-band">
      <PetalsBackdrop />
      <div className="pitri-band__head">
        <DiyaFlame />
        <div>
          <h3 className="pitri-band__title">Питри Пакша</h3>
          <p className="pitri-band__note">
            Время почитания предков и всех ушедших
            {periodStart && periodEnd ? ` · ${periodStart} — ${periodEnd}` : ""}
          </p>
          {dayDates.length > 1 && (
            <div aria-hidden="true" className="pitri-band__phases">
              {dayDates.map((date, index) => (
                <span
                  className="moon"
                  key={date}
                  style={
                    {
                      "--k": (index / (dayDates.length - 1)).toFixed(3)
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
