"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { SupportCta } from "@/components/support-cta";

type HomeHeroProps = {
  copy: {
    eyebrow: string;
    lead: string;
    primaryCta: string;
    secondaryCta: string;
    title: string;
  };
  supportButtonLabel?: string | null;
  supportEnabled?: boolean;
  supportUrl?: string | null;
  trust: {
    items: Array<{ text: string; title: string }>;
    title: string;
  };
};

type Spark = {
  delay: number;
  drift: number;
  duration: number;
  left: number;
  rise: number;
  size: number;
};

const sparkCount = 18;

/**
 * Видеофон героя. Пока файл грузится, виден обычный фон с огнями костра;
 * когда видео готово играть, оно проявляется, а огни гаснут — переход плавный.
 * Если файла нет или он не проигрывается, всё остаётся как было.
 */
function HeroVideo({ onReady }: { onReady: (ready: boolean) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    function handleReady() {
      setReady(true);
      onReady(true);
    }

    function handleError() {
      setReady(false);
      onReady(false);
    }

    if (video.readyState >= 3) {
      handleReady();
    }

    video.addEventListener("canplay", handleReady);
    video.addEventListener("error", handleError);

    // За кадром видео не проигрываем: экономим батарею на телефонах.
    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver((entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                void video.play().catch(() => undefined);
              } else {
                video.pause();
              }
            }
          })
        : null;

    observer?.observe(video);

    return () => {
      video.removeEventListener("canplay", handleReady);
      video.removeEventListener("error", handleError);
      observer?.disconnect();
    };
  }, [onReady]);

  return (
    <div
      aria-hidden="true"
      className={ready ? "hero__video is-ready" : "hero__video"}
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        ref={videoRef}
        tabIndex={-1}
      >
        <source src="/videos/hero.webm" type="video/webm" />
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>
      <span className="hero__video-shade" />
    </div>
  );
}

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12
    }
  }
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.55,
      ease: "easeOut"
    },
    y: 0
  }
};

const reducedItemVariants: Variants = {
  hidden: {
    opacity: 1,
    y: 0
  },
  visible: {
    opacity: 1,
    y: 0
  }
};

export function HomeHero({
  copy,
  supportButtonLabel,
  supportEnabled,
  supportUrl,
  trust
}: HomeHeroProps) {
  const shouldReduceMotion = useReducedMotion();
  const sparks = useMemo<Spark[]>(
    () =>
      Array.from({ length: sparkCount }, (_, index) => ({
        delay: (index % 6) * 0.38,
        drift: (index % 2 === 0 ? 1 : -1) * (18 + ((index * 17) % 46)),
        duration: 4.2 + ((index * 13) % 31) / 10,
        left: 5 + ((index * 53) % 90),
        rise: 155 + ((index * 29) % 120),
        size: 3 + ((index * 7) % 8)
      })),
    []
  );
  const contentVariants = shouldReduceMotion
    ? reducedItemVariants
    : itemVariants;
  const [videoReady, setVideoReady] = useState(false);

  return (
    <section
      className={
        videoReady ? "hero hero--ritual has-video-ready" : "hero hero--ritual"
      }
      id="top"
    >
      {!shouldReduceMotion && <HeroVideo onReady={setVideoReady} />}
      <div className="hero__effects" aria-hidden="true">
        {!shouldReduceMotion &&
          sparks.map((spark, index) => (
            <motion.div
              animate={{
                opacity: [0, 0.85, 0.55, 0],
                x: [0, spark.drift * 0.35, spark.drift],
                y: [0, -spark.rise]
              }}
              className="hero__spark"
              key={index}
              style={{
                height: spark.size,
                left: `${spark.left}%`,
                width: spark.size
              }}
              transition={{
                delay: spark.delay,
                duration: spark.duration,
                ease: "easeInOut",
                repeat: Infinity
              }}
            />
          ))}
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  opacity: [0.6, 0.9, 0.6],
                  scale: [1, 1.05, 1]
                }
          }
          className="hero__fire-glow"
          transition={{
            duration: 3,
            ease: "easeInOut",
            repeat: Infinity
          }}
        />
      </div>

      <motion.div
        animate="visible"
        className="container hero__grid"
        initial="hidden"
        variants={shouldReduceMotion ? undefined : containerVariants}
      >
        <motion.div
          className="hero__content"
          variants={shouldReduceMotion ? undefined : containerVariants}
        >
          <motion.p className="eyebrow" variants={contentVariants}>
            {copy.eyebrow}
          </motion.p>
          <motion.h1 variants={contentVariants}>{copy.title}</motion.h1>
          {copy.lead && (
            <motion.p className="hero__lead" variants={contentVariants}>
              {copy.lead}
            </motion.p>
          )}
          <motion.div className="hero__actions" variants={contentVariants}>
            <motion.a
              className="button button--primary hero__primary-cta"
              href="#signup"
              transition={
                shouldReduceMotion
                  ? undefined
                  : {
                      duration: 1.15,
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatType: "mirror"
                    }
              }
              whileHover={
                shouldReduceMotion
                  ? undefined
                  : {
                      boxShadow: [
                        "0 14px 32px rgba(255, 215, 0, 0.28)",
                        "0 0 22px rgba(255, 215, 0, 0.62), 0 0 54px rgba(255, 166, 0, 0.36)",
                        "0 14px 32px rgba(255, 215, 0, 0.28)"
                      ],
                      y: -2
                    }
              }
            >
              {copy.primaryCta}
            </motion.a>
            <a className="button hero__secondary-cta" href="#schedule">
              {copy.secondaryCta}
            </a>
            <SupportCta
              className="support-cta--inline"
              supportButtonLabel={supportButtonLabel}
              supportEnabled={supportEnabled}
              supportUrl={supportUrl}
            />
          </motion.div>
        </motion.div>

        <motion.aside
          aria-labelledby="trust-title"
          className="trust-card hero__trust-card"
          variants={contentVariants}
        >
          <h2 id="trust-title">{trust.title}</h2>
          <ul className="trust-list">
            {trust.items.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </motion.aside>
      </motion.div>
    </section>
  );
}
