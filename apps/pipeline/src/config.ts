import { resolve } from "node:path";
import { DATA_DIR } from "@bible/config";

export { ROOT, DATA_DIR, DB_PATH, loadEnv } from "@bible/config";

export const RAW_DIR = resolve(DATA_DIR, "raw");
export const WORK_DIR = resolve(DATA_DIR, "work");
export const PUBLISH_DIR = resolve(DATA_DIR, "published");

/** Primary translation used for reels/quizzes. WEB is more readable for the target audience. */
export const PRIMARY_TRANSLATION = process.env.PRIMARY_TRANSLATION ?? "WEB";
