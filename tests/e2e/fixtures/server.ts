import { createHash } from "node:crypto";

export const fixturePort =
  process.env.TIENOS_E2E_FIXTURE_PORT ??
  String(
    40_000 +
      (Number.parseInt(createHash("sha256").update(`${process.cwd()}:fixtures`).digest("hex").slice(0, 6), 16) %
        20_000),
  );

export const fixtureBaseURL = `http://127.0.0.1:${fixturePort}`;
