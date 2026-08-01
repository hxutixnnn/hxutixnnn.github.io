type AnalyticsDetail = { event?: "app_open" | "app_close"; appId?: string };
type GtagWindow = Window & { dataLayer?: unknown[][]; gtag?: (...args: unknown[]) => void };

const body = document.body;
const measurementId = body.dataset.analyticsId?.trim() ?? "";
const navigatorWithPrivacy = navigator as Navigator & { globalPrivacyControl?: boolean };
const privacySignal =
  navigator.doNotTrack === "1" ||
  navigatorWithPrivacy.globalPrivacyControl === true ||
  window.location.pathname.startsWith("/preview/") ||
  window.location.pathname.startsWith("/do-not-track/");

if (/^G-[A-Z0-9]+$/.test(measurementId) && !privacySignal) {
  const analyticsWindow = window as GtagWindow;
  analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? [];
  analyticsWindow.gtag = (...args: unknown[]) => analyticsWindow.dataLayer?.push(args);
  analyticsWindow.gtag("js", new Date());
  analyticsWindow.gtag("config", measurementId, {
    anonymize_ip: true,
    cookie_expires: 0,
    allow_google_signals: false,
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.append(script);

  window.addEventListener("tien:analytics", (event) => {
    const detail = (event as CustomEvent<AnalyticsDetail>).detail;
    if (!detail?.event || !detail.appId || !/^[a-z0-9-]+$/.test(detail.appId)) return;
    analyticsWindow.gtag?.("event", detail.event, { app_id: detail.appId });
  });
}
