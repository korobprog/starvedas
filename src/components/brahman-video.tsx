"use client";

import { useRef, useState } from "react";

export function BrahmanVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState("");

  async function playVideo() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    try {
      setError("");
      if (!video.currentSrc) {
        video.load();
      }
      if (video.ended || video.currentTime >= video.duration) {
        video.currentTime = 0;
      }
      await video.play();
      setIsPlaying(true);
    } catch {
      try {
        video.muted = true;
        await video.play();
        setIsPlaying(true);
        setError("Видео запущено без звука. Включите звук в плеере.");
      } catch {
        setError(
          "Не удалось запустить видео. Обновите страницу и попробуйте снова."
        );
      }
    }
  }

  return (
    <div className="brahman-video">
      <video
        className="brahman-video__media"
        controls={isPlaying}
        onEnded={() => setIsPlaying(false)}
        onError={() => setError("Видео временно недоступно.")}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        playsInline
        poster="/images/brahman.avif"
        preload="auto"
        ref={videoRef}
      >
        <source src="/videos/brahman.webm" type="video/webm" />
        Ваш браузер не поддерживает встроенное видео.
      </video>
      {!isPlaying && (
        <button
          aria-label="Воспроизвести видео"
          className="brahman-video__play"
          onClick={playVideo}
          type="button"
        >
          <span aria-hidden="true" />
        </button>
      )}
      {error && <p className="brahman-video__error">{error}</p>}
    </div>
  );
}
