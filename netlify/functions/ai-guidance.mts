import { POST } from "../../api/ai/accounting-guidance";

export default async function handler(request: Request) {
  return POST(request);
}

export const config = {
  path: "/api/ai/accounting-guidance",
};
