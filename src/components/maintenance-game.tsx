"use client";

import { useMemo, useState } from "react";

const symbols = ["ॐ", "अग्नि", "स्वाहा", "✦", "दीप", "यज्ञ"];

function clampEnergy(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function MaintenanceGame() {
  const [energy, setEnergy] = useState(28);
  const [score, setScore] = useState(0);
  const [activeSpark, setActiveSpark] = useState(0);

  const sparks = useMemo(
    () =>
      symbols.map((symbol, index) => ({
        delay: `${index * 0.28}s`,
        left: `${12 + index * 14}%`,
        symbol,
        top: `${18 + (index % 3) * 19}%`
      })),
    []
  );

  const isComplete = energy >= 100;

  function collectSpark(index: number) {
    setScore((value) => value + 1);
    setEnergy((value) => clampEnergy(value + 12));
    setActiveSpark((index + 1) % sparks.length);
  }

  function breatheFire() {
    setEnergy((value) => clampEnergy(value + 6));
  }

  return (
    <section
      className="maintenance-game"
      aria-labelledby="maintenance-game-title"
    >
      <div className="maintenance-game__header">
        <div>
          <p className="eyebrow">Мини-игра</p>
          <h2 id="maintenance-game-title">Зажги священный огонь</h2>
        </div>
        <span className="maintenance-game__score">{score} искр</span>
      </div>

      <div className="maintenance-game__field">
        <div
          className={`maintenance-game__flame ${
            isComplete ? "maintenance-game__flame--complete" : ""
          }`}
          style={{
            ["--flame-scale" as string]: (0.8 + energy / 350).toFixed(2)
          }}
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
        </div>

        {sparks.map((spark, index) => (
          <button
            aria-label={`Поймать искру ${spark.symbol}`}
            className={`maintenance-game__spark ${
              activeSpark === index ? "maintenance-game__spark--active" : ""
            }`}
            key={spark.symbol}
            onClick={() => collectSpark(index)}
            style={{
              animationDelay: spark.delay,
              left: spark.left,
              top: spark.top
            }}
            type="button"
          >
            {spark.symbol}
          </button>
        ))}
      </div>

      <div
        className="maintenance-game__meter"
        aria-label={`Энергия огня ${energy}%`}
      >
        <span style={{ width: `${energy}%` }} />
      </div>

      <div className="maintenance-game__actions">
        <button
          className="button button--primary"
          onClick={breatheFire}
          type="button"
        >
          Поддержать огонь
        </button>
        <p>
          {isComplete
            ? "Огонь поддержан. Скоро сайт вернётся."
            : "Нажимайте на искры и ведические символы, чтобы усилить огонь."}
        </p>
      </div>
    </section>
  );
}
