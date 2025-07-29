import type { NextApiRequest, NextApiResponse } from "next";

type TestResponse = {
  message: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestResponse>
) {
  res.status(200).json({ message: "API is working!" });
} 