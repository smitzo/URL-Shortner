const fallbackApiBaseUrl = "http://localhost:5000";

export const config = {
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? fallbackApiBaseUrl
};
