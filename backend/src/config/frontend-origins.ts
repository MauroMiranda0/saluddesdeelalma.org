export const parseFrontendOrigins = (value: string): string[] => {
  const entries = value.split(",").map((origin) => origin.trim());
  if (entries.some((origin) => origin.length === 0)) {
    throw new Error("FRONTEND_ORIGIN must contain comma-separated origins");
  }

  const origins = entries.map((origin) => {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error("FRONTEND_ORIGIN contains an invalid origin");
    }

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.origin !== origin ||
      url.username !== "" ||
      url.password !== "" ||
      url.pathname !== "/" ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      throw new Error("FRONTEND_ORIGIN entries must be plain HTTP(S) origins");
    }

    return url.origin;
  });

  if (new Set(origins).size !== origins.length) {
    throw new Error("FRONTEND_ORIGIN contains duplicate origins");
  }

  return origins;
};
