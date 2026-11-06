if (process.env.NEXT_PUBLIC_API_BASE_URL !== "/api/v1") {
  console.error(
    'Shared pilot build requires NEXT_PUBLIC_API_BASE_URL exactly "/api/v1".'
  );
  process.exitCode = 1;
}
