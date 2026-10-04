import type { RequestHandler } from "express";
import { findInvestorSessionFromAuthorization } from "../lib/investor-auth";

export type InvestorSessionContext = {
  id: string;
  userId: string;
};

export const requireInvestorSession: RequestHandler = async (req, res, next) => {
  try {
    const session = await findInvestorSessionFromAuthorization(req.header("authorization"));
    if (!session) {
      res.status(401).json({ message: "Sign in to manage account settings." });
      return;
    }
    res.locals.investorSession = session satisfies InvestorSessionContext;
    next();
  } catch {
    res.status(500).json({ message: "The investor session could not be verified." });
  }
};