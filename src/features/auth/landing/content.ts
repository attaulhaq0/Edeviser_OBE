export type AuthLandingLanguage = "en" | "ar";

interface FeatureCopy {
  title: string;
  description: string;
}

interface AuthLandingCopy {
  lang: AuthLandingLanguage;
  dir: "ltr" | "rtl";
  headlineLead: string;
  headlineLearning: string;
  headlineStrong: string;
  headlineOutcomes: string;
  introBefore: string;
  introHighlight: string;
  introAfter: string;
  features: readonly [FeatureCopy, FeatureCopy, FeatureCopy];
  feedbackAlt: string;
  mascotAlt: string;
  footer: string;
  demoTitle: string;
}

export const AUTH_LANDING_COPY: Record<AuthLandingLanguage, AuthLandingCopy> = {
  en: {
    lang: "en",
    dir: "ltr",
    headlineLead: "Smart",
    headlineLearning: "learning.",
    headlineStrong: "Stronger",
    headlineOutcomes: "outcomes.",
    introBefore:
      "E Deviser adapts to every learner, builds consistent habits, and delivers ",
    introHighlight: "measurable outcomes",
    introAfter: " connecting every role in the learning ecosystem.",
    features: [
      {
        title: "Adaptive",
        description: "AI adapts to each learner’s style and pace.",
      },
      {
        title: "Habits",
        description:
          "Build consistency with streaks and daily learning habits.",
      },
      {
        title: "Outcomes",
        description: "Turn progress into measurable outcomes that matter.",
      },
    ],
    feedbackAlt:
      "A continuous feedback loop connecting learners, teachers, parents, coordinators and institutions",
    mascotAlt:
      "Foxi learning at an unbranded laptop with the Edeviser logo on the hoodie",
    footer: "Secure. Private. Built for education.",
    demoTitle: "Local demo login",
  },
  ar: {
    lang: "ar",
    dir: "rtl",
    headlineLead: "تعلّم",
    headlineLearning: "أذكى.",
    headlineStrong: "نتائج",
    headlineOutcomes: "أقوى.",
    introBefore:
      "يتكيّف E Deviser مع كل متعلّم، ويبني عادات تعلّم ثابتة، ويقدّم ",
    introHighlight: "نتائج قابلة للقياس",
    introAfter: "، ويربط كل دور في منظومة التعلّم.",
    features: [
      {
        title: "تكيّف ذكي",
        description: "يتكيّف الذكاء الاصطناعي مع أسلوب كل متعلّم وسرعته.",
      },
      {
        title: "عادات ثابتة",
        description:
          "ابنِ عادات تعلّم مستمرة من خلال الإنجاز اليومي والتذكيرات الذكية.",
      },
      {
        title: "نتائج قابلة للقياس",
        description: "حوّل التقدّم إلى نتائج قابلة للقياس وذات قيمة حقيقية.",
      },
    ],
    feedbackAlt:
      "حلقة تغذية راجعة مستمرة تربط المتعلم والمعلم وولي الأمر والمنسق والمؤسسة",
    mascotAlt: "فوكسي يتعلّم على حاسوب محمول بدون شعار",
    footer: "آمن. خاص. مصمم للتعليم.",
    demoTitle: "دخول تجريبي محلي",
  },
};
