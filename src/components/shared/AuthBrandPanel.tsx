import { useTranslation } from "react-i18next";

const AuthBrandPanel = () => {
  const { i18n } = useTranslation();
  const activeLanguage = (i18n.resolvedLanguage ?? i18n.language).split("-")[0];
  const artworkSrc =
    activeLanguage === "ar"
      ? "/auth-assets/auth-left-panel-ar.png"
      : "/auth-assets/auth-left-panel.png";

  return (
    <aside
      className="auth-brand-panel relative hidden overflow-hidden bg-[#030f26] lg:block"
      aria-hidden="true"
    >
      <img
        key={artworkSrc}
        src={artworkSrc}
        alt=""
        className="block h-full w-full object-fill"
        loading="eager"
        decoding="async"
      />
    </aside>
  );
};

export default AuthBrandPanel;
