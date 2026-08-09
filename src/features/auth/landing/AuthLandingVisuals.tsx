import {
  AUTH_LANDING_COPY,
  type AuthLandingLanguage,
} from "@/features/auth/landing/content";

interface LanguageAwareProps {
  language: AuthLandingLanguage;
}

export const BrandLogo = ({ language }: LanguageAwareProps) => (
  <a
    className="auth-brand-lockup"
    href="/"
    aria-label={language === "ar" ? "الصفحة الرئيسية لإي ديفيسر" : "Edeviser home"}
    data-language={language}
  >
    <span className="auth-brand-mark" aria-hidden="true">
      <img src="/auth/edeviser-logo-mark.png" alt="" />
    </span>
    <span>{language === "ar" ? "إي ديفيسر" : "E DEVISER"}</span>
  </a>
);

export const HeroCopy = ({ language }: LanguageAwareProps) => {
  const copy = AUTH_LANDING_COPY[language];

  return (
    <section className="auth-hero-copy" aria-labelledby="auth-hero-title">
      <h1 id="auth-hero-title">
        <span>
          {copy.headlineLead}{" "}
          <strong className="auth-headline-blue">
            {copy.headlineLearning}
          </strong>
        </span>
        <span>
          {copy.headlineStrong}{" "}
          <strong className="auth-headline-green">
            {copy.headlineOutcomes}
          </strong>
        </span>
      </h1>
      <p className="auth-intro">
        {copy.introBefore}
        <strong>{copy.introHighlight}</strong>
        {copy.introAfter}
      </p>
    </section>
  );
};

export const FeatureTimeline = ({ language }: LanguageAwareProps) => {
  const copy = AUTH_LANDING_COPY[language];
  const source =
    language === "ar"
      ? "/auth/feature-timeline-ar.png"
      : "/auth/feature-timeline-en.png";
  const description = copy.features
    .map((feature) => `${feature.title}: ${feature.description}`)
    .join(" ");

  return (
    <section className="auth-feature-timeline" aria-label={description}>
      <img src={source} alt="" aria-hidden="true" loading="eager" />
    </section>
  );
};

export const FeedbackLoop = ({ language }: LanguageAwareProps) => {
  const copy = AUTH_LANDING_COPY[language];
  const source =
    language === "ar"
      ? "/auth/feedback-loop-ar.png"
      : "/auth/feedback-loop-en.png";

  return (
    <div className="auth-feedback-loop" data-language={language}>
      <img src={source} alt={copy.feedbackAlt} loading="eager" />
    </div>
  );
};

const SceneBrandMark = ({ className }: { className: string }) => (
  <span className={`auth-scene-brand ${className}`} aria-hidden="true">
    <img src="/auth/edeviser-logo-mark.png" alt="" />
  </span>
);

export const MascotScene = ({ language }: LanguageAwareProps) => (
  <div className="auth-mascot-scene">
    <img
      src="/auth/foxi-branded-learning-scene.png"
      alt={AUTH_LANDING_COPY[language].mascotAlt}
      loading="eager"
    />
    {language === "en" ? (
      <SceneBrandMark className="auth-scene-brand-hoodie" />
    ) : null}
  </div>
);
