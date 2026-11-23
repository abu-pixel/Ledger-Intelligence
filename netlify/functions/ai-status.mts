import { GET } from "../../api/ai/status";

export default async function handler() {
  return GET();
}

export const config = {
  path: "/api/ai/status",
};
