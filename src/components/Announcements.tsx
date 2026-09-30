import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "../data/social";
import { Reveal } from "./Reveal";

const MEDIA = "/announcements/basvuru-2026";

/** The recruitment carousel exactly as it went out on Instagram: the cover,
 *  then one slide per committee, in the same order as the committee list. */
const SLIDES = ["01-hook", "02-mekanik", "03-elektrik", "04-destek"];

/** Media for the older announcements, index-matched to `news.earlier`. */
const EARLIER_MEDIA = [{ video: `${MEDIA}/story.mp4`, poster: `${MEDIA}/story-poster.webp` }];

const pad = (n: number) => String(n).padStart(2, "0");

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function PostCarousel() {
  const { t } = useLanguage();
  const copy = t.home.news.featured;
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, index));
    track.scrollTo({
      left: clamped * track.clientWidth,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, []);

  // The track is a native scroll-snap strip, so a swipe on a phone and a
  // trackpad flick both work; the index just follows wherever it settles.
  const onScroll = () => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(active + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(active - 1);
    }
  };

  return (
    <div className="news-post">
      <div
        className="news-carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label={copy.carouselLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div className="news-carousel__track" ref={trackRef} onScroll={onScroll}>
          {SLIDES.map((slide, i) => (
            <figure
              className="news-carousel__slide"
              key={slide}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${SLIDES.length}`}
            >
              <img
                src={`${MEDIA}/${slide}.webp`}
                srcSet={`${MEDIA}/${slide}-640.webp 640w, ${MEDIA}/${slide}.webp 1080w`}
                sizes="(max-width: 900px) 92vw, 520px"
                width={1080}
                height={1350}
                alt={copy.slideAlts[i]}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
              />
            </figure>
          ))}
        </div>

        <div className="news-carousel__bar">
          <span className="news-carousel__count" aria-live="polite">
            <b>{pad(active + 1)}</b> / {pad(SLIDES.length)}
          </span>
          <div className="news-carousel__dots" aria-hidden="true">
            {SLIDES.map((slide, i) => (
              <span
                key={slide}
                className={`news-carousel__dot${i === active ? " is-active" : ""}${i < active ? " is-past" : ""}`}
              />
            ))}
          </div>
          <div className="news-carousel__arrows">
            <button
              type="button"
              className="news-carousel__arrow"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              aria-label={copy.prev}
            >
              ←
            </button>
            <button
              type="button"
              className="news-carousel__arrow"
              onClick={() => goTo(active + 1)}
              disabled={active === SLIDES.length - 1}
              aria-label={copy.next}
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div className="news-post__body">
        <div className="news-meta">
          <span className="news-meta__badge">{copy.badge}</span>
          <span className="news-meta__tag">{copy.tag}</span>
          <span className="news-meta__date">{copy.date}</span>
        </div>

        <h3 className="news-post__title">
          {copy.title} <em>{copy.titleAccent}</em>
        </h3>
        <p className="news-post__text">{copy.text}</p>

        {/* Each committee row turns the carousel to its own slide, so the
            list doubles as a table of contents for the post. */}
        <ol className="news-committees">
          {copy.committees.map((committee, i) => (
            <li key={committee.name}>
              <button
                type="button"
                className={`news-committee${active === i + 1 ? " is-active" : ""}`}
                onClick={() => goTo(i + 1)}
              >
                <span className="news-committee__num">{pad(i + 1)}</span>
                <span className="news-committee__main">
                  <span className="news-committee__name">{committee.name}</span>
                  <span className="news-committee__units">{committee.units}</span>
                  <span className="news-committee__note">{committee.note}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="news-post__actions">
          <Link to="/basvurular" className="btn btn--primary">
            {copy.apply}
          </Link>
          <a className="btn btn--ghost" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            {copy.instagram} ↗
          </a>
        </div>
      </div>
    </div>
  );
}

/** Loops muted while on screen and stops once scrolled past, so an
 *  off-screen video never keeps decoding in the background. */
function StoryVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduceMotion] = useState(prefersReducedMotion);

  useEffect(() => {
    const video = ref.current;
    if (!video || reduceMotion) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {
            /* autoplay refused — the poster stays up */
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [reduceMotion]);

  return (
    <video
      ref={ref}
      className="news-item__video"
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      controls={reduceMotion}
      aria-label={label}
    />
  );
}

export function Announcements() {
  const { t } = useLanguage();
  const news = t.home.news;

  return (
    <section className="section news" aria-labelledby="news-label">
      <div className="container">
        <div className="sec-label news__label">
          <span id="news-label">/ {news.label}</span>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="news__handle">
            <span className="news__handle-prefix">{news.instagramAll} · </span>
            <span className="news__handle-name">{INSTAGRAM_HANDLE}</span> ↗
          </a>
        </div>

        <Reveal>
          <PostCarousel />
        </Reveal>

        <Reveal className="news__earlier" stagger=".news-item">
          <p className="news__earlier-label">{news.earlierLabel}</p>
          {news.earlier.map((item, i) => (
            <article className="news-item" key={item.title}>
              <div className="news-item__media">
                <StoryVideo src={EARLIER_MEDIA[i].video} poster={EARLIER_MEDIA[i].poster} label={item.title} />
              </div>
              <div className="news-item__body">
                <div className="news-meta">
                  <span className="news-meta__tag">{item.tag}</span>
                  <span className="news-meta__date">{item.date}</span>
                </div>
                <h3 className="news-item__title">{item.title}</h3>
                <p className="news-item__text">{item.text}</p>
                <a className="link-arrow" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                  Instagram ↗
                </a>
              </div>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
