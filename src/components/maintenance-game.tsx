"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ButterDrop = {
  id: number;
  left: number;
  top: number;
  speed: number;
};

const fieldHeight = 100;
const basketWidth = 20;
const catchLine = 82;
const maxMissed = 5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createDrop(id: number): ButterDrop {
  return {
    id,
    left: 10 + ((id * 23) % 80),
    speed: 2.4 + (id % 4) * 0.35,
    top: -12
  };
}

export function MaintenanceGame() {
  const [basketLeft, setBasketLeft] = useState(50);
  const [drops, setDrops] = useState<ButterDrop[]>(() => [createDrop(1)]);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const nextDropId = useRef(2);

  const isGameOver = missed >= maxMissed;
  const message = useMemo(() => {
    if (isGameOver) {
      return "Кришна немного испачкался маслом. Начните заново и поймайте больше горшочков.";
    }

    if (score >= 12) {
      return "Отлично! Кришна доволен — вы поймали много масла.";
    }

    return "Двигайте корзинку мышкой или пальцем и ловите падающее масло.";
  }, [isGameOver, score]);

  useEffect(() => {
    if (isGameOver) {
      return;
    }

    const timer = window.setInterval(() => {
      setDrops((currentDrops) => {
        const nextDrops: ButterDrop[] = [];
        let caught = 0;
        let missedDrops = 0;

        for (const drop of currentDrops) {
          const nextTop = drop.top + drop.speed;
          const isAtCatchLine = nextTop >= catchLine && nextTop <= catchLine + 9;
          const isInsideBasket =
            drop.left >= basketLeft - basketWidth / 2 &&
            drop.left <= basketLeft + basketWidth / 2;

          if (isAtCatchLine && isInsideBasket) {
            caught += 1;
            continue;
          }

          if (nextTop > fieldHeight + 8) {
            missedDrops += 1;
            continue;
          }

          nextDrops.push({ ...drop, top: nextTop });
        }

        if (caught) {
          setScore((value) => value + caught);
        }

        if (missedDrops) {
          setMissed((value) => Math.min(maxMissed, value + missedDrops));
        }

        if (nextDrops.length < 3) {
          nextDrops.push(createDrop(nextDropId.current));
          nextDropId.current += 1;
        }

        return nextDrops;
      });
    }, 90);

    return () => window.clearInterval(timer);
  }, [basketLeft, isGameOver]);

  function moveBasket(clientX: number, currentTarget: HTMLElement) {
    const rect = currentTarget.getBoundingClientRect();
    const nextLeft = ((clientX - rect.left) / rect.width) * 100;

    setBasketLeft(clamp(nextLeft, basketWidth / 2, 100 - basketWidth / 2));
  }

  function restartGame() {
    nextDropId.current = 2;
    setBasketLeft(50);
    setDrops([createDrop(1)]);
    setMissed(0);
    setScore(0);
  }

  return (
    <section
      className="maintenance-game"
      aria-labelledby="maintenance-game-title"
    >
      <div className="maintenance-game__header">
        <div>
          <p className="eyebrow">Мини-игра</p>
          <h2 id="maintenance-game-title">Кришна ловит масло</h2>
        </div>
        <span className="maintenance-game__score">
          {score} поймано · {maxMissed - missed} попыток
        </span>
      </div>

      <div
        className="maintenance-game__field maintenance-game__field--butter"
        onMouseMove={(event) => moveBasket(event.clientX, event.currentTarget)}
        onTouchMove={(event) => {
          const touch = event.touches[0];

          if (touch) {
            moveBasket(touch.clientX, event.currentTarget);
          }
        }}
        role="application"
        aria-label="Игра: поймайте падающее масло корзинкой"
      >
        <div className="maintenance-game__krishna" aria-hidden="true">
          🪈
        </div>

        {drops.map((drop) => (
          <span
            aria-hidden="true"
            className="maintenance-game__butter"
            key={drop.id}
            style={{
              left: `${drop.left}%`,
              top: `${drop.top}%`
            }}
          >
            🧈
          </span>
        ))}

        <div
          className="maintenance-game__basket"
          style={{ left: `${basketLeft}%` }}
          aria-hidden="true"
        >
          🧺
        </div>
      </div>

      <div className="maintenance-game__actions">
        <button
          className="button button--primary"
          onClick={restartGame}
          type="button"
        >
          Начать заново
        </button>
        <p>{message}</p>
      </div>
    </section>
  );
}
