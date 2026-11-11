import { api, type AnalyticsEventName, type AnalyticsEventProps } from "../api/client";

/** Call it only after the action succeeded. If saving the event fails, the user never notices. */
export function track<E extends AnalyticsEventName>(event: E, props: AnalyticsEventProps[E]) {
  if (import.meta.env.DEV && import.meta.env.MODE !== "test") console.log("[evento]", event, props);
  api.trackEvent(event, props).catch(() => {});
}
