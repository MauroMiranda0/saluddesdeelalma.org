const conditional = process.argv.includes("--if-shared");
const mode = process.env.SHARED_PILOT_BUILD;
if (conditional && mode !== undefined && !["true", "false"].includes(mode)) {
  console.error('SHARED_PILOT_BUILD must be exactly "true" or "false".');
  process.exitCode = 1;
} else if ((!conditional || mode === "true") && process.env.NEXT_PUBLIC_API_BASE_URL !== "/api/v1") {
  console.error(
    'Shared pilot build requires NEXT_PUBLIC_API_BASE_URL exactly "/api/v1".'
  );
  process.exitCode = 1;
}
